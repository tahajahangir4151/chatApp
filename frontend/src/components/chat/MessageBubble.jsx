import React, { useState, useRef } from "react";
import {
  Box,
  Flex,
  Text,
  HStack,
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  useToast,
} from "@chakra-ui/react";
import {
  IoCheckmarkOutline,
  IoCheckmarkDoneOutline,
  IoCheckmarkDone,
  IoArrowUndoOutline,
  IoCopyOutline,
  IoStarOutline,
  IoStar,
  IoTrashOutline,
  IoHappyOutline,
  IoPlay,
  IoPause,
  IoDocumentTextOutline,
  IoDownloadOutline,
} from "react-icons/io5";
import UserAvatar from "../common/UserAvatar";
import "../styles.css";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "🎉"];

const MessageBubble = ({
  message,
  currentUserId,
  isGroupChat,
  onReact,
  onReply,
  onStar,
  onDelete,
  onImageClick,
  onJumpToMessage,
}) => {
  const m = message;
  const isMe = m.sender?._id === currentUserId;

  const [isHovered, setIsHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef(null);
  const toast = useToast();

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Group reactions: { "👍": [u1, u2], "❤️": [u3] }
  const reactionGroups = {};
  (m.reactions || []).forEach((r) => {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
    reactionGroups[r.emoji].push(r.user);
  });
  const emojiKeys = Object.keys(reactionGroups);
  const totalReactions = m.reactions?.length || 0;
  const hasUserReacted = m.reactions?.some(
    (r) => (r.user?._id || r.user) === currentUserId
  );

  const handleCopyText = () => {
    if (m.content) {
      navigator.clipboard.writeText(m.content);
      toast({ title: "Copied to clipboard", status: "info", duration: 1500 });
    }
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Status checkmark
  const renderStatusTick = () => {
    if (!isMe) return null;

    const isSeen =
      m.status === "seen" ||
      (m.readBy &&
        m.readBy.some(
          (u) => (typeof u === "string" ? u : u?._id) !== currentUserId
        ));

    const isDelivered =
      m.status === "delivered" ||
      (m.deliveredTo &&
        m.deliveredTo.some(
          (u) => (typeof u === "string" ? u : u?._id) !== currentUserId
        ));

    if (isSeen) {
      return (
        <span className="status-tick" title="Read">
          <IoCheckmarkDone size={15} color="#34B7F1" />
        </span>
      );
    } else if (isDelivered) {
      return (
        <span className="status-tick" title="Delivered">
          <IoCheckmarkDoneOutline size={15} color="#8696A0" />
        </span>
      );
    } else {
      return (
        <span className="status-tick" title="Sent">
          <IoCheckmarkOutline size={15} color="#8696A0" />
        </span>
      );
    }
  };

  return (
    <div
      id={`message-${m._id}`}
      className="message-wrapper"
      style={{ justifyContent: isMe ? "flex-end" : "flex-start" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!showPicker) setIsHovered(false);
      }}
    >
      {/* Avatar for incoming messages */}
      {!isMe && (
        <Box mr={2} mb="4px">
          <UserAvatar
            name={m.sender?.name || "User"}
            src={m.sender?.pic}
            size="sm"
            showStatus={false}
          />
        </Box>
      )}

      {/* Hover Action Toolbar */}
      {isHovered && (
        <div
          className="message-hover-toolbar"
          style={{
            right: isMe ? "10px" : "auto",
            left: !isMe ? "36px" : "auto",
          }}
        >
          {/* Reaction Popover */}
          <Popover
            isOpen={showPicker}
            onClose={() => {
              setShowPicker(false);
              setIsHovered(false);
            }}
            placement="top"
          >
            <PopoverTrigger>
              <button
                type="button"
                className="toolbar-action-btn"
                title="React"
                onClick={() => setShowPicker(!showPicker)}
              >
                <IoHappyOutline />
              </button>
            </PopoverTrigger>
            <PopoverContent w="auto" p={1} borderRadius="20px" shadow="xl">
              <PopoverBody p={1}>
                <HStack spacing={1}>
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="reaction-emoji-btn"
                      onClick={() => {
                        onReact(m._id, emoji);
                        setShowPicker(false);
                        setIsHovered(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </HStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>

          {/* Reply Button */}
          <button
            type="button"
            className="toolbar-action-btn"
            title="Reply"
            onClick={() => onReply(m)}
          >
            <IoArrowUndoOutline />
          </button>

          {/* Copy Text */}
          {m.content && (
            <button
              type="button"
              className="toolbar-action-btn"
              title="Copy"
              onClick={handleCopyText}
            >
              <IoCopyOutline />
            </button>
          )}

          {/* Star Button */}
          <button
            type="button"
            className="toolbar-action-btn"
            title="Star message"
            onClick={() => onStar(m._id)}
          >
            {m.isStarred ? (
              <IoStar color="#F59E0B" />
            ) : (
              <IoStarOutline />
            )}
          </button>

          {/* Delete Button (if sender) */}
          {isMe && (
            <button
              type="button"
              className="toolbar-action-btn"
              title="Delete"
              style={{ color: "#EF4444" }}
              onClick={() => onDelete(m._id)}
            >
              <IoTrashOutline />
            </button>
          )}
        </div>
      )}

      {/* Main Message Bubble */}
      <Box
        position="relative"
        bg={isMe ? "#DCFCE7" : "#FFFFFF"}
        color={isMe ? "#14532D" : "#0F172A"}
        border={isMe ? "none" : "1px solid #E2E8F0"}
        borderRadius={
          isMe
            ? "18px 18px 4px 18px"
            : "18px 18px 18px 4px"
        }
        px={3.5}
        py={2}
        maxW={{ base: "85%", md: "70%" }}
        boxShadow="0 1px 2px rgba(0,0,0,0.06)"
        mb={totalReactions > 0 ? "14px" : "2px"}
      >
        {/* Sender Name in Group Chats */}
        {isGroupChat && !isMe && (
          <Text fontSize="xs" fontWeight="700" color="#2563EB" mb="2px">
            {m.sender?.name}
          </Text>
        )}

        {/* Quoted Reply Banner (WhatsApp / Telegram style) */}
        {m.replyTo && (
          <div
            className="quoted-reply-card"
            onClick={() => onJumpToMessage && onJumpToMessage(m.replyTo._id)}
          >
            <div className="quoted-reply-sender">
              {m.replyTo.sender?.name || "Original message"}
            </div>
            <div className="quoted-reply-content">
              {m.replyTo.mediaType === "image" && "📷 Photo"}
              {m.replyTo.mediaType === "video" && "🎥 Video"}
              {m.replyTo.mediaType === "audio" && "🎵 Audio note"}
              {m.replyTo.mediaType === "file" && "📄 Document"}
              {m.replyTo.content
                ? ` ${m.replyTo.content}`
                : !m.replyTo.mediaType
                ? "Message"
                : ""}
            </div>
          </div>
        )}

        {/* Image Attachment */}
        {m.mediaType === "image" && m.fileUrl && (
          <Box mb={m.content ? 2 : 1}>
            <img
              src={m.fileUrl}
              alt={m.fileName || "Image"}
              className="chat-media-image"
              onClick={() => onImageClick({ url: m.fileUrl, name: m.fileName })}
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

        {/* Audio Message / Voice Note */}
        {m.mediaType === "audio" && m.fileUrl && (
          <Box mb={m.content ? 2 : 1} className="chat-audio-player">
            <audio
              ref={audioRef}
              src={m.fileUrl}
              onEnded={() => setIsPlayingAudio(false)}
            />
            <button
              type="button"
              className="chat-audio-play-btn"
              onClick={toggleAudioPlay}
            >
              {isPlayingAudio ? <IoPause size={16} /> : <IoPlay size={16} />}
            </button>
            <Box flex="1">
              <Text fontSize="xs" fontWeight="600">
                Voice / Audio Note
              </Text>
              <Text fontSize="10px" color="#64748B">
                {m.fileName || "audio.mp3"}
              </Text>
            </Box>
          </Box>
        )}

        {/* Document / File Card */}
        {m.mediaType === "file" && m.fileUrl && (
          <Box mb={m.content ? 2 : 1} className="chat-file-card">
            <IoDocumentTextOutline size={28} color="#2563EB" />
            <Box flex="1" minW={0}>
              <Text fontSize="xs" fontWeight="600" noOfLines={1}>
                {m.fileName || "Document"}
              </Text>
              <Text fontSize="10px" color="#64748B">
                {m.fileSize
                  ? `${(m.fileSize / (1024 * 1024)).toFixed(1)} MB`
                  : "File"}
              </Text>
            </Box>
            <a href={m.fileUrl} download target="_blank" rel="noreferrer">
              <IconButton
                size="xs"
                variant="ghost"
                icon={<IoDownloadOutline size={16} />}
                aria-label="Download"
              />
            </a>
          </Box>
        )}

        {/* Text Content */}
        {m.content && (
          <Text
            fontSize="14px"
            lineHeight="1.45"
            wordBreak="break-word"
            whiteSpace="pre-wrap"
          >
            {m.content}
          </Text>
        )}

        {/* Bottom Meta Bar (Timestamp + Star + Status Ticks) */}
        <Flex
          justify="flex-end"
          align="center"
          gap="3px"
          mt="2px"
          opacity={0.8}
        >
          {m.isStarred && <IoStar size={10} color="#F59E0B" />}
          <Text fontSize="10px" color={isMe ? "#14532D" : "#64748B"}>
            {formatTime(m.createdAt)}
          </Text>
          {renderStatusTick()}
        </Flex>

        {/* Reaction Badges underneath message bubble */}
        {totalReactions > 0 && (
          <div
            className="message-reaction-badge-group"
            style={{
              right: isMe ? "8px" : "auto",
              left: !isMe ? "8px" : "auto",
            }}
          >
            <div
              className={`reaction-pill ${
                hasUserReacted ? "user-reacted" : ""
              }`}
            >
              <span>{emojiKeys.slice(0, 4).join("")}</span>
              {totalReactions > 1 && (
                <span style={{ fontWeight: "700", fontSize: "11px" }}>
                  {totalReactions}
                </span>
              )}
            </div>
          </div>
        )}
      </Box>
    </div>
  );
};

export default MessageBubble;
