import React, { useState } from "react";
import {
  Box,
  Flex,
  Text,
  IconButton,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
} from "@chakra-ui/react";
import {
  IoSearchOutline,
  IoCallOutline,
  IoVideocamOutline,
  IoEllipsisVertical,
  IoArrowBack,
  IoInformationCircleOutline,
  IoTrashOutline,
} from "react-icons/io5";
import { useChatState } from "../../context/chatProvider";
import { getSender, getSenderFull } from "../../config/chatLogics";
import UserAvatar from "../common/UserAvatar";
import CallModal from "../modals/CallModal";
import UpdateGroupChatModal from "../miscellaneous/UpdateGroupChatModal";

const ChatHeader = ({
  chat,
  isTyping,
  onToggleInfo,
  onSearchInChat,
  onClearChat,
  fetchAgain,
  setFetchAgain,
  fetchMessages,
}) => {
  const { user, setSelectedChat } = useChatState();
  const loggedUser = user?.data || user;

  const [callType, setCallType] = useState("voice");
  const {
    isOpen: isCallOpen,
    onOpen: onCallOpen,
    onClose: onCallClose,
  } = useDisclosure();

  if (!chat) return null;

  const isGroup = chat.isGroupChat;
  const otherUser = !isGroup ? getSenderFull(loggedUser, chat.users) : null;
  const chatTitle = !isGroup
    ? getSender(loggedUser, chat.users)
    : chat.chatName;

  const handleStartCall = (type) => {
    setCallType(type);
    onCallOpen();
  };

  return (
    <>
      <Flex
        align="center"
        justify="space-between"
        px={{ base: 2, md: 4 }}
        py={2.5}
        bg="white"
        borderBottom="1px solid"
        borderColor="#E2E8F0"
        h="62px"
        userSelect="none"
        zIndex={10}
      >
        {/* Left: Mobile Back Button + Avatar + Title & Subtitle (Clickable to open Info Panel) */}
        <Flex align="center" gap={2} cursor="pointer" minW={0} flex="1">
          {/* Mobile Back Button */}
          <IconButton
            display={{ base: "flex", md: "none" }}
            size="sm"
            variant="ghost"
            icon={<IoArrowBack size={20} />}
            onClick={() => setSelectedChat("")}
            aria-label="Back to conversations"
            mr={1}
          />

          <Box onClick={onToggleInfo}>
            <UserAvatar
              name={chatTitle}
              src={isGroup ? "" : otherUser?.pic}
              size="md"
              status={otherUser?.status || "online"}
              showStatus={!isGroup}
              isTyping={isTyping}
            />
          </Box>

          <Box onClick={onToggleInfo} minW={0} flex="1">
            <Text
              fontSize="15px"
              fontWeight="700"
              color="#0F172A"
              noOfLines={1}
              lineHeight="1.2"
              _hover={{ color: "#2563EB" }}
              transition="color 0.15s ease"
            >
              {chatTitle}
            </Text>

            <Text fontSize="12px" color="#64748B" noOfLines={1} mt="1px">
              {isTyping ? (
                <Text as="span" color="#2563EB" fontWeight="600">
                  typing...
                </Text>
              ) : isGroup ? (
                `${chat.users?.length || 0} members`
              ) : otherUser?.status === "online" ? (
                <Text as="span" color="#10B981" fontWeight="500">
                  Online
                </Text>
              ) : otherUser?.status === "away" ? (
                <Text as="span" color="#F59E0B" fontWeight="500">
                  Away
                </Text>
              ) : (
                "Last seen recently"
              )}
            </Text>
          </Box>
        </Flex>

        {/* Right Action Icons */}
        <HStack spacing={1}>
          {/* Search in chat */}
          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
            icon={<IoSearchOutline size={18} />}
            onClick={onSearchInChat}
            aria-label="Search messages"
          />

          {/* Voice Call */}
          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
            icon={<IoCallOutline size={18} />}
            onClick={() => handleStartCall("voice")}
            aria-label="Voice call"
          />

          {/* Video Call */}
          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
            icon={<IoVideocamOutline size={20} />}
            onClick={() => handleStartCall("video")}
            aria-label="Video call"
          />

          {/* Info Panel Toggle */}
          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
            icon={<IoInformationCircleOutline size={20} />}
            onClick={onToggleInfo}
            aria-label="Chat details"
          />

          {/* More Options Menu */}
          <Menu isLazy>
            <MenuButton
              as={IconButton}
              size="sm"
              variant="ghost"
              color="#64748B"
              _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
              icon={<IoEllipsisVertical size={18} />}
              aria-label="More options"
            />
            <MenuList borderRadius="14px" p={1.5} shadow="xl" minW="180px">
              <MenuItem
                icon={<IoInformationCircleOutline size={16} />}
                borderRadius="8px"
                onClick={onToggleInfo}
              >
                View Details
              </MenuItem>

              {isGroup && (
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  fetchMessages={fetchMessages}
                />
              )}

              <MenuItem
                icon={<IoTrashOutline size={16} />}
                borderRadius="8px"
                color="#EF4444"
                _hover={{ bg: "#FEE2E2", color: "#B91C1C" }}
                onClick={onClearChat}
              >
                Clear Messages
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Voice / Video Call Modal */}
      <CallModal
        isOpen={isCallOpen}
        onClose={onCallClose}
        callType={callType}
        contact={{
          name: chatTitle,
          pic: isGroup ? "" : otherUser?.pic,
        }}
      />
    </>
  );
};

export default ChatHeader;
