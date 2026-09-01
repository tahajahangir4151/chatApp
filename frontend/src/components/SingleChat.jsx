import React, { useEffect, useRef, useState, useCallback } from "react";
import { useChatState } from "../context/chatProvider";
import {
  Box,
  FormControl,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  InputLeftElement,
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
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { getSender, getSenderFull } from "../config/chatLogics";
import ProfileModal from "./miscellaneous/ProfileModal";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import axios from "axios";
import "./styles.css";
import ScrollableChats from "./ScrollableChats";
import io from "socket.io-client";
import Picker from "emoji-picker-react";
import { FaRegSmile, FaPaperclip } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";

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
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Media attachment states
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const { user, selectedChat, setSelectedChat, notification, setNotification } =
    useChatState();
  const toast = useToast();

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user.data);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.data.token}`,
        },
      };
      setLoading(true);
      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );

      setMessages(data);
      setLoading(false);

      socket.emit("join chat", selectedChat._id);
      socket.emit("mark seen", {
        chatId: selectedChat._id,
        userId: user.data._id,
      });
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoading(false);
    }
  }, [selectedChat, user, toast]);

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
  }, [selectedChat, fetchMessages]);

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
        // Notify sender that message was delivered
        socket.emit("message delivered", {
          messageId: newMessageRecieved._id,
          chatId: newMessageRecieved.chat._id,
          senderId: newMessageRecieved.sender._id,
          userId: user.data._id,
        });
      } else {
        // Message received in active chat: mark seen
        setMessages((prevMessages) => [...prevMessages, newMessageRecieved]);
        socket.emit("mark seen", {
          chatId: selectedChatCompare._id,
          userId: user.data._id,
        });
        // Call read API
        const config = {
          headers: {
            Authorization: `Bearer ${user.data.token}`,
          },
        };
        axios
          .put(`/api/message/read/${selectedChatCompare._id}`, {}, config)
          .catch(() => {});
      }
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prevMessages) =>
        prevMessages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        )
      );
    };

    const handleMessagesSeen = ({ chatId, userId }) => {
      if (selectedChatCompare && selectedChatCompare._id === chatId) {
        setMessages((prevMessages) =>
          prevMessages.map((m) => {
            if (m.sender?._id === user.data._id) {
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
      setMessages((prevMessages) =>
        prevMessages.map((m) => {
          if (m._id === messageId && m.status !== "seen") {
            const deliveredTo = m.deliveredTo ? [...m.deliveredTo] : [];
            if (!deliveredTo.includes(userId)) deliveredTo.push(userId);
            return { ...m, status: "delivered", deliveredTo };
          }
          return m;
        })
      );
    };

    socket.on("message recieved", handleMessageRecieved);
    socket.on("message reaction updated", handleReactionUpdated);
    socket.on("messages seen", handleMessagesSeen);
    socket.on("message delivered", handleMessageDelivered);

    return () => {
      socket.off("message recieved", handleMessageRecieved);
      socket.off("message reaction updated", handleReactionUpdated);
      socket.off("messages seen", handleMessagesSeen);
      socket.off("message delivered", handleMessageDelivered);
    };
  });

  const handleEmojiClick = (emojiObject) => {
    if (emojiObject && emojiObject.emoji) {
      const newEmoji = emojiObject.emoji;
      setNewMessage((prevMessage) => (prevMessage || "") + newEmoji);
    }
    setShowPicker(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Toggle or add reaction (WhatsApp style)
  const handleReaction = async (messageId, emoji) => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.data.token}`,
        },
      };

      const { data } = await axios.put(
        `/api/message/${messageId}/react`,
        { emoji },
        config
      );

      // Update in state
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? data : m))
      );

      // Emit to socket
      socket.emit("message reaction", {
        messageId,
        chatId: selectedChat._id,
        reactions: data.reactions,
        senderId: user.data._id,
      });
    } catch (error) {
      toast({
        title: "Could not add reaction",
        status: "error",
        duration: 1500,
        isClosable: true,
      });
    }
  };

  // Send regular text message
  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.data.token}`,
          },
        };
        const messageToSend = newMessage;
        setNewMessage("");

        const { data } = await axios.post(
          "/api/message",
          {
            content: messageToSend,
            chatId: selectedChat._id,
          },
          config
        );

        socket.emit("new message", data);
        setMessages((prev) => [...prev, data]);
      } catch (error) {
        toast({
          title: "Error Occurred!",
          description: "Failed to send the message",
          status: "error",
          duration: 2000,
          isClosable: true,
          position: "bottom-left",
        });
      }
    }
  };

  // Handle file select for media
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const previewUrl = URL.createObjectURL(file);
    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + " MB";

    setSelectedMedia({
      file,
      previewUrl,
      type: isVideo ? "video" : "image",
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Upload and send image or video
  const sendMediaMessage = async () => {
    if (!selectedMedia) return;

    try {
      setIsUploadingMedia(true);
      const formData = new FormData();
      formData.append("file", selectedMedia.file);

      const uploadConfig = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${user.data.token}`,
        },
      };

      // 1. Upload media file to server
      const uploadRes = await axios.post(
        "/api/message/upload",
        formData,
        uploadConfig
      );
      const { fileUrl, mediaType, fileName, fileSize } = uploadRes.data;

      // 2. Create message with media attachment
      const messageConfig = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.data.token}`,
        },
      };

      const { data } = await axios.post(
        "/api/message",
        {
          content: mediaCaption,
          chatId: selectedChat._id,
          mediaType,
          fileUrl,
          fileName,
          fileSize,
        },
        messageConfig
      );

      socket.emit("new message", data);
      setMessages((prev) => [...prev, data]);
      cancelMediaUpload();
      setIsUploadingMedia(false);

      toast({
        title: "Sent!",
        status: "success",
        duration: 1500,
        isClosable: true,
      });
    } catch (error) {
      setIsUploadingMedia(false);
      toast({
        title: "Upload Failed",
        description:
          error.response?.data?.message || "Could not send media file",
        status: "error",
        duration: 3000,
        isClosable: true,
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

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "26px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            display="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            {!selectedChat.isGroupChat ? (
              <>
                {getSender(user, selectedChat.users)}
                <ProfileModal user={getSenderFull(user, selectedChat.users)} />
              </>
            ) : (
              <>
                {selectedChat.chatName.toUpperCase()}
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  fetchMessages={fetchMessages}
                />
              </>
            )}
          </Text>
          <Box
            display={"flex"}
            flexDirection={"column"}
            justifyContent={"flex-end"}
            p={3}
            bg={"#E8E8E8"}
            w={"100%"}
            h={"100%"}
            borderRadius={"lg"}
            overflowY={"hidden"}
          >
            {loading ? (
              <Spinner
                size={"xl"}
                w={20}
                h={20}
                alignSelf={"center"}
                margin={"auto"}
              />
            ) : (
              <div className="messages">
                <ScrollableChats
                  messages={messages}
                  handleReaction={handleReaction}
                />
              </div>
            )}

            <FormControl onKeyDown={sendMessage} mt={3} isRequired>
              {isTyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}

              {/* Hidden file input for images and videos */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*,video/*"
                onChange={handleFileSelect}
              />

              <InputGroup size="md">
                {/* Media Attachment Button (Paperclip) */}
                <InputLeftElement width="3rem">
                  <IconButton
                    icon={<FaPaperclip />}
                    aria-label="Attach Media"
                    variant="ghost"
                    color="#4A5568"
                    _hover={{ color: "#2B6CB0", bg: "gray.200" }}
                    onClick={() => fileInputRef.current?.click()}
                  />
                </InputLeftElement>

                <Input
                  variant={"filled"}
                  bg={"#FFFFFF"}
                  placeholder="Type a message..."
                  pl="3.2rem"
                  pr="3.5rem"
                  borderRadius="20px"
                  boxShadow="0 1px 3px rgba(0,0,0,0.08)"
                  onChange={typingHandler}
                  value={newMessage}
                  ref={inputRef}
                />

                {/* Emoji Picker Button */}
                <InputRightElement width="3.2rem">
                  <IconButton
                    onClick={() => setShowPicker(!showPicker)}
                    variant="ghost"
                    color="#4A5568"
                    _hover={{ color: "#2B6CB0", bg: "gray.200" }}
                    icon={<FaRegSmile size={20} />}
                  />
                </InputRightElement>

                {showPicker && (
                  <Picker
                    style={{
                      position: "absolute",
                      bottom: "48px",
                      height: "400px",
                      right: window.innerWidth > 600 ? "0px" : "50%",
                      transform:
                        window.innerWidth > 600 ? "" : "translateX(50%)",
                      overflowY: "scroll",
                      zIndex: 100,
                    }}
                    onEmojiClick={handleEmojiClick}
                    autoFocusSearch={false}
                    theme="light"
                    emojiStyle="google"
                  />
                )}
              </InputGroup>
            </FormControl>
          </Box>

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
                  Send {selectedMedia.type === "video" ? "Video" : "Image"}
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
                        style={{
                          maxHeight: "360px",
                          maxWidth: "100%",
                          borderRadius: "10px",
                        }}
                      />
                    ) : (
                      <img
                        src={selectedMedia.previewUrl}
                        alt="Preview"
                        style={{
                          maxHeight: "360px",
                          maxWidth: "100%",
                          objectFit: "contain",
                          borderRadius: "10px",
                        }}
                      />
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
        </>
      ) : (
        <Box
          display={"flex"}
          alignItems={"center"}
          justifyContent={"center"}
          h={"100%"}
        >
          <Text fontSize={"2xl"} pb={3} fontFamily={"Work sans"}>
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
