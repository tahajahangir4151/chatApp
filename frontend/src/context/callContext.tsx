import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useToast } from "@chakra-ui/react";
import { useChatState } from "./chatProvider";
import { getSocket } from "../config/socket";
import {
  startOutgoingRingtone,
  startIncomingRingtone,
  stopRingtone,
  playCallConnectedSound,
  playCallEndedSound,
  playCallBusySound,
} from "../utils/callAudio";

export type CallState = "idle" | "calling" | "incoming" | "connected" | "ended";
export type CallType = "voice" | "video";

export interface CallUser {
  _id: string;
  name?: string;
  pic?: string;
  email?: string;
}

export interface GroupParticipant {
  socketId: string;
  user: CallUser;
  isMuted?: boolean;
}

export interface ActiveGroupCallData {
  callId: string;
  chatId: string;
  chatName: string;
  initiator: CallUser;
  participants: GroupParticipant[];
  startedAt: string;
}

export interface IncomingGroupCallData {
  chatId: string;
  chatName: string;
  initiator: CallUser;
  callId: string;
  participantsCount: number;
}

export interface CallContextType {
  // Direct (1-on-1) call state & methods
  callState: CallState;
  callType: CallType;
  callId: string | null;
  otherUser: CallUser | null;
  isMuted: boolean;
  isSpeakerOn: boolean;
  callDuration: number;
  statusMessage: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
  isVideoEnabled: boolean;
  toggleVideo: () => void;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  startCall: (targetUser: CallUser, type?: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;

  // Group call state & methods
  isInGroupCall: boolean;
  activeGroupCall: ActiveGroupCallData | null;
  groupCallDuration: number;
  groupParticipants: GroupParticipant[];
  isGroupMuted: boolean;
  incomingGroupCall: IncomingGroupCallData | null;
  activeGroupCallsByChat: Record<string, { callId: string; participantsCount: number }>;
  startGroupCall: (chat: any) => Promise<void>;
  joinGroupCall: (chatId: string) => Promise<void>;
  leaveGroupCall: () => void;
  dismissIncomingGroupCall: () => void;
  toggleGroupMute: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};

export const CallProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useChatState();
  const loggedUser = user?.data || user;
  const toast = useToast();

