import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import io from "socket.io-client";
import ChatHeader from "./chat/ChatHeader";
import ScrollableChats from "./ScrollableChats";
import ChatInput from "./chat/ChatInput";
import ChatInfoPanel from "./chat/ChatInfoPanel";
import {
  savePendingMessage,
  getPendingMessages,
  cacheChatMessages,
  getCachedChatMessages,
} from "../utils/indexedDB";
import { syncPendingMessages, setupAutoSync } from "../utils/offlineSync";
import "./styles.css";

const ENDPOINT =
  process.env.REACT_APP_BACKEND_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    ? "http://localhost:8080"
    : typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8080");

var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // In-chat search state
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState("");

  // Replying state (WhatsApp/Telegram style)
  const [replyingTo, setReplyingTo] = useState(null);

  // Media Attachment & Preview Modal states
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Right-side Chat Info Panel disclosure
  const {
    isOpen: isInfoOpen,
    onOpen: onInfoOpen,
    onClose: onInfoClose,
  } = useDisclosure();

  const { user, selectedChat, notification, setNotification } =
    useChatState();
  const toast = useToast();

  const loggedUser = user?.data || user || {};
  const currentUserId = loggedUser?._id;
  const currentToken = loggedUser?.token;

  // Initialize Socket.io connection
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", loggedUser);
    socket.on("connected", () => {
      setSocketConnected(true);
      if (navigator.onLine && currentToken) {
        syncPendingMessages(currentToken, socket);
      }
    });
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  // Fetch messages for active chat (with IndexedDB offline cache & outbox support)
  const fetchMessages = useCallback(async () => {
    if (!selectedChat) return;

    // 1. Immediately display cached messages + pending outbox messages from IndexedDB
    try {
      const cached = await getCachedChatMessages(selectedChat._id);
      const pending = await getPendingMessages(selectedChat._id);
      if (cached.length > 0 || pending.length > 0) {
        setMessages([...cached, ...pending]);
      }
    } catch (e) {
      console.warn("[SingleChat] Error reading cache:", e);
    }

    // 2. If offline, keep cached messages without making network request
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
      setLoading(true);
      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );

      // Cache fresh confirmed messages to IndexedDB
      await cacheChatMessages(selectedChat._id, data);

      // Append any pending messages for this chat that haven't sent yet
      const pending = await getPendingMessages(selectedChat._id);
      setMessages([...data, ...pending]);
      setLoading(false);

      if (socket) {
        socket.emit("join chat", selectedChat._id);
        socket.emit("mark seen", {
          chatId: selectedChat._id,
          userId: currentUserId,
        });
      }
    } catch (error) {
      setLoading(false);
      // If error occurred while online, show toast
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
  }, [selectedChat, currentToken, currentUserId, toast]);

  // Listen for message-synced events and setup background outbox sync
  useEffect(() => {
    const handleMessageSynced = (e) => {
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
    fetchMessages();
    selectedChatCompare = selectedChat;
    setReplyingTo(null);
    setShowInChatSearch(false);
    setInChatSearchQuery("");
  }, [selectedChat, fetchMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageRecieved = (newMessageRecieved) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
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
      } else {
        setMessages((prev) => [...prev, newMessageRecieved]);
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
          .catch(() => {});
      }
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleMessagesSeen = ({ chatId, userId }) => {
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

    const handleMessageDelivered = ({ messageId, userId }) => {
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

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    socket.on("message recieved", handleMessageRecieved);
    socket.on("message reaction updated", handleReactionUpdated);
    socket.on("messages seen", handleMessagesSeen);
    socket.on("message delivered", handleMessageDelivered);
    socket.on("message deleted", handleMessageDeleted);

    return () => {
      socket.off("message recieved", handleMessageRecieved);
      socket.off("message reaction updated", handleReactionUpdated);
      socket.off("messages seen", handleMessagesSeen);
      socket.off("message delivered", handleMessageDelivered);
      socket.off("message deleted", handleMessageDeleted);
    };
  });

  // Reaction handler (WhatsApp style)
  const handleReaction = async (messageId, emoji) => {
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

  // Star message handler
  const handleStarMessage = async (messageId) => {
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

  // Delete message handler
  const handleDeleteMessage = async (messageId) => {
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

  // Clear all messages in chat
  const handleClearChat = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      };
      await axios.delete(`/api/chat/${selectedChat._id}/clear`, config);
      setMessages([]);
      toast({ title: "Chat cleared", status: "success", duration: 1500 });
    } catch (err) {
      toast({ title: "Failed to clear chat", status: "error", duration: 1500 });
    }
  };

  // Send regular text message (with IndexedDB offline queuing like WhatsApp)
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    if (socket && socketConnected) {
      socket.emit("stop typing", selectedChat._id);
    }

    const textToSend = newMessage;
    const replyRef = replyingTo;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Build optimistic message with pending WhatsApp clock status
    const pendingMsg = {
      _id: tempId,
      tempId,
      chat: selectedChat,
      chatId: selectedChat._id,
      sender: {
        _id: currentUserId,
        name: loggedUser.name,
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

    // Immediately render in UI and clear inputs for instant responsiveness
    setNewMessage("");
    setReplyingTo(null);
    setMessages((prev) => [...prev, pendingMsg]);

    // If currently offline: directly store in IndexedDB outbox
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

    // Online: attempt sending to backend
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

      // Replace temporary pending message with server confirmed message
      setMessages((prev) =>
        prev.map((m) => (m.tempId === tempId || m._id === tempId ? data : m))
      );

      if (socket) {
        socket.emit("new message", data);
      }

      // Update cached messages in IndexedDB
      getCachedChatMessages(selectedChat._id).then((cached) => {
        cacheChatMessages(selectedChat._id, [...cached, data]);
      });
    } catch (error) {
      // Network failure while attempting send: queue to IndexedDB outbox
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

  // Handle file select for media, audio, or document
  const handleSelectFile = (file) => {
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

    let type = "file";
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

  // Upload and send attachment
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
      cancelMediaUpload();
      setReplyingTo(null);
      setIsUploadingMedia(false);
    } catch (error) {
      setIsUploadingMedia(false);
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || "Could not send media",
        status: "error",
        duration: 3000,
      });
    }
  };

  // Handle WhatsApp-style voice message recording and sending
  const handleSendVoiceNote = async (audioFile, durationStr) => {
    if (!audioFile) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const previewUrl = URL.createObjectURL(audioFile);
    const replyRef = replyingTo?._id;

    // 1. Optimistically append voice message to UI
    const pendingMsg = {
      _id: tempId,
      sender: user?.data || user,
      content: "",
      mediaType: "audio",
      fileUrl: previewUrl,
      fileName: `Voice Note (${durationStr || "0:05"})`,
      fileSize: audioFile.size,
      chat: selectedChat,
      createdAt: new Date().toISOString(),
      status: "pending",
      isPending: true,
      replyTo: replyingTo,
    };

    setMessages((prev) => [...prev, pendingMsg]);
    setReplyingTo(null);

    // 2. Offline check
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

    // 3. Online upload & send
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
          fileName: fileName || `Voice Note (${durationStr || "0:05"})`,
          fileSize,
          replyTo: replyRef,
        },
        messageConfig
      );

      socket.emit("new message", data);

      // Replace optimistic message with confirmed server message
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...data, status: "sent" } : m))
      );
    } catch (err) {
      console.error("Failed to send voice note:", err);
      toast({
        title: "Voice Note Failed",
        description: err.response?.data?.message || "Could not send voice message",
        status: "error",
        duration: 3000,
      });
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  // Filter messages if in-chat search is active
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
        <Flex direction="column" w="100%" h="100%" bg="#F8FAFC" overflow="hidden">
          {/* Top Chat Header */}
          <ChatHeader
            chat={selectedChat}
            isTyping={isTyping}
            onToggleInfo={onInfoOpen}
            onSearchInChat={() => setShowInChatSearch(!showInChatSearch)}
            onClearChat={handleClearChat}
            fetchAgain={fetchAgain}
            setFetchAgain={setFetchAgain}
            fetchMessages={fetchMessages}
          />

          {/* In-Chat Search Overlay Bar */}
          {showInChatSearch && (
            <Flex
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

          {/* Messages Feed Area */}
          <Box flex="1" overflow="hidden" position="relative" bg="#F1F5F9">
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

          {/* Bottom Chat Input with Docked Reply Preview */}
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

          {/* Right-Side Chat Details Drawer */}
          <ChatInfoPanel
            isOpen={isInfoOpen}
            onClose={onInfoClose}
            chat={selectedChat}
            messages={messages}
            onClearChat={handleClearChat}
          />

          {/* Media Preview Modal Before Sending */}
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
          bg="#F8FAFC"
          p={6}
          textAlign="center"
        >
          <Box
            w="80px"
            h="80px"
            borderRadius="24px"
            bg="blue.50"
            color="#2563EB"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mb={4}
            fontSize="36px"
          >
            💬
          </Box>
          <Text fontSize="22px" fontWeight="700" color="#0F172A">
            Select a conversation
          </Text>
          <Text fontSize="sm" color="#64748B" maxW="320px" mt={1}>
            Choose a contact from the sidebar or start a new conversation to begin chatting.
          </Text>
        </Flex>
      )}
    </>
  );
};

export default SingleChat;
