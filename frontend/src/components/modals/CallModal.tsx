import React, { useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Box,
  Text,
  IconButton,
  HStack,
  VStack,
} from "@chakra-ui/react";
import {
  IoCall,
  IoMic,
  IoMicOff,
  IoVideocam,
  IoVideocamOff,
  IoVolumeHigh,
  IoVolumeMute,
} from "react-icons/io5";
import UserAvatar from "../common/UserAvatar";
import { useCall } from "../../context/callContext";

interface CallModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  callType?: "voice" | "video";
  contact?: {
    name?: string;
    pic?: string;
  };
}

const CallModal: React.FC<CallModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const {
    callState,
    callType,
    otherUser,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    callDuration,
    statusMessage,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    endCall,
  } = useCall();

  const isContextActive =
    callState === "calling" ||
    callState === "connected" ||
    callState === "ended";

  const isOpen = propIsOpen !== undefined ? propIsOpen : isContextActive;
  const isVideo = callType === "video";
  const isConnected = callState === "connected";

  // Re-attach video stream if elements remount
  useEffect(() => {
    if (isVideo) {
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  }, [isVideo, localStream, remoteStream, localVideoRef, remoteVideoRef]);

  const handleEnd = () => {
    endCall();
    if (propOnClose) propOnClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isOpen) return null;

  const displayName = otherUser?.name || "Contact";
  const displayPic = otherUser?.pic;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleEnd}
      isCentered
      size={isVideo ? { base: "md", md: "xl" } : "md"}
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay bg="blackAlpha.850" backdropFilter="blur(8px)" />
      <ModalContent
        bg="#0F172A"
        color="white"
        borderRadius="28px"
        overflow="hidden"
        border="1px solid rgba(255, 255, 255, 0.12)"
        boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.85)"
      >
        <ModalBody p={isVideo ? { base: 4, md: 6 } : 8} textAlign="center">
          <VStack spacing={5}>
            {/* If video call, render video feeds */}
            {isVideo ? (
              <Box
                position="relative"
                w="100%"
                h={{ base: "260px", md: "380px" }}
                bg="#020617"
                borderRadius="22px"
                overflow="hidden"
                border="1px solid rgba(255, 255, 255, 0.1)"
              >
                {/* Main Remote Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />

                {/* Placeholder when remote camera not available or connecting */}
                {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
                  <VStack
                    position="absolute"
                    inset="0"
                    align="center"
                    justify="center"
                    bg="rgba(15, 23, 42, 0.88)"
                    spacing={3}
                  >
                    <UserAvatar
                      name={displayName}
                      src={displayPic}
                      size="2xl"
                      showStatus={false}
                    />
                    <Text fontSize="16px" fontWeight="700" color="#F8FAFC">
                      {displayName}
                    </Text>
                    <Text fontSize="xs" color="#94A3B8">
                      {isConnected ? "Camera Feed Connecting..." : statusMessage || "Calling..."}
                    </Text>
                  </VStack>
                )}

                {/* Floating Picture-in-Picture Local Video Preview */}
                {localStream && localStream.getVideoTracks().length > 0 && isVideoEnabled && (
                  <Box
                    position="absolute"
                    bottom="14px"
                    right="14px"
                    w={{ base: "84px", md: "115px" }}
                    h={{ base: "115px", md: "155px" }}
                    borderRadius="14px"
                    overflow="hidden"
                    border="2px solid rgba(255, 255, 255, 0.4)"
                    boxShadow="0 8px 24px rgba(0, 0, 0, 0.8)"
                    bg="#020617"
                  >
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: "scaleX(-1)",
                      }}
                    />
                  </Box>
                )}

                {/* Live call duration badge on top of video */}
                <Box
                  position="absolute"
                  top="12px"
                  left="14px"
                  bg="rgba(0, 0, 0, 0.6)"
                  backdropFilter="blur(4px)"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="600"
                  color="#10B981"
                >
                  {isConnected ? formatDuration(callDuration) : statusMessage || "Calling..."}
                </Box>
              </Box>
            ) : (
              /* Voice Call View: Avatar and Audio Wave */
              <>
                <Box position="relative" display="inline-block" my={2}>
                  {isConnected ? (
                    <Box
                      position="absolute"
                      top="-6px"
                      left="-6px"
                      right="-6px"
                      bottom="-6px"
                      borderRadius="full"
                      border="2px solid #3B82F6"
                      opacity={0.8}
                      animation="connectedPulse 2.4s infinite ease-in-out"
                    />
                  ) : callState === "calling" ? (
                    <Box
                      position="absolute"
                      top="-8px"
                      left="-8px"
                      right="-8px"
                      bottom="-8px"
                      borderRadius="full"
                      border="2px dashed #94A3B8"
                      opacity={0.6}
                      animation="callingSpin 6s linear infinite"
                    />
                  ) : null}

                  <UserAvatar
                    name={displayName}
                    src={displayPic}
                    size="2xl"
                    showStatus={false}
                  />
                </Box>

                <Box>
                  <Text fontSize="22px" fontWeight="700" color="#F8FAFC">
                    {displayName}
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="500"
                    color={
                      isConnected
                        ? "#10B981"
                        : callState === "ended"
                        ? "#EF4444"
                        : "#94A3B8"
                    }
                    mt={1}
                  >
                    {isConnected
                      ? formatDuration(callDuration)
                      : statusMessage || "Calling..."}
                  </Text>
                </Box>

                {isConnected && (
                  <HStack spacing="4px" h="28px" align="center" justify="center" py={1}>
                    {[0.4, 0.9, 0.6, 1.0, 0.7, 0.5, 0.8, 0.3].map((heightScale, idx) => (
                      <Box
                        key={idx}
                        w="4px"
                        h={`${Math.max(6, heightScale * 24)}px`}
                        bg={isMuted ? "#64748B" : "#3B82F6"}
                        borderRadius="full"
                        opacity={isMuted ? 0.4 : 0.85}
                        animation={`waveform 1.${(idx % 4) + 2}s infinite ease-in-out alternate`}
                      />
                    ))}
                  </HStack>
                )}
              </>
            )}

            {/* In-Call Action Buttons */}
            <HStack spacing={4} pt={2}>
              {/* Mute Button */}
              <VStack spacing={1}>
                <IconButton
                  size="lg"
                  borderRadius="full"
                  bg={isMuted ? "#EF4444" : "#1E293B"}
                  color="white"
                  w="54px"
                  h="54px"
                  _hover={{ bg: isMuted ? "#DC2626" : "#334155" }}
                  _active={{ transform: "scale(0.95)" }}
                  icon={isMuted ? <IoMicOff size={22} /> : <IoMic size={22} />}
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                  title={isMuted ? "Unmute" : "Mute"}
                />
                <Text fontSize="11px" color="#94A3B8">
                  {isMuted ? "Muted" : "Mute"}
                </Text>
              </VStack>

              {/* End Call Button */}
              <VStack spacing={1}>
                <IconButton
                  size="lg"
                  borderRadius="full"
                  bg="#EF4444"
                  color="white"
                  w="64px"
                  h="64px"
                  _hover={{ bg: "#DC2626", transform: "scale(1.06)" }}
                  _active={{ transform: "scale(0.94)" }}
                  transition="all 0.15s ease"
                  boxShadow="0 8px 24px rgba(239, 68, 68, 0.45)"
                  icon={<IoCall size={28} style={{ transform: "rotate(135deg)" }} />}
                  onClick={handleEnd}
                  aria-label="End call"
                  title="End Call"
                />
                <Text fontSize="11px" color="#94A3B8">
                  End
                </Text>
              </VStack>

              {/* Camera Toggle Button (if video call) */}
              {isVideo && (
                <VStack spacing={1}>
                  <IconButton
                    size="lg"
                    borderRadius="full"
                    bg={!isVideoEnabled ? "#EF4444" : "#1E293B"}
                    color="white"
                    w="54px"
                    h="54px"
                    _hover={{ bg: !isVideoEnabled ? "#DC2626" : "#334155" }}
                    _active={{ transform: "scale(0.95)" }}
                    icon={
                      !isVideoEnabled ? (
                        <IoVideocamOff size={22} />
                      ) : (
                        <IoVideocam size={22} />
                      )
                    }
                    onClick={toggleVideo}
                    aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                    title={isVideoEnabled ? "Camera On" : "Camera Off"}
                  />
                  <Text fontSize="11px" color="#94A3B8">
                    {isVideoEnabled ? "Video" : "Off"}
                  </Text>
                </VStack>
              )}

              {/* Speaker / Volume Button */}
              <VStack spacing={1}>
                <IconButton
                  size="lg"
                  borderRadius="full"
                  bg={!isSpeakerOn ? "#475569" : "#1E293B"}
                  color="white"
                  w="54px"
                  h="54px"
                  _hover={{ bg: "#334155" }}
                  _active={{ transform: "scale(0.95)" }}
                  icon={
                    !isSpeakerOn ? (
                      <IoVolumeMute size={22} />
                    ) : (
                      <IoVolumeHigh size={22} />
                    )
                  }
                  onClick={toggleSpeaker}
                  aria-label={isSpeakerOn ? "Mute speaker" : "Turn on speaker"}
                  title={isSpeakerOn ? "Speaker On" : "Speaker Muted"}
                />
                <Text fontSize="11px" color="#94A3B8">
                  {isSpeakerOn ? "Speaker" : "Muted"}
                </Text>
              </VStack>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CallModal;
