import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useChatState } from "../context/chatProvider";
import {
  Box,
  Flex,
  Spinner,
  Text,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import { IoSearchOutline, IoClose, IoSend } from "react-icons/io5";
import axios from "axios";
import { getSocket } from "../config/socket";
import ChatHeader from "./chat/ChatHeader";
import ScrollableChats from "./ScrollableChats";
import ChatInput from "./chat/ChatInput";
import ChatInfoPanel from "./chat/ChatInfoPanel";
import {
  savePendingMessage,
  getPendingMessages,
  cacheChatMessages,
  getCachedChatMessages,
  clearCachedMessages,
} from "../utils/indexedDB";
import { syncPendingMessages, setupAutoSync } from "../utils/offlineSync";
import { IChat, IMessage } from "@/types/chat";
import { cleanAvatarUrl } from "./common/UserAvatar";
import {
  isWindowActive,
  playNotificationChime,
  showSystemNotification,
  getMessageSnippet,
  updateDocumentTitle,
} from "../utils/notificationService";

let socket: any;
let selectedChatCompare: IChat | null;

interface SingleChatProps {
  fetchAgain: boolean;
  setFetchAgain: React.Dispatch<React.SetStateAction<boolean>>;
}

interface SelectedMedia {
  file: File;
  previewUrl: string;
  type: "image" | "video" | "audio" | "file";
  name: string;
  size: string;
}

const SingleChat: React.FC<SingleChatProps> = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // In-chat search state
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState("");

  // Replying state (WhatsApp/Telegram style)
  const [replyingTo, setReplyingTo] = useState<IMessage | null>(null);

  // Media Attachment & Preview Modal states
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Right-side Chat Info Panel disclosure
  const {
    isOpen: isInfoOpen,
    onOpen: onInfoOpen,
    onClose: onInfoClose,
  } = useDisclosure();

  const {
    user,
    selectedChat,
    setSelectedChat,
    chats,
    setChats,
    notification,
    setNotification,
  } = useChatState();
  const toast = useToast();

  const loggedUser = user?.data || user || {};
  const currentUserId = loggedUser?._id;
  const currentToken = loggedUser?.token;

  const selectedChatRef = useRef(selectedChat);
  selectedChatRef.current = selectedChat;
  const activeChatIdRef = useRef<string | null>(null);
  const currentChatId = selectedChat?._id;

  const updateChatLatestMessage = useCallback(
    (chatId: string, latestMsg: any) => {
      if (!chatId || !latestMsg) return;

      setChats((prevChats) => {
        if (!prevChats) return prevChats;
        const chatIndex = prevChats.findIndex((c) => c._id === chatId);
        if (chatIndex === -1) {
          if (selectedChatRef.current && selectedChatRef.current._id === chatId) {
            return [
              {
                ...selectedChatRef.current,
                latestMessage: latestMsg,
                updatedAt: latestMsg?.createdAt || new Date().toISOString(),
              },
              ...prevChats,
            ];
          }
          return prevChats;
        }

        const existingChat = prevChats[chatIndex];
        const updatedChat = {
          ...existingChat,
          latestMessage: latestMsg,
          updatedAt: latestMsg?.createdAt || new Date().toISOString(),
        };

        const nextChats = [...prevChats];
        nextChats.splice(chatIndex, 1);
        return [updatedChat, ...nextChats];
      });

      setSelectedChat((prevSelected: any) => {
        if (prevSelected && prevSelected._id === chatId) {
          if (prevSelected.latestMessage?._id === latestMsg?._id) {
            return prevSelected;
          }
          return {
            ...prevSelected,
            latestMessage: latestMsg,
            updatedAt: latestMsg?.createdAt || new Date().toISOString(),
          };
        }
        return prevSelected;
      });
    },
    [setChats, setSelectedChat]
  );

  // Initialize Socket.io connection using shared socket singleton
  useEffect(() => {
    socket = getSocket(loggedUser);
    if (socket?.connected) {
      setSocketConnected(true);
      if (navigator.onLine && currentToken) {
        syncPendingMessages(currentToken, socket);
      }
    }
    const onConnected = () => {
      setSocketConnected(true);
      if (navigator.onLine && currentToken) {
        syncPendingMessages(currentToken, socket);
      }
    };
    const onTyping = () => setIsTyping(true);
    const onStopTyping = () => setIsTyping(false);

    socket?.on("connected", onConnected);
    socket?.on("typing", onTyping);
    socket?.on("stop typing", onStopTyping);

    return () => {
      socket?.off("connected", onConnected);
      socket?.off("typing", onTyping);
      socket?.off("stop typing", onStopTyping);
    };
    // eslint-disable-next-line
  }, [loggedUser]);

  // Fetch messages for active chat (with IndexedDB offline cache & outbox support)
  const fetchMessages = useCallback(
    async (targetChatId?: string) => {
      const currentChat = selectedChatRef.current;
      const chatId = targetChatId || currentChat?._id;
      if (!chatId) return;

      let hasExisting = false;
      try {
        const cached = await getCachedChatMessages(chatId);
        const pending = await getPendingMessages(chatId);
        if (cached.length > 0 || pending.length > 0) {
          hasExisting = true;
          setMessages([...(cached as IMessage[]), ...(pending as unknown as IMessage[])]);
        }
      } catch (e) {
        console.warn("[SingleChat] Error reading cache:", e);
      }

      // Only show full loading spinner if we don't have existing or cached messages (WhatsApp behavior)
      if (!hasExisting) {
        setLoading(true);
      }

      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        };
        const { data } = await axios.get(
          `/api/message/${chatId}`,
          config
        );

        await cacheChatMessages(chatId, data);

        const pending = await getPendingMessages(chatId);
        setMessages([...data, ...(pending as unknown as IMessage[])]);
        setLoading(false);

        if (data && data.length > 0) {
          const newest = data[data.length - 1];
          if (!currentChat?.latestMessage || currentChat.latestMessage._id !== newest._id) {
            updateChatLatestMessage(chatId, newest);
          }
        }

        if (socket) {
          socket.emit("join chat", chatId);
          socket.emit("mark seen", {
            chatId: chatId,
            userId: currentUserId,
          });
        }
      } catch (error) {
        setLoading(false);
        if (navigator.onLine) {
          toast({
            title: "Error Occurred!",
            description: "Failed to load messages",
            status: "error",
            duration: 2000,
            isClosable: true,
          });
        }
      }
    },
    [currentToken, currentUserId, toast, updateChatLatestMessage]
  );

  useEffect(() => {
    const handleMessageSynced = (e: any) => {
      const { tempId, message: serverMsg, chatId } = e.detail || {};
      if (!serverMsg || !tempId) return;

      if (selectedChatCompare && selectedChatCompare._id === chatId) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId || m.tempId === tempId ? serverMsg : m
          )
        );
      }
    };

    window.addEventListener("message-synced", handleMessageSynced);

    const cleanupSync = setupAutoSync(
      () => currentToken,
      () => socket
    );

    return () => {
      window.removeEventListener("message-synced", handleMessageSynced);
      if (cleanupSync) cleanupSync();
    };
  }, [currentToken]);

  useEffect(() => {
    if (!currentChatId) {
      activeChatIdRef.current = null;
      selectedChatCompare = null;
      setMessages([]);
      return;
    }

    // Only fetch when switching to a different conversation!
    if (activeChatIdRef.current !== currentChatId) {
      activeChatIdRef.current = currentChatId;
      selectedChatCompare = selectedChat;
      setReplyingTo(null);
      setShowInChatSearch(false);
      setInChatSearchQuery("");
      fetchMessages(currentChatId);
    } else {
      selectedChatCompare = selectedChat;
    }
  }, [currentChatId, fetchMessages, selectedChat]);

  useEffect(() => {
    if (!socket) return;

    const handleMessageRecieved = (newMessageRecieved: any) => {
      updateChatLatestMessage(newMessageRecieved.chat?._id, newMessageRecieved);

      const isDifferentChat =
        !selectedChatCompare ||
        selectedChatCompare._id !== newMessageRecieved.chat._id;
      const windowActive = isWindowActive();

      const senderName = newMessageRecieved.sender?.name || "Someone";
      const isGroup = newMessageRecieved.chat?.isGroupChat;
      const notifTitle = isGroup
        ? `${newMessageRecieved.chat?.chatName || "Group"}: ${senderName}`
        : senderName;
      const notifSnippet = getMessageSnippet(newMessageRecieved);
      const isMuted = newMessageRecieved.chat?.mutedBy?.includes(currentUserId);
      const avatarSrc = cleanAvatarUrl(newMessageRecieved.sender?.pic);

      if (isDifferentChat) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
        socket.emit("message delivered", {
          messageId: newMessageRecieved._id,
          chatId: newMessageRecieved.chat._id,
          senderId: newMessageRecieved.sender._id,
          userId: currentUserId,
        });

        if (!isMuted) {
          playNotificationChime();

          showSystemNotification({
            title: notifTitle,
            body: notifSnippet,
            icon: avatarSrc || "/talkative-logo.png",
            chatId: newMessageRecieved.chat._id,
            onClick: () => {
              setSelectedChat(newMessageRecieved.chat);
            },
          });

          if (!windowActive) {
            updateDocumentTitle(notification.length + 1, notifTitle);
          }
        }
      } else {
        // The chat is open
        setMessages((prev) => [...prev, newMessageRecieved]);

        if (windowActive) {
          // Window is open and focused: mark as seen immediately
          socket.emit("mark seen", {
            chatId: selectedChatCompare._id,
            userId: currentUserId,
          });
          const config = {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          };
          axios
            .put(`/api/message/read/${selectedChatCompare._id}`, {}, config)
            .catch(() => { });
        } else {
          // Even chat is open, window is NOT opened (minimized / background tab)
          // Show system notification banner and play chime!
          socket.emit("message delivered", {
            messageId: newMessageRecieved._id,
            chatId: newMessageRecieved.chat._id,
            senderId: newMessageRecieved.sender._id,
            userId: currentUserId,
          });

          if (!isMuted) {
            playNotificationChime();

            showSystemNotification({
              title: notifTitle,
              body: notifSnippet,
              icon: avatarSrc || "/talkative-logo.png",
              chatId: newMessageRecieved.chat._id,
              onClick: () => {
                try {
                  window.focus();
                } catch (e) { }
              },
            });

            updateDocumentTitle(1, notifTitle);
          }
        }
      }
    };

    const handleReactionUpdated = ({ messageId, reactions }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleMessagesSeen = ({ chatId, userId }: any) => {
      if (selectedChatCompare && selectedChatCompare._id === chatId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.sender?._id === currentUserId) {
              const readBy = m.readBy ? [...m.readBy] : [];
              if (!readBy.includes(userId)) readBy.push(userId);
              return { ...m, status: "seen", readBy };
            }
            return m;
          })
        );
      }
    };

    const handleMessageDelivered = ({ messageId, userId }: any) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === messageId && m.status !== "seen") {
            const deliveredTo = m.deliveredTo ? [...m.deliveredTo] : [];
            if (!deliveredTo.includes(userId)) deliveredTo.push(userId);
            return { ...m, status: "delivered", deliveredTo };
          }
          return m;
        })
      );
    };

    const handleMessageDeleted = ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    const handleChatCleared = ({ chatId }: any) => {
      if (selectedChatCompare && selectedChatCompare._id === chatId) {
        setMessages([]);
      }
      setChats((prevChats) =>
        prevChats.map((c) =>
          c._id === chatId ? { ...c, latestMessage: null } : c
        )
      );
      setSelectedChat((prev: any) =>
        prev && prev._id === chatId ? { ...prev, latestMessage: null } : prev
      );
      clearCachedMessages(chatId);
    };

    const handleChatDeleted = ({ chatId }: any) => {
      if (selectedChatCompare && selectedChatCompare._id === chatId) {
        setSelectedChat(null);
      }
      setChats((prevChats) => prevChats.filter((c) => c._id !== chatId));
      clearCachedMessages(chatId);
    };

    socket.on("message recieved", handleMessageRecieved);
    socket.on("message reaction updated", handleReactionUpdated);
    socket.on("messages seen", handleMessagesSeen);
    socket.on("message delivered", handleMessageDelivered);
    socket.on("message deleted", handleMessageDeleted);
    socket.on("chat cleared", handleChatCleared);
    socket.on("chat deleted", handleChatDeleted);

    return () => {
      socket.off("message recieved", handleMessageRecieved);
      socket.off("message reaction updated", handleReactionUpdated);
      socket.off("messages seen", handleMessagesSeen);
      socket.off("message delivered", handleMessageDelivered);
      socket.off("message deleted", handleMessageDeleted);
      socket.off("chat cleared", handleChatCleared);
      socket.off("chat deleted", handleChatDeleted);
    };
  });

  useEffect(() => {
    const handleWindowFocus = () => {
      if (selectedChatCompare && socket && currentToken) {
        socket.emit("mark seen", {
          chatId: selectedChatCompare._id,
          userId: currentUserId,
        });
        const config = {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        };
        axios
          .put(`/api/message/read/${selectedChatCompare._id}`, {}, config)
          .catch(() => { });
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [currentToken, currentUserId]);

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      };
      const { data } = await axios.put(
        `/api/message/${messageId}/react`,
        { emoji },
        config
      );

      setMessages((prev) => prev.map((m) => (m._id === messageId ? data : m)));

      socket.emit("message reaction", {
        messageId,
        chatId: selectedChat._id,
        reactions: data.reactions,
        senderId: currentUserId,
      });
    } catch (error) {
      toast({
        title: "Could not add reaction",
        status: "error",
        duration: 1500,
      });
    }
  };

  const handleStarMessage = async (messageId: string) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      };
      const { data } = await axios.put(
        `/api/message/${messageId}/star`,
        {},
        config
      );
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isStarred: data.isStarred } : m
        )
      );
      toast({
        title: data.isStarred ? "Message Starred" : "Message Unstarred",
        status: "info",
        duration: 1500,
      });
    } catch (err) {
      toast({ title: "Failed to star message", status: "error", duration: 1500 });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      };
      await axios.delete(`/api/message/${messageId}?deleteForEveryone=true`, config);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      socket.emit("delete message", { messageId, chatId: selectedChat._id });
      toast({ title: "Message deleted", status: "info", duration: 1500 });
    } catch (err) {
      toast({ title: "Failed to delete message", status: "error", duration: 1500 });
    }
  };

  const handleClearChat = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      };
      await axios.delete(`/api/chat/${selectedChat._id}/clear`, config);
      await clearCachedMessages(selectedChat._id);
      setMessages([]);

      setChats((prevChats) =>
        prevChats.map((c) =>
          c._id === selectedChat._id ? { ...c, latestMessage: null } : c
        )
      );

      setSelectedChat((prev: any) =>
        prev && prev._id === selectedChat._id ? { ...prev, latestMessage: null } : prev
      );

      if (socket) {
        socket.emit("clear chat", { chatId: selectedChat._id });
      }

      toast({ title: "Chat cleared", status: "success", duration: 1500 });
    } catch (err) {
      toast({ title: "Failed to clear chat", status: "error", duration: 1500 });
    }
  };

  const handleDeleteChat = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      };
      const chatIdToDelete = selectedChat._id;
      await axios.delete(`/api/chat/${chatIdToDelete}`, config);
      await clearCachedMessages(chatIdToDelete);

      setChats((prevChats) => prevChats.filter((c) => c._id !== chatIdToDelete));
      setSelectedChat(null);

      if (socket) {
        socket.emit("delete chat", { chatId: chatIdToDelete });
      }

      toast({
        title: "Chat deleted",
        description: "Conversation permanently removed",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({ title: "Failed to delete chat", status: "error", duration: 1500 });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    if (socket && socketConnected) {
      socket.emit("stop typing", selectedChat._id);
    }

    const textToSend = newMessage;
    const replyRef = replyingTo;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const pendingMsg: IMessage = {
      _id: tempId,
      tempId,
      chat: selectedChat,
      chatId: selectedChat._id,
      sender: {
        _id: currentUserId,
        name: loggedUser.name,
        email: loggedUser.email,
        pic: loggedUser.pic,
      },
      content: textToSend,
      replyTo: replyRef,
      mediaType: "text",
      fileUrl: "",
      fileName: "",
      fileSize: 0,
      status: "pending",
      isPending: true,
      createdAt: new Date().toISOString(),
      readBy: [currentUserId],
      deliveredTo: [currentUserId],
      reactions: [],
    };

    setNewMessage("");
    setReplyingTo(null);
    setMessages((prev) => [...prev, pendingMsg]);
    updateChatLatestMessage(selectedChat._id, pendingMsg);

    if (!navigator.onLine) {
      try {
        await savePendingMessage(pendingMsg);
        toast({
          title: "Offline - Message Queued",
          description: "Stored in IndexedDB. Will send automatically when online.",
          status: "info",
          duration: 2500,
          isClosable: true,
        });
      } catch (err) {
        console.error("Failed to save offline message to IndexedDB:", err);
      }
      return;
    }

    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      };

      const { data } = await axios.post(
        "/api/message",
        {
          content: textToSend,
          chatId: selectedChat._id,
          replyTo: replyRef?._id,
        },
        config
      );

      setMessages((prev) =>
        prev.map((m) => (m.tempId === tempId || m._id === tempId ? data : m))
      );
      updateChatLatestMessage(selectedChat._id, data);

      if (socket) {
        socket.emit("new message", data);
      }

      getCachedChatMessages(selectedChat._id).then((cached) => {
        cacheChatMessages(selectedChat._id, [...cached, data]);
      });
    } catch (error: any) {
      console.warn("[SingleChat] Send failed due to network. Queuing to IndexedDB:", error.message);
      try {
        await savePendingMessage(pendingMsg);
        toast({
          title: "Saved to Offline Outbox",
          description: "Network unavailable. Message will send once connection is restored.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      } catch (saveErr) {
        console.error("Failed to save pending message to IndexedDB:", saveErr);
      }
    }
  };

  const handleSelectFile = (file: File) => {
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    let type: "image" | "video" | "audio" | "file" = "file";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type.startsWith("audio/")) type = "audio";

    const previewUrl = URL.createObjectURL(file);
    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + " MB";

    setSelectedMedia({
      file,
      previewUrl,
      type,
      name: file.name,
      size: sizeFormatted,
    });
    setMediaCaption("");
  };

  const cancelMediaUpload = () => {
    if (selectedMedia?.previewUrl) {
      URL.revokeObjectURL(selectedMedia.previewUrl);
    }
    setSelectedMedia(null);
    setMediaCaption("");
  };

  const sendMediaMessage = async () => {
    if (!selectedMedia) return;

    if (!navigator.onLine) {
      toast({
        title: "Cannot upload while offline",
        description: "Please reconnect to internet to send media and documents.",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      setIsUploadingMedia(true);
      const formData = new FormData();
      formData.append("file", selectedMedia.file);

      const uploadConfig = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${currentToken}`,
        },
      };

      const uploadRes = await axios.post(
        "/api/message/upload",
        formData,
        uploadConfig
      );
      const { fileUrl, mediaType, fileName, fileSize } = uploadRes.data;

      const messageConfig = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      };

      const replyRef = replyingTo?._id;

      const { data } = await axios.post(
        "/api/message",
        {
          content: mediaCaption,
          chatId: selectedChat._id,
          mediaType,
          fileUrl,
          fileName,
          fileSize,
          replyTo: replyRef,
        },
        messageConfig
      );

      socket.emit("new message", data);
      setMessages((prev) => [...prev, data]);
      updateChatLatestMessage(selectedChat._id, data);
      cancelMediaUpload();
      setReplyingTo(null);
      setIsUploadingMedia(false);
    } catch (error: any) {
      setIsUploadingMedia(false);
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || "Could not send media",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleSendVoiceNote = async (audioFile: File, durationSeconds: number = 0) => {
    if (!audioFile) return;

    const safeDuration = Number.isFinite(Number(durationSeconds))
      ? Math.max(0, Math.round(Number(durationSeconds)))
      : 0;
    const durationLabel = `${Math.floor(safeDuration / 60)}:${String(
      safeDuration % 60
    ).padStart(2, "0")}`;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const previewUrl = URL.createObjectURL(audioFile);
    const replyRef = replyingTo?._id;

    const pendingMsg: IMessage = {
      _id: tempId,
      sender: user?.data || user,
      content: "",
      mediaType: "audio",
      fileUrl: previewUrl,
      fileName: `Voice Note (${durationLabel})`,
      fileSize: audioFile.size,
      audioDuration: safeDuration,
      chat: selectedChat,
      createdAt: new Date().toISOString(),
      status: "pending",
      isPending: true,
      replyTo: replyingTo,
    };

    setMessages((prev) => [...prev, pendingMsg]);
    setReplyingTo(null);
    updateChatLatestMessage(selectedChat._id, pendingMsg);

    if (!navigator.onLine) {
      try {
        await savePendingMessage(pendingMsg);
        toast({
          title: "Voice Note Saved to Outbox",
          description: "Offline mode. Will send automatically when online.",
          status: "info",
          duration: 3000,
        });
      } catch (saveErr) {
        console.error("Failed to save voice note to IndexedDB:", saveErr);
      }
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const uploadConfig = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${currentToken}`,
        },
      };

      const uploadRes = await axios.post("/api/message/upload", formData, uploadConfig);
      const { fileUrl, fileName, fileSize } = uploadRes.data;

      const messageConfig = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      };

      const { data } = await axios.post(
        "/api/message",
        {
          content: "",
          chatId: selectedChat._id,
          mediaType: "audio",
          fileUrl,
          fileName: fileName || `Voice Note (${durationLabel})`,
          fileSize,
          audioDuration: safeDuration,
          replyTo: replyRef,
        },
        messageConfig
      );

      socket.emit("new message", data);
      updateChatLatestMessage(selectedChat._id, data);

      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...data, status: "sent" } : m))
      );
    } catch (err: any) {
      console.error("Failed to send voice note:", err);
      toast({
        title: "Voice Note Failed",
        description: err.response?.data?.message || "Could not send voice message",
        status: "error",
        duration: 3000,
      });
    }
  };

  const typingHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    const lastTypingTime = new Date().getTime();
    const timerLength = 3000;
    setTimeout(() => {
      const timeNow = new Date().getTime();
      const timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  const displayedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return messages;
    const q = inChatSearchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.content?.toLowerCase().includes(q) ||
        m.fileName?.toLowerCase().includes(q)
    );
  }, [messages, inChatSearchQuery]);

  return (
    <>
      {selectedChat ? (
        <Flex direction="column" w="100%" h="100%" bg="transparent" overflow="hidden" className="single-chat-surface">
          <ChatHeader
            chat={selectedChat}
            isTyping={isTyping}
            onToggleInfo={onInfoOpen}
            onSearchInChat={() => setShowInChatSearch(!showInChatSearch)}
            onClearChat={handleClearChat}
            onDeleteChat={handleDeleteChat}
            fetchAgain={fetchAgain}
            setFetchAgain={setFetchAgain}
            fetchMessages={fetchMessages}
          />

          {showInChatSearch && (
            <Flex
              className="glass-chat-search"
              px={3}
              py={2}
              bg="white"
              borderBottom="1px solid #E2E8F0"
              align="center"
              gap={2}
            >
              <InputGroup size="sm">
                <InputLeftElement pointerEvents="none" color="#94A3B8">
                  <IoSearchOutline size={16} />
                </InputLeftElement>
                <Input
                  placeholder="Search in this conversation..."
                  value={inChatSearchQuery}
                  onChange={(e) => setInChatSearchQuery(e.target.value)}
                  borderRadius="8px"
                  bg="#F8FAFC"
                  autoFocus
                />
              </InputGroup>
              <IconButton
                size="sm"
                variant="ghost"
                icon={<IoClose size={18} />}
                onClick={() => {
                  setShowInChatSearch(false);
                  setInChatSearchQuery("");
                }}
                aria-label="Close search"
              />
            </Flex>
          )}

          <Box flex="1" overflow="hidden" position="relative" bg="transparent" className="message-canvas">
            {loading ? (
              <Flex h="100%" align="center" justify="center">
                <Spinner size="xl" color="blue.500" thickness="3px" />
              </Flex>
            ) : (
              <div
                className="messages"
                style={{ height: "100%", width: "100%", overflow: "hidden" }}
              >
                <ScrollableChats
                  messages={displayedMessages}
                  handleReaction={handleReaction}
                  onReply={(m) => setReplyingTo(m)}
                  onStarMessage={handleStarMessage}
                  onDeleteMessage={handleDeleteMessage}
                />
              </div>
            )}
          </Box>

          <ChatInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={sendMessage}
            onTyping={typingHandler}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onSelectFile={handleSelectFile}
            onSendVoiceNote={handleSendVoiceNote}
          />

          <ChatInfoPanel
            isOpen={isInfoOpen}
            onClose={onInfoClose}
            chat={selectedChat}
            messages={messages}
            onClearChat={handleClearChat}
            onDeleteChat={handleDeleteChat}
          />

          {selectedMedia && (
            <Modal
              isOpen={Boolean(selectedMedia)}
              onClose={cancelMediaUpload}
              size="lg"
              isCentered
            >
              <ModalOverlay backdropFilter="blur(4px)" />
              <ModalContent borderRadius="16px">
                <ModalHeader pb={1}>
                  Send {selectedMedia.type.toUpperCase()}
                  <Badge ml={2} colorScheme="blue">
                    {selectedMedia.size}
                  </Badge>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    maxH="380px"
                    bg="gray.100"
                    borderRadius="12px"
                    overflow="hidden"
                    mb={3}
                  >
                    {selectedMedia.type === "video" ? (
                      <video
                        src={selectedMedia.previewUrl}
                        controls
                        style={{ maxHeight: "360px", maxWidth: "100%" }}
                      />
                    ) : selectedMedia.type === "audio" ? (
                      <Box p={6} textAlign="center">
                        <Text fontSize="md" fontWeight="600" mb={2}>
                          🎵 {selectedMedia.name}
                        </Text>
                        <audio src={selectedMedia.previewUrl} controls />
                      </Box>
                    ) : selectedMedia.type === "image" ? (
                      <img
                        src={selectedMedia.previewUrl}
                        alt="Preview"
                        style={{
                          maxHeight: "360px",
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <Box p={6} textAlign="center">
                        <Text fontSize="md" fontWeight="600">
                          📄 {selectedMedia.name}
                        </Text>
                      </Box>
                    )}
                  </Box>
                  <Input
                    placeholder="Add a caption..."
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isUploadingMedia) {
                        sendMediaMessage();
                      }
                    }}
                  />
                </ModalBody>
                <ModalFooter gap={2}>
                  <Button
                    variant="ghost"
                    onClick={cancelMediaUpload}
                    isDisabled={isUploadingMedia}
                  >
                    Cancel
                  </Button>
                  <Button
                    colorScheme="blue"
                    leftIcon={<IoSend />}
                    isLoading={isUploadingMedia}
                    loadingText="Sending..."
                    onClick={sendMediaMessage}
                  >
                    Send
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          )}
        </Flex>
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="center"
          h="100%"
          w="100%"
          bg="transparent"
          p={6}
          textAlign="center"
          className="chat-empty-state"
        >
          <Box
            w="80px"
            h="80px"
            borderRadius="24px"
            className="chat-empty-icon"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mb={4}
            fontSize="36px"
          >
            💬
          </Box>
          <Text fontSize="22px" fontWeight="700" className="chat-empty-title">
            Select a conversation
          </Text>
          <Text fontSize="sm" maxW="340px" mt={1} className="chat-empty-subtitle">
            Choose a contact from the sidebar or start a new conversation to begin chatting.
          </Text>
        </Flex>
      )}
    </>
  );
};

export default SingleChat;

