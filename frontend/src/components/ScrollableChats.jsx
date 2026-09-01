import React, { useState } from "react";
import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import {
  Box,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";
import { useChatState } from "../context/chatProvider";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/chatLogics";
import {
  IoCheckmarkOutline,
  IoCheckmarkDoneOutline,
  IoCheckmarkDone,
  IoDownloadOutline,
  IoHappyOutline,
} from "react-icons/io5";
import Picker from "emoji-picker-react";
import "./styles.css";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ScrollableChat = ({ messages, handleReaction }) => {
  const { user, selectedChat } = useChatState();
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [reactionsModalData, setReactionsModalData] = useState(null);
  const [showPickerForMessage, setShowPickerForMessage] = useState(null);

  const currentUserId = user?.data?._id;

  // Format message time (e.g. 10:45 AM)
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Group reactions by emoji: { "👍": [user1, user2], "❤️": [user3] }
  const groupReactions = (reactions = []) => {
    const groups = {};
    reactions.forEach((r) => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = [];
      }
      groups[r.emoji].push(r.user);
    });
    return groups;
  };

  // Determine tick status for sent messages
  const renderStatusTick = (m) => {
    if (m.sender?._id !== currentUserId) return null;

    // Seen by other users (in 1-on-1: readBy has > 1 or status is seen)
    const isSeen =
      m.status === "seen" ||
      (m.readBy &&
        m.readBy.some(
          (u) => (typeof u === "string" ? u : u?._id) !== currentUserId
        ));

    // Delivered to other users
    const isDelivered =
      m.status === "delivered" ||
      (m.deliveredTo &&
        m.deliveredTo.some(
          (u) => (typeof u === "string" ? u : u?._id) !== currentUserId
        ));

    if (isSeen) {
      return (
        <span className="status-tick" title="Seen">
          <IoCheckmarkDone size={16} color="#34B7F1" />
        </span>
      );
    } else if (isDelivered) {
      return (
        <span className="status-tick" title="Delivered">
          <IoCheckmarkDoneOutline size={16} color="#8696A0" />
        </span>
      );
    } else {
      return (
        <span className="status-tick" title="Sent">
          <IoCheckmarkOutline size={16} color="#8696A0" />
        </span>
      );
    }
  };

  const handleEmojiSelect = (messageId, emoji) => {
    if (handleReaction) {
      handleReaction(messageId, emoji);
    }
    setActiveMessageId(null);
    setShowPickerForMessage(null);
  };

  return (
    <>
      <ScrollableFeed>
        {messages &&
          messages.map((m, i) => {
            const isMe = m.sender?._id === currentUserId;
            const reactionGroups = groupReactions(m.reactions);
            const emojiKeys = Object.keys(reactionGroups);
            const totalReactions = m.reactions?.length || 0;
            const hasUserReacted = m.reactions?.some(
              (r) => (r.user?._id || r.user) === currentUserId
            );

            return (
              <div
                key={m._id || i}
                className="message-wrapper"
                style={{
                  justifyContent: isMe ? "flex-end" : "flex-start",
                }}
                onMouseEnter={() => setActiveMessageId(m._id)}
                onMouseLeave={() => {
                  if (showPickerForMessage !== m._id) {
                    setActiveMessageId(null);
                  }
                }}
              >
                {/* Avatar for received messages */}
                {!isMe &&
                  (isSameSender(messages, m, i, currentUserId) ||
                    isLastMessage(messages, i, currentUserId)) && (
                    <Tooltip
                      label={m.sender?.name}
                      placement="bottom-start"
                      hasArrow
                    >
                      <Avatar
                        mt="7px"
                        mr={1}
                        size="sm"
                        cursor="pointer"
                        name={m.sender?.name}
                        src={m.sender?.pic}
                      />
                    </Tooltip>
                  )}

                {/* Reaction trigger for received messages (left side) */}
                {isMe && (
                  <button
                    type="button"
                    className="reaction-trigger-btn"
                    title="React to message"
                    onClick={() =>
                      setActiveMessageId(
                        activeMessageId === m._id ? null : m._id
                      )
                    }
                  >
                    <IoHappyOutline />
                  </button>
                )}

                {/* Floating WhatsApp Quick Reaction Bar */}
                {activeMessageId === m._id && (
                  <div
                    className="floating-reaction-bar"
                    style={{
                      right: isMe ? "20px" : "auto",
                      left: !isMe ? "40px" : "auto",
                    }}
                  >
                    {QUICK_EMOJIS.map((emoji) => {
                      const userHasThisEmoji = m.reactions?.some(
                        (r) =>
                          (r.user?._id || r.user) === currentUserId &&
                          r.emoji === emoji
                      );
                      return (
                        <button
                          key={emoji}
                          type="button"
                          className="reaction-emoji-btn"
                          style={{
                            transform: userHasThisEmoji ? "scale(1.25)" : "",
                            background: userHasThisEmoji
                              ? "rgba(49, 130, 206, 0.15)"
                              : "",
                          }}
                          onClick={() => handleEmojiSelect(m._id, emoji)}
                        >
                          {emoji}
                        </button>
                      );
                    })}

                    {/* Popover for full emoji picker */}
                    <Popover
                      isOpen={showPickerForMessage === m._id}
                      onClose={() => setShowPickerForMessage(null)}
                      placement="top"
                    >
                      <PopoverTrigger>
                        <button
                          type="button"
                          className="reaction-emoji-btn"
                          title="More emojis"
                          onClick={() =>
                            setShowPickerForMessage(
                              showPickerForMessage === m._id ? null : m._id
                            )
                          }
                          style={{ fontSize: "16px", color: "#4A5568" }}
                        >
                          ➕
                        </button>
                      </PopoverTrigger>
                      <PopoverContent width="auto" p={0} border="none">
                        <PopoverBody p={0}>
                          <Picker
                            onEmojiClick={(emojiData) =>
                              handleEmojiSelect(m._id, emojiData.emoji)
                            }
                            theme="light"
                            width={300}
                            height={350}
                          />
                        </PopoverBody>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Main Message Bubble */}
                <Box
                  position="relative"
                  bg={isMe ? "#DCF8C6" : "#FFFFFF"}
                  color="#1A202C"
                  ml={
                    !isMe
                      ? isSameSenderMargin(messages, m, i, currentUserId)
                      : "auto"
                  }
                  mt={isSameUser(messages, m, i, currentUserId) ? 1 : 2}
                  mb={totalReactions > 0 ? "14px" : "2px"}
                  borderRadius={
                    isMe
                      ? "18px 18px 4px 18px"
                      : "18px 18px 18px 4px"
                  }
                  p="8px 12px"
                  maxW={{ base: "85%", md: "70%" }}
                  boxShadow="0 1px 2px rgba(0, 0, 0, 0.1)"
                  border={isMe ? "none" : "1px solid #E2E8F0"}
                >
                  {/* Sender name in group chats */}
                  {selectedChat?.isGroupChat && !isMe && (
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      color="#2B6CB0"
                      mb={1}
                    >
                      {m.sender?.name}
                    </Text>
                  )}

                  {/* Image Attachment */}
                  {m.mediaType === "image" && m.fileUrl && (
                    <Box mb={m.content ? 2 : 1}>
                      <img
                        src={m.fileUrl}
                        alt={m.fileName || "Image"}
                        className="chat-media-image"
                        onClick={() =>
                          setLightboxImage({
                            url: m.fileUrl,
                            name: m.fileName || "Image",
                          })
                        }
                      />
                    </Box>
                  )}

                  {/* Video Attachment */}
                  {m.mediaType === "video" && m.fileUrl && (
                    <Box mb={m.content ? 2 : 1}>
                      <video
                        src={m.fileUrl}
                        controls
                        preload="metadata"
                        className="chat-media-video"
                      />
                    </Box>
                  )}

                  {/* Message Text Content */}
                  {m.content && (
                    <Text
                      fontSize="14px"
                      lineHeight="1.4"
                      wordBreak="break-word"
                      whiteSpace="pre-wrap"
                    >
                      {m.content}
                    </Text>
                  )}

                  {/* Bottom Meta Bar (Timestamp + Status Ticks) */}
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                    gap="2px"
                    mt="2px"
                    pt="1px"
                    opacity={0.75}
                  >
                    <Text fontSize="10px" color="#718096" userSelect="none">
                      {formatTime(m.createdAt)}
                    </Text>
                    {renderStatusTick(m)}
                  </Box>

                  {/* Reactions Pill Badges (WhatsApp Style) */}
                  {totalReactions > 0 && (
                    <div
                      className="message-reaction-badge-group"
                      style={{
                        right: isMe ? "8px" : "auto",
                        left: !isMe ? "8px" : "auto",
                      }}
                      onClick={() =>
                        setReactionsModalData({
                          reactions: m.reactions,
                          reactionGroups,
                        })
                      }
                      title="View reactions"
                    >
                      <div
                        className={`reaction-pill ${
                          hasUserReacted ? "user-reacted" : ""
                        }`}
                      >
                        <span>{emojiKeys.slice(0, 3).join("")}</span>
                        {totalReactions > 1 && (
                          <span style={{ fontWeight: 600, fontSize: "11px" }}>
                            {totalReactions}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Box>

                {/* Reaction trigger for received messages (right side) */}
                {!isMe && (
                  <button
                    type="button"
                    className="reaction-trigger-btn"
                    title="React to message"
                    onClick={() =>
                      setActiveMessageId(
                        activeMessageId === m._id ? null : m._id
                      )
                    }
                  >
                    <IoHappyOutline />
                  </button>
                )}
              </div>
            );
          })}
      </ScrollableFeed>

      {/* Lightbox Modal for Images */}
      {lightboxImage && (
        <Modal
          isOpen={Boolean(lightboxImage)}
          onClose={() => setLightboxImage(null)}
          size="2xl"
          isCentered
        >
          <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(6px)" />
          <ModalContent bg="transparent" boxShadow="none">
            <ModalCloseButton color="white" zIndex={10} />
            <ModalBody p={0} textAlign="center">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                style={{
                  maxHeight: "80vh",
                  maxWidth: "100%",
                  margin: "auto",
                  borderRadius: "12px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                }}
              />
              <Box
                mt={3}
                display="flex"
                justifyContent="center"
                alignItems="center"
                gap={3}
              >
                <a
                  href={lightboxImage.url}
                  download={lightboxImage.name}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    leftIcon={<IoDownloadOutline size={18} />}
                    colorScheme="teal"
                    size="sm"
                  >
                    Download Image
                  </Button>
                </a>
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {/* Reactions Details Modal (WhatsApp style) */}
      {reactionsModalData && (
        <Modal
          isOpen={Boolean(reactionsModalData)}
          onClose={() => setReactionsModalData(null)}
          isCentered
          size="sm"
        >
          <ModalOverlay backdropFilter="blur(3px)" />
          <ModalContent borderRadius="16px">
            <ModalHeader pb={1} fontSize="lg">
              Reactions
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={4}>
              <Tabs variant="soft-rounded" colorScheme="blue">
                <TabList pb={2} overflowX="auto">
                  <Tab fontSize="sm">
                    All {reactionsModalData.reactions?.length}
                  </Tab>
                  {Object.keys(reactionsModalData.reactionGroups).map(
                    (emoji) => (
                      <Tab key={emoji} fontSize="sm">
                        {emoji}{" "}
                        {reactionsModalData.reactionGroups[emoji].length}
                      </Tab>
                    )
                  )}
                </TabList>
                <TabPanels maxH="280px" overflowY="auto">
                  <TabPanel p={1}>
                    {reactionsModalData.reactions?.map((r, idx) => {
                      const reactor = r.user || {};
                      return (
                        <Box
                          key={r._id || idx}
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          p={2}
                          borderRadius="8px"
                          _hover={{ bg: "gray.50" }}
                        >
                          <Box display="flex" alignItems="center" gap={3}>
                            <Avatar
                              size="sm"
                              name={reactor.name || "User"}
                              src={reactor.pic}
                            />
                            <Text fontWeight="medium" fontSize="sm">
                              {reactor._id === currentUserId
                                ? "You"
                                : reactor.name || "User"}
                            </Text>
                          </Box>
                          <Text fontSize="xl">{r.emoji}</Text>
                        </Box>
                      );
                    })}
                  </TabPanel>
                  {Object.keys(reactionsModalData.reactionGroups).map(
                    (emoji) => (
                      <TabPanel key={emoji} p={1}>
                        {reactionsModalData.reactionGroups[emoji].map(
                          (reactor, idx) => (
                            <Box
                              key={reactor?._id || idx}
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              p={2}
                              borderRadius="8px"
                              _hover={{ bg: "gray.50" }}
                            >
                              <Box display="flex" alignItems="center" gap={3}>
                                <Avatar
                                  size="sm"
                                  name={reactor?.name || "User"}
                                  src={reactor?.pic}
                                />
                                <Text fontWeight="medium" fontSize="sm">
                                  {reactor?._id === currentUserId
                                    ? "You"
                                    : reactor?.name || "User"}
                                </Text>
                              </Box>
                              <Text fontSize="xl">{emoji}</Text>
                            </Box>
                          )
                        )}
                      </TabPanel>
                    )
                  )}
                </TabPanels>
              </Tabs>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default ScrollableChat;
