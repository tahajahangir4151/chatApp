import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Flex,
  Input,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import {
  IoSend,
  IoAttach,
  IoHappyOutline,
  IoClose,
  IoImageOutline,
  IoVideocamOutline,
  IoDocumentTextOutline,
  IoMicOutline,
  IoMusicalNotesOutline,
} from "react-icons/io5";
import Picker from "emoji-picker-react";
import "../styles.css";
import VoiceRecorder from "./VoiceRecorder";

const ChatInput = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  onTyping,
  replyingTo,
  onCancelReply,
  onSelectFile,
  onSendVoiceNote,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleEmojiClick = (emojiData) => {
    if (emojiData && emojiData.emoji) {
      setNewMessage((prev) => (prev || "") + emojiData.emoji);
    }
    setShowPicker(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const triggerFileInput = (acceptType) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  return (
    <Box position="relative" w="100%" bg="white" className="chat-input-bar">
      {/* Hidden Master File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onSelectFile(e.target.files[0]);
          }
        }}
      />

      {/* Docked Reply Preview Bar (WhatsApp/Telegram style) */}
      {replyingTo && (
        <div className="reply-preview-dock">
          <Box minW={0} flex="1">
            <Text fontSize="xs" fontWeight="700" color="#2563EB">
              Replying to {replyingTo.sender?.name || "User"}
            </Text>
            <Text fontSize="xs" color="#64748B" noOfLines={1}>
              {replyingTo.mediaType === "image" && "📷 Photo"}
              {replyingTo.mediaType === "video" && "🎥 Video"}
              {replyingTo.mediaType === "audio" && "🎵 Audio"}
              {replyingTo.mediaType === "file" && "📄 File"}
              {replyingTo.content
                ? ` ${replyingTo.content}`
                : !replyingTo.mediaType
                ? "Message"
                : ""}
            </Text>
          </Box>
          <IconButton
            size="xs"
            variant="ghost"
            icon={<IoClose size={16} />}
            onClick={onCancelReply}
            aria-label="Cancel reply"
            color="#64748B"
          />
        </div>
      )}

      {/* When voice recording is active: WhatsApp-style live recording bar */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSendAudio={(audioFile, dur) => {
            setIsRecordingVoice(false);
            if (onSendVoiceNote) {
              onSendVoiceNote(audioFile, dur);
            }
          }}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        /* Main Input Control Bar */
        <Flex align="center" px={3} py={2} gap={2}>
          {/* Attachment Picker Menu */}
          <Menu isLazy>
            <Tooltip label="Attach media or file" hasArrow placement="top">
              <MenuButton
                as={IconButton}
                size="sm"
                variant="ghost"
                color="#64748B"
                _hover={{ color: "#2563EB", bg: "#F1F5F9" }}
                icon={<IoAttach size={22} />}
                aria-label="Attach"
                borderRadius="full"
              />
            </Tooltip>
            <MenuList borderRadius="14px" p={1.5} shadow="xl" minW="180px">
              <MenuItem
                icon={<IoImageOutline size={18} color="#3B82F6" />}
                borderRadius="8px"
                fontSize="sm"
                onClick={() => triggerFileInput("image/*")}
              >
                Photos & Images
              </MenuItem>
              <MenuItem
                icon={<IoVideocamOutline size={18} color="#8B5CF6" />}
                borderRadius="8px"
                fontSize="sm"
                onClick={() => triggerFileInput("video/*")}
              >
                Videos
              </MenuItem>
              <MenuItem
                icon={<IoMusicalNotesOutline size={18} color="#10B981" />}
                borderRadius="8px"
                fontSize="sm"
                onClick={() => triggerFileInput("audio/*")}
              >
                Audio & Voice Notes
              </MenuItem>
              <MenuItem
                icon={<IoDocumentTextOutline size={18} color="#F59E0B" />}
                borderRadius="8px"
                fontSize="sm"
                onClick={() =>
                  triggerFileInput(".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx")
                }
              >
                Documents & Files
              </MenuItem>
            </MenuList>
          </Menu>

          {/* Emoji Picker Button */}
          <Tooltip label="Emoji" hasArrow placement="top">
            <IconButton
              size="sm"
              variant="ghost"
              color="#64748B"
              _hover={{ color: "#2563EB", bg: "#F1F5F9" }}
              icon={<IoHappyOutline size={22} />}
              onClick={() => setShowPicker(!showPicker)}
              aria-label="Emoji picker"
              borderRadius="full"
            />
          </Tooltip>

          {/* Text Input Field */}
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={onTyping}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            borderRadius="20px"
            bg="#F8FAFC"
            borderColor="#E2E8F0"
            fontSize="14px"
            _focus={{ bg: "white", borderColor: "#3B82F6" }}
          />

          {/* Voice Message Mic button (when input empty) */}
          {!newMessage.trim() && (
            <Tooltip label="Record Voice Message" hasArrow placement="top">
              <IconButton
                size="sm"
                variant="ghost"
                color="#64748B"
                _hover={{ color: "#2563EB", bg: "#EFF6FF" }}
                icon={<IoMicOutline size={22} />}
                onClick={() => setIsRecordingVoice(true)}
                aria-label="Record voice note"
                borderRadius="full"
              />
            </Tooltip>
          )}

          {/* Send Button */}
          <IconButton
            size="sm"
            colorScheme="blue"
            borderRadius="full"
            icon={<IoSend size={16} />}
            onClick={onSendMessage}
            isDisabled={!newMessage.trim()}
            aria-label="Send message"
          />
        </Flex>
      )}

      {/* Emoji Picker Popup */}
      {showPicker && (
        <Box
          position="absolute"
          bottom="56px"
          left="20px"
          zIndex={100}
          boxShadow="0 10px 25px rgba(0,0,0,0.15)"
          borderRadius="12px"
          overflow="hidden"
        >
          <Picker
            onEmojiClick={handleEmojiClick}
            theme="light"
            width={320}
            height={380}
          />
        </Box>
      )}
    </Box>
  );
};

export default ChatInput;