  // 1-on-1 Direct Call state
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("voice");
  const [callId, setCallId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<CallUser | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Group Call state
  const [isInGroupCall, setIsInGroupCall] = useState(false);
  const [activeGroupCall, setActiveGroupCall] = useState<ActiveGroupCallData | null>(null);
  const [groupCallDuration, setGroupCallDuration] = useState(0);
  const [groupParticipants, setGroupParticipants] = useState<GroupParticipant[]>([]);
  const [isGroupMuted, setIsGroupMuted] = useState(false);
  const [incomingGroupCall, setIncomingGroupCall] = useState<IncomingGroupCallData | null>(null);
  const [activeGroupCallsByChat, setActiveGroupCallsByChat] = useState<
    Record<string, { callId: string; participantsCount: number }>
  >({});

  // Direct Call refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const activeCallIdRef = useRef<string | null>(null);
  const activeTargetIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");

  const durationTimerRef = useRef<any>(null);
  const ringingTimeoutRef = useRef<any>(null);

  // Group Call refs
  const groupPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const groupAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const groupLocalStreamRef = useRef<MediaStream | null>(null);
  const groupPendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const groupTimerRef = useRef<any>(null);
  const activeGroupChatIdRef = useRef<string | null>(null);
  const isInGroupCallRef = useRef<boolean>(false);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    isInGroupCallRef.current = isInGroupCall;
  }, [isInGroupCall]);

  // Clean up direct 1-on-1 call media tracks and WebRTC peer connection
  const cleanupMediaAndPeer = useCallback(() => {
    stopRingtone();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);

    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.srcObject = null;
      } catch (e) {}
    }
    if (localVideoRef.current) {
      try {
        localVideoRef.current.srcObject = null;
      } catch (e) {}
    }
    if (remoteVideoRef.current) {
      try {
        remoteVideoRef.current.srcObject = null;
      } catch (e) {}
    }
    setIsVideoEnabled(true);
    remoteStreamRef.current = null;
    setRemoteStream(null);

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }

    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;
    setIsMuted(false);
  }, []);

  const resetToIdleAfterDelay = useCallback(
    (delayMs = 1500) => {
      setTimeout(() => {
        cleanupMediaAndPeer();
        setCallState("idle");
        setCallId(null);
        setOtherUser(null);
        setCallDuration(0);
        setStatusMessage("");
        activeCallIdRef.current = null;
        activeTargetIdRef.current = null;
      }, delayMs);
    },
    [cleanupMediaAndPeer]
  );

  // Clean up group call
  const cleanupGroupCallMediaAndPeers = useCallback(() => {
    if (groupTimerRef.current) {
      clearInterval(groupTimerRef.current);
      groupTimerRef.current = null;
    }

    if (groupLocalStreamRef.current) {
      groupLocalStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      groupLocalStreamRef.current = null;
    }

    // Close all peer connections
    groupPeersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (e) {}
    });
    groupPeersRef.current.clear();

    // Remove all remote audio elements
    groupAudioElementsRef.current.forEach((audio) => {
      try {
        audio.srcObject = null;
        audio.pause();
        audio.remove();
      } catch (e) {}
    });
    groupAudioElementsRef.current.clear();
    groupPendingCandidatesRef.current.clear();

    activeGroupChatIdRef.current = null;
    setIsInGroupCall(false);
    setActiveGroupCall(null);
    setGroupParticipants([]);
    setGroupCallDuration(0);
    setIsGroupMuted(false);
  }, []);

  // Setup Peer Connection for direct 1-on-1 call
  const createPeerConnection = useCallback(
    (targetUserId: string, currentCallId: string): RTCPeerConnection => {
      const socket = getSocket(loggedUser);
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", {
            to: targetUserId,
            candidate: event.candidate,
            callId: currentCallId,
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        remoteStreamRef.current = stream;
        setRemoteStream(stream);

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current
            .play()
            .catch((e) => console.log("Remote video autoPlay:", e));
        }

        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current
            .play()
            .catch((e) => console.log("Remote audio autoPlay waiting for user gesture:", e));
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          if (callStateRef.current === "connected") {
            setStatusMessage("Call Ended");
            setCallState("ended");
            playCallEndedSound();
            resetToIdleAfterDelay(1500);
          }
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [loggedUser, resetToIdleAfterDelay]
  );

  // Start outgoing 1-on-1 direct call
  const startCall = useCallback(
    async (targetUser: CallUser, type: CallType = "voice") => {
      if (!loggedUser?._id) {
        toast({
          title: "Please log in to make a call",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        return;
      }

      if (isInGroupCallRef.current) {
        toast({
          title: "Group Call in Progress",
          description: "Please leave your current group call before starting a direct call.",
          status: "warning",
          duration: 3500,
          isClosable: true,
          position: "top",
        });
        return;
      }

      if (!targetUser?._id) {
        toast({
          title: "Invalid recipient",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        return;
      }

      const generatedCallId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      activeCallIdRef.current = generatedCallId;
      activeTargetIdRef.current = targetUser._id;

      setCallId(generatedCallId);
      setOtherUser(targetUser);
      setCallType(type);
      setCallState("calling");
      setStatusMessage("Calling...");
      setCallDuration(0);

      const isVideo = type === "video";
      setIsVideoEnabled(isVideo);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : false,
        });

        localStreamRef.current = stream;
        setLocalStream(stream);

        if (isVideo && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = createPeerConnection(targetUser._id, generatedCallId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const socket = getSocket(loggedUser);
        socket.emit("call:user", {
          to: targetUser._id,
          caller: {
            _id: loggedUser._id,
            name: loggedUser.name,
            pic: loggedUser.pic,
            email: loggedUser.email,
          },
          callType: type,
          offer,
          callId: generatedCallId,
        });

        startOutgoingRingtone();
        setStatusMessage("Ringing...");

        ringingTimeoutRef.current = setTimeout(() => {
          if (callStateRef.current === "calling") {
            stopRingtone();
            socket.emit("call:end", {
              to: targetUser._id,
              reason: "no-answer",
              callId: generatedCallId,
            });
            setStatusMessage("No Answer");
            setCallState("ended");
            playCallEndedSound();
            resetToIdleAfterDelay(2000);
          }
        }, 40000);
      } catch (err: any) {
        console.error("Failed to start call:", err);
        stopRingtone();
        cleanupMediaAndPeer();
        setCallState("idle");
        activeCallIdRef.current = null;
        activeTargetIdRef.current = null;

        const isPermissionDenied =
          err?.name === "NotAllowedError" ||
          err?.name === "PermissionDeniedError" ||
          err?.message?.includes("Permission denied");

        toast({
          title: isPermissionDenied
            ? "Microphone Access Denied"
            : "Call Failed",
          description: isPermissionDenied
            ? "Please allow microphone access in your browser settings to make voice calls."
            : err?.message || "Could not establish media connection.",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      }
    },
    [loggedUser, toast, createPeerConnection, cleanupMediaAndPeer, resetToIdleAfterDelay]
  );

  // Accept incoming direct 1-on-1 call
  const acceptCall = useCallback(async () => {
    stopRingtone();
    const currentCallId = activeCallIdRef.current;
    const targetUserId = activeTargetIdRef.current;
    const offer = pendingOfferRef.current;

    if (!currentCallId || !targetUserId || !offer) {
      setCallState("idle");
      return;
    }

    const isVideo = callType === "video";
    setIsVideoEnabled(isVideo);

    try {
      setStatusMessage("Connecting...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
          : false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      if (isVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection(targetUserId, currentCallId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("Error adding queued ICE candidate:", e);
          }
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket(loggedUser);
      socket.emit("call:answer", {
        to: targetUserId,
        answer,
        callId: currentCallId,
      });

      setCallState("connected");
      setStatusMessage("Connected");
      playCallConnectedSound();

      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Failed to accept call:", err);
      rejectCall("error");

      toast({
        title: "Microphone Access Required",
        description:
          "Unable to access your microphone. Please enable permissions and try again.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  }, [loggedUser, createPeerConnection, toast]);

  // Reject incoming direct 1-on-1 call
  const rejectCall = useCallback(
    (reason = "declined") => {
      stopRingtone();
      const currentCallId = activeCallIdRef.current;
      const targetUserId = activeTargetIdRef.current;

      if (currentCallId && targetUserId) {
        const socket = getSocket(loggedUser);
        socket.emit("call:reject", {
          to: targetUserId,
          reason,
          callId: currentCallId,
        });
      }

      cleanupMediaAndPeer();
      setCallState("idle");
      setCallId(null);
      setOtherUser(null);
      setStatusMessage("");
      activeCallIdRef.current = null;
      activeTargetIdRef.current = null;
    },
    [loggedUser, cleanupMediaAndPeer]
  );

  // End active or outgoing direct 1-on-1 call
  const endCall = useCallback(() => {
    stopRingtone();
    const currentCallId = activeCallIdRef.current;
    const targetUserId = activeTargetIdRef.current;

    if (currentCallId && targetUserId) {
      const socket = getSocket(loggedUser);
      socket.emit("call:end", {
        to: targetUserId,
        reason: "ended",
        callId: currentCallId,
      });
    }

    playCallEndedSound();
    setStatusMessage("Call Ended");
    setCallState("ended");
    resetToIdleAfterDelay(1200);
  }, [loggedUser, resetToIdleAfterDelay]);

  // Toggle mute for direct call
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newMutedState = !isMuted;
      audioTracks.forEach((track) => {
        track.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
    }
  }, [isMuted]);

  // Toggle video (camera feed) for direct call
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const newVideoState = !isVideoEnabled;
      videoTracks.forEach((track) => {
        track.enabled = newVideoState;
      });
      setIsVideoEnabled(newVideoState);
    }
  }, [isVideoEnabled]);

  // Toggle speaker for direct call
  const toggleSpeaker = useCallback(() => {
    const newSpeaker = !isSpeakerOn;
    setIsSpeakerOn(newSpeaker);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !newSpeaker;
    }
    // Also toggle all group audio elements if in group call
    groupAudioElementsRef.current.forEach((audio) => {
      audio.muted = !newSpeaker;
    });
  }, [isSpeakerOn]);

  // Attach remote audio element for group call
  const attachRemoteGroupAudio = useCallback((remoteSocketId: string, stream: MediaStream) => {
    let audio = groupAudioElementsRef.current.get(remoteSocketId);
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      document.body.appendChild(audio);
      groupAudioElementsRef.current.set(remoteSocketId, audio);
    }
    audio.srcObject = stream;
    audio.play().catch((e) => console.log("Remote group audio autoplay:", e));
  }, []);

  // Initiate a WebRTC peer connection to an existing participant in group call
  const initiateGroupPeerConnection = useCallback(
    async (remoteSocketId: string, currentCallId: string, stream: MediaStream) => {
      const socket = getSocket(loggedUser);
      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        attachRemoteGroupAudio(remoteSocketId, remoteStream);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("group-call:signal", {
            toSocketId: remoteSocketId,
            signal: event.candidate,
            type: "candidate",
            callId: currentCallId,
          });
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("group-call:signal", {
          toSocketId: remoteSocketId,
          signal: offer,
          type: "offer",
          callId: currentCallId,
        });

        groupPeersRef.current.set(remoteSocketId, pc);
      } catch (e) {
        console.error(`Failed to create offer for peer ${remoteSocketId}:`, e);
      }
    },
    [loggedUser, attachRemoteGroupAudio]
  );

  // Start a new group audio call
  const startGroupCall = useCallback(
    async (chat: any) => {
      if (!loggedUser?._id) {
        toast({
          title: "Please log in to start a group call",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        return;
      }

      if (callStateRef.current !== "idle") {
        toast({
          title: "Direct Call in Progress",
          description: "Please hang up your 1-on-1 call before starting a group call.",
          status: "warning",
          duration: 3500,
          isClosable: true,
          position: "top",
        });
        return;
      }

      if (!chat?._id) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        groupLocalStreamRef.current = stream;
        activeGroupChatIdRef.current = chat._id;
        setIsInGroupCall(true);
        setIsGroupMuted(false);
        setGroupCallDuration(0);

        const socket = getSocket(loggedUser);
        socket.emit("group-call:start", {
          chatId: chat._id,
          chatName: chat.chatName,
          initiator: {
            _id: loggedUser._id,
            name: loggedUser.name,
            pic: loggedUser.pic,
            email: loggedUser.email,
          },
          users: chat.users,
        });

        playCallConnectedSound();

        // Start duration timer
        groupTimerRef.current = setInterval(() => {
          setGroupCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (err: any) {
        console.error("Failed to start group call:", err);
        cleanupGroupCallMediaAndPeers();

        toast({
          title: "Microphone Access Denied",
          description: "Microphone permission is required to join group calls.",
          status: "error",
          duration: 4000,
          isClosable: true,
          position: "top",
        });
      }
    },
    [loggedUser, toast, cleanupGroupCallMediaAndPeers]
  );

  // Join an existing group audio call
  const joinGroupCall = useCallback(
    async (chatId: string) => {
      if (!loggedUser?._id) {
        toast({
          title: "Please log in to join",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        return;
      }

      if (callStateRef.current !== "idle") {
        toast({
          title: "Call in Progress",
          description: "Please end your current call before joining a group call.",
          status: "warning",
          duration: 3500,
          isClosable: true,
          position: "top",
        });
        return;
      }

      try {
        stopRingtone();
        setIncomingGroupCall(null);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        groupLocalStreamRef.current = stream;
        activeGroupChatIdRef.current = chatId;
        setIsInGroupCall(true);
        setIsGroupMuted(false);
        setGroupCallDuration(0);

        const socket = getSocket(loggedUser);
        socket.emit("group-call:join", {
          chatId,
          user: {
            _id: loggedUser._id,
            name: loggedUser.name,
            pic: loggedUser.pic,
            email: loggedUser.email,
          },
        });

        playCallConnectedSound();

        groupTimerRef.current = setInterval(() => {
          setGroupCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (err: any) {
        console.error("Failed to join group call:", err);
        cleanupGroupCallMediaAndPeers();

        toast({
          title: "Microphone Access Denied",
          description: "Could not access microphone to join group call.",
          status: "error",
          duration: 4000,
          isClosable: true,
          position: "top",
        });
      }
    },
    [loggedUser, toast, cleanupGroupCallMediaAndPeers]
  );

  // Leave active group call
  const leaveGroupCall = useCallback(() => {
    const currentChatId = activeGroupChatIdRef.current;
    if (currentChatId) {
      const socket = getSocket(loggedUser);
      socket.emit("group-call:leave", { chatId: currentChatId });
    }

    playCallEndedSound();
    cleanupGroupCallMediaAndPeers();
  }, [loggedUser, cleanupGroupCallMediaAndPeers]);

  // Dismiss incoming group call notification
  const dismissIncomingGroupCall = useCallback(() => {
    stopRingtone();
    setIncomingGroupCall(null);
  }, []);

  // Toggle mute for group call
  const toggleGroupMute = useCallback(() => {
    if (groupLocalStreamRef.current) {
      const audioTracks = groupLocalStreamRef.current.getAudioTracks();
      const newMutedState = !isGroupMuted;
      audioTracks.forEach((track) => {
        track.enabled = !newMutedState;
      });
      setIsGroupMuted(newMutedState);

      const currentChatId = activeGroupChatIdRef.current;
      if (currentChatId) {
        const socket = getSocket(loggedUser);
        socket.emit("group-call:mute-toggle", {
          chatId: currentChatId,
          isMuted: newMutedState,
        });
      }

      // Update local state in groupParticipants
      setGroupParticipants((prev) =>
        prev.map((p) =>
          p.user._id === loggedUser?._id ? { ...p, isMuted: newMutedState } : p
        )
      );
    }
  }, [isGroupMuted, loggedUser]);

  // Main Socket event listeners
  useEffect(() => {
    if (!loggedUser?._id) return;

    const socket = getSocket(loggedUser);

    // --- Direct 1-on-1 Call Socket Handlers ---
    const handleIncomingCall = (data: {
      caller: CallUser;
      callType: CallType;
      offer: RTCSessionDescriptionInit;
      callId: string;
    }) => {
      if (callStateRef.current !== "idle" || isInGroupCallRef.current) {
        socket.emit("call:reject", {
          to: data.caller._id,
          reason: "busy",
          callId: data.callId,
        });
        return;
      }

      activeCallIdRef.current = data.callId;
      activeTargetIdRef.current = data.caller._id;
      pendingOfferRef.current = data.offer;
      pendingCandidatesRef.current = [];

      setCallId(data.callId);
      setOtherUser(data.caller);
      setCallType(data.callType || "voice");
      setCallState("incoming");
      setStatusMessage("Incoming call...");
      startIncomingRingtone();
    };

    const handleCallAccepted = async (data: {
      answer: RTCSessionDescriptionInit;
      callId: string;
    }) => {
      if (
        callStateRef.current !== "calling" ||
        activeCallIdRef.current !== data.callId
      ) {
        return;
      }

      stopRingtone();
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = null;
      }

      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.warn("Error adding queued ICE candidate:", e);
              }
            }
          }
        } catch (err) {
          console.error("Failed to set remote description on answer:", err);
        }
      }

      setCallState("connected");
      setStatusMessage("Connected");
      playCallConnectedSound();

      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    };

    const handleIceCandidate = async (data: {
      candidate: RTCIceCandidateInit;
      callId: string;
    }) => {
      if (activeCallIdRef.current !== data.callId) return;

      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn("Failed to add received ICE candidate:", e);
        }
      } else {
        pendingCandidatesRef.current.push(data.candidate);
      }
    };

    const handleCallRejected = (data: {
      reason?: string;
      callId: string;
    }) => {
      if (activeCallIdRef.current !== data.callId) return;

      stopRingtone();
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = null;
      }

      const isBusy = data.reason === "busy";
      if (isBusy) {
        playCallBusySound();
        setStatusMessage("User is busy");
      } else {
        playCallEndedSound();
        setStatusMessage("Call Declined");
      }

      setCallState("ended");
      resetToIdleAfterDelay(1800);
    };

    const handleCallEnded = (data: {
      reason?: string;
      callId: string;
    }) => {
      if (activeCallIdRef.current !== data.callId) return;

      stopRingtone();
      playCallEndedSound();
      setStatusMessage(data.reason === "no-answer" ? "No Answer" : "Call Ended");
      setCallState("ended");
      resetToIdleAfterDelay(1400);
    };

    // --- Group Call Socket Handlers ---
    const handleGroupCallJoined = async (data: {
      call: ActiveGroupCallData;
      existingParticipants: GroupParticipant[];
    }) => {
      setActiveGroupCall(data.call);
      setGroupParticipants(data.call.participants || []);

      const localStream = groupLocalStreamRef.current;
      if (!localStream) return;

      // Initiate WebRTC connection to each existing participant in call
      if (Array.isArray(data.existingParticipants)) {
        for (const p of data.existingParticipants) {
          if (p.socketId && p.socketId !== socket.id) {
            await initiateGroupPeerConnection(p.socketId, data.call.callId, localStream);
          }
        }
      }
    };

    const handleGroupCallUserJoined = (data: {
      participant: GroupParticipant;
      callId: string;
    }) => {
      setGroupParticipants((prev) => {
        const exists = prev.some((p) => p.socketId === data.participant.socketId);
        return exists ? prev : [...prev, data.participant];
      });

      setActiveGroupCall((prev) => {
        if (!prev) return null;
        const exists = prev.participants?.some(
          (p) => p.socketId === data.participant.socketId
        );
        if (exists) return prev;
        return {
          ...prev,
          participants: [...(prev.participants || []), data.participant],
        };
      });
    };

    const handleGroupCallSignal = async (data: {
      fromSocketId: string;
      signal: any;
      type: "offer" | "answer" | "candidate";
      callId: string;
    }) => {
      const fromSocketId = data.fromSocketId;
      if (!fromSocketId) return;

      if (data.type === "offer") {
        const localStream = groupLocalStreamRef.current;
        const pc = new RTCPeerConnection(ICE_SERVERS);

        if (localStream) {
          localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
        }

        pc.ontrack = (event) => {
          const remoteStream = event.streams[0] || new MediaStream([event.track]);
          attachRemoteGroupAudio(fromSocketId, remoteStream);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("group-call:signal", {
              toSocketId: fromSocketId,
              signal: event.candidate,
              type: "candidate",
              callId: data.callId,
            });
          }
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal));

          // Flush queued candidates
          const queued = groupPendingCandidatesRef.current.get(fromSocketId) || [];
          while (queued.length > 0) {
            const cand = queued.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("group-call:signal", {
            toSocketId: fromSocketId,
            signal: answer,
            type: "answer",
            callId: data.callId,
          });

          groupPeersRef.current.set(fromSocketId, pc);
        } catch (err) {
          console.error(`Error handling offer from peer ${fromSocketId}:`, err);
        }
      } else if (data.type === "answer") {
        const pc = groupPeersRef.current.get(fromSocketId);
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
            const queued = groupPendingCandidatesRef.current.get(fromSocketId) || [];
            while (queued.length > 0) {
              const cand = queued.shift();
              if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          } catch (err) {
            console.error(`Error handling answer from peer ${fromSocketId}:`, err);
          }
        }
      } else if (data.type === "candidate") {
        const pc = groupPeersRef.current.get(fromSocketId);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.signal));
          } catch (err) {
            console.warn(`Error adding group candidate from peer ${fromSocketId}:`, err);
          }
        } else {
          if (!groupPendingCandidatesRef.current.has(fromSocketId)) {
            groupPendingCandidatesRef.current.set(fromSocketId, []);
          }
          groupPendingCandidatesRef.current.get(fromSocketId)!.push(data.signal);
        }
      }
    };

    const handleGroupCallUserLeft = (data: { socketId: string }) => {
      const pc = groupPeersRef.current.get(data.socketId);
      if (pc) {
        try {
          pc.close();
        } catch (e) {}
        groupPeersRef.current.delete(data.socketId);
      }

      const audio = groupAudioElementsRef.current.get(data.socketId);
      if (audio) {
        try {
          audio.srcObject = null;
          audio.remove();
        } catch (e) {}
        groupAudioElementsRef.current.delete(data.socketId);
      }

      setGroupParticipants((prev) => prev.filter((p) => p.socketId !== data.socketId));
      setActiveGroupCall((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          participants: (prev.participants || []).filter((p) => p.socketId !== data.socketId),
        };
      });
    };

    const handleGroupParticipantMute = (data: {
      socketId: string;
      userId: string;
      isMuted: boolean;
    }) => {
      setGroupParticipants((prev) =>
        prev.map((p) =>
          p.socketId === data.socketId ? { ...p, isMuted: data.isMuted } : p
        )
      );
    };

    const handleGroupCallIncoming = (data: IncomingGroupCallData) => {
      if (callStateRef.current === "idle" && !isInGroupCallRef.current) {
        setIncomingGroupCall(data);
        startIncomingRingtone();
      }
    };

    const handleGroupCallStatusUpdate = (data: {
      chatId: string;
      call: ActiveGroupCallData | null;
    }) => {
      setActiveGroupCallsByChat((prev) => {
        if (!data.call) {
          const next = { ...prev };
          delete next[data.chatId];
          return next;
        }
        return {
          ...prev,
          [data.chatId]: {
            callId: data.call.callId,
            participantsCount: data.call.participants?.length || 0,
          },
        };
      });

      if (activeGroupChatIdRef.current === data.chatId && data.call) {
        setActiveGroupCall(data.call);
        setGroupParticipants(data.call.participants || []);
      }
    };

    const handleGroupCallEnded = (data: { chatId: string }) => {
      setActiveGroupCallsByChat((prev) => {
        const next = { ...prev };
        delete next[data.chatId];
        return next;
      });

      if (incomingGroupCall?.chatId === data.chatId) {
        stopRingtone();
        setIncomingGroupCall(null);
      }

      if (activeGroupChatIdRef.current === data.chatId) {
        playCallEndedSound();
        cleanupGroupCallMediaAndPeers();
        toast({
          title: "Group Call Ended",
          description: "All participants have left the group voice call.",
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
      }
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);

    socket.on("group-call:joined", handleGroupCallJoined);
    socket.on("group-call:user-joined", handleGroupCallUserJoined);
    socket.on("group-call:signal", handleGroupCallSignal);
    socket.on("group-call:user-left", handleGroupCallUserLeft);
    socket.on("group-call:participant-mute", handleGroupParticipantMute);
    socket.on("group-call:incoming", handleGroupCallIncoming);
    socket.on("group-call:status-update", handleGroupCallStatusUpdate);
    socket.on("group-call:ended", handleGroupCallEnded);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:ended", handleCallEnded);

      socket.off("group-call:joined", handleGroupCallJoined);
      socket.off("group-call:user-joined", handleGroupCallUserJoined);
      socket.off("group-call:signal", handleGroupCallSignal);
      socket.off("group-call:user-left", handleGroupCallUserLeft);
      socket.off("group-call:participant-mute", handleGroupParticipantMute);
      socket.off("group-call:incoming", handleGroupCallIncoming);
      socket.off("group-call:status-update", handleGroupCallStatusUpdate);
      socket.off("group-call:ended", handleGroupCallEnded);
    };
  }, [
    loggedUser,
    resetToIdleAfterDelay,
    initiateGroupPeerConnection,
    attachRemoteGroupAudio,
    cleanupGroupCallMediaAndPeers,
    incomingGroupCall,
    toast,
  ]);

  // Cleanup all media and sockets on unmount
  useEffect(() => {
    return () => {
      cleanupMediaAndPeer();
      cleanupGroupCallMediaAndPeers();
    };
  }, [cleanupMediaAndPeer, cleanupGroupCallMediaAndPeers]);

  return (
    <CallContext.Provider
      value={{
        // Direct Call
        callState,
        callType,
        callId,
        otherUser,
        isMuted,
        isSpeakerOn,
        callDuration,
        statusMessage,
        localStream,
        remoteStream,
        remoteAudioRef,
        isVideoEnabled,
        toggleVideo,
        localVideoRef,
        remoteVideoRef,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleSpeaker,

        // Group Call
        isInGroupCall,
        activeGroupCall,
        groupCallDuration,
        groupParticipants,
        isGroupMuted,
        incomingGroupCall,
        activeGroupCallsByChat,
        startGroupCall,
        joinGroupCall,
        leaveGroupCall,
        dismissIncomingGroupCall,
        toggleGroupMute,
      }}
    >
      {children}
      {/* Hidden audio element for direct 1-on-1 remote stream */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />
    </CallContext.Provider>
  );
};
