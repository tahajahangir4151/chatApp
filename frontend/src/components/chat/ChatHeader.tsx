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
  IoPersonAddOutline,
} from "react-icons/io5";
import { useChatState } from "../../context/chatProvider";
import { getSender, getSenderFull } from "../../config/chatLogics";
import UserAvatar from "../common/UserAvatar";
import CallModal from "../modals/CallModal";
import UpdateGroupChatModal from "../miscellaneous/UpdateGroupChatModal";
import SendInviteModal from "../modals/SendInviteModal";
import { useTheme } from "../../context/themeContext";
import { IChat, IUser } from "@/types/chat";

interface ChatHeaderProps {
  chat: IChat | null;
  isTyping: boolean;
  onToggleInfo: () => void;
  onSearchInChat: () => void;
  onClearChat: () => void;
  fetchAgain: boolean;
  setFetchAgain: React.Dispatch<React.SetStateAction<boolean>>;
  fetchMessages: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
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
  const { isDark } = useTheme();
  const loggedUser = user?.data || user;

  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const {
    isOpen: isCallOpen,
    onOpen: onCallOpen,
    onClose: onCallClose,
  } = useDisclosure();
  const {
    isOpen: isInviteOpen,
    onOpen: onInviteOpen,
    onClose: onInviteClose,
  } = useDisclosure();

  if (!chat) return null;

  const isGroup = chat.isGroupChat;
  const otherUser = !isGroup ? (getSenderFull(loggedUser, chat.users) as IUser) : null;
  const chatTitle = !isGroup
    ? getSender(loggedUser, chat.users)
    : chat.chatName;

  const handleStartCall = (type: "voice" | "video") => {
    setCallType(type);
    onCallOpen();
  };

  return (
    <>
      <Flex
        className="glass-chat-header"
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
        <Flex align="center" gap={2} cursor="pointer" minW={0} flex="1">
          <IconButton
            display={{ base: "flex", md: "none" }}
            size="sm"
            variant="ghost"
            icon={<IoArrowBack size={20} />}
            onClick={() => setSelectedChat(null)}
            aria-label="Back to conversations"
            mr={1}
          />

          <Box onClick={onToggleInfo}>
            <UserAvatar
              name={chatTitle}
              src={isGroup ? "" : otherUser?.pic}
              size="md"
              status={(otherUser as any)?.status || "online"}
              showStatus={!isGroup}
              isTyping={isTyping}
            />
          </Box>

          <Box onClick={onToggleInfo} minW={0} flex="1">
            <Text
              fontSize="15px"
              fontWeight="700"
              color={isDark ? "#F8FAFC" : "#0F172A"}
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
              ) : (otherUser as any)?.status === "online" ? (
                <Text as="span" color="#10B981" fontWeight="500">
                  Online
                </Text>
              ) : (otherUser as any)?.status === "away" ? (
                <Text as="span" color="#F59E0B" fontWeight="500">
                  Away
                </Text>
              ) : (
                "Last seen recently"
              )}
            </Text>
          </Box>
        </Flex>

        <HStack spacing={1}>
          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
            icon={<IoSearchOutline size={18} />}
            onClick={onSearchInChat}
            aria-label="Search messages"
          />

          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
            icon={<IoCallOutline size={18} />}
            onClick={() => handleStartCall("voice")}
            aria-label="Voice call"
          />

          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
            icon={<IoVideocamOutline size={20} />}
            onClick={() => handleStartCall("video")}
            aria-label="Video call"
          />

          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
            icon={<IoInformationCircleOutline size={20} />}
            onClick={onToggleInfo}
            aria-label="Chat details"
          />

          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#EFF6FF", color: "#2563EB" }}
            icon={<IoPersonAddOutline size={18} />}
            onClick={onInviteOpen}
            aria-label={isGroup ? "Invite to Group" : "Invite to Chat"}
            title={isGroup ? "Invite to this group" : "Invite friend"}
          />

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

      <CallModal
        isOpen={isCallOpen}
        onClose={onCallClose}
        callType={callType}
        contact={{
          name: chatTitle,
          pic: isGroup ? "" : otherUser?.pic,
        }}
      />

      <SendInviteModal
        isOpen={isInviteOpen}
        onClose={onInviteClose}
        defaultChat={chat}
      />
    </>
  );
};

export default ChatHeader;

