import React, { useState, useRef } from "react";
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
} from "@chakra-ui/react";
import {
  IoSearchOutline,
  IoCallOutline,
  IoVideocamOutline,
  IoEllipsisVertical,
  IoArrowBack,
  IoInformationCircleOutline,
  IoTrashOutline,
  IoCloseCircleOutline,
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
  onDeleteChat?: () => void;
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
  onDeleteChat,
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

  const {
    isOpen: isClearAlertOpen,
    onOpen: onOpenClearAlert,
    onClose: onCloseClearAlert,
  } = useDisclosure();

  const {
    isOpen: isDeleteAlertOpen,
    onOpen: onOpenDeleteAlert,
    onClose: onCloseDeleteAlert,
  } = useDisclosure();

  const cancelClearRef = useRef<any>();
  const cancelDeleteRef = useRef<any>();

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
                color="#F59E0B"
                _hover={{ bg: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7" }}
                onClick={onOpenClearAlert}
              >
                Clear Messages
              </MenuItem>

              {onDeleteChat && (
                <MenuItem
                  icon={<IoCloseCircleOutline size={16} />}
                  borderRadius="8px"
                  color="#EF4444"
                  _hover={{ bg: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2", color: "#B91C1C" }}
                  onClick={onOpenDeleteAlert}
                >
                  Delete Chat
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Clear Messages Confirmation Alert */}
      <AlertDialog
        isOpen={isClearAlertOpen}
        leastDestructiveRef={cancelClearRef}
        onClose={onCloseClearAlert}
        isCentered
      >
        <AlertDialogOverlay bg="rgba(0,0,0,0.6)" backdropFilter="blur(6px)">
          <AlertDialogContent
            borderRadius="16px"
            bg={isDark ? "rgba(22, 16, 46, 0.95)" : "white"}
            color={isDark ? "#F8FAFC" : "#0F172A"}
            border="1px solid"
            borderColor={isDark ? "rgba(255, 255, 255, 0.14)" : "#E2E8F0"}
          >
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Clear Messages
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm" color={isDark ? "#CBD5E1" : "#475569"}>
              Are you sure you want to clear all messages in this conversation? The chat will remain in your conversation list.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelClearRef} onClick={onCloseClearAlert} size="sm" borderRadius="8px">
                Cancel
              </Button>
              <Button
                colorScheme="orange"
                onClick={() => {
                  onClearChat();
                  onCloseClearAlert();
                }}
                size="sm"
                borderRadius="8px"
              >
                Clear Messages
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Delete Chat Confirmation Alert */}
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={onCloseDeleteAlert}
        isCentered
      >
        <AlertDialogOverlay bg="rgba(0,0,0,0.6)" backdropFilter="blur(6px)">
          <AlertDialogContent
            borderRadius="16px"
            bg={isDark ? "rgba(22, 16, 46, 0.95)" : "white"}
            color={isDark ? "#F8FAFC" : "#0F172A"}
            border="1px solid"
            borderColor={isDark ? "rgba(255, 255, 255, 0.14)" : "#E2E8F0"}
          >
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Conversation
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm" color={isDark ? "#CBD5E1" : "#475569"}>
              Are you sure you want to delete this chat with <Text as="span" fontWeight="bold">{chatTitle}</Text>? This conversation and all its messages will be permanently removed.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelDeleteRef} onClick={onCloseDeleteAlert} size="sm" borderRadius="8px">
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  if (onDeleteChat) onDeleteChat();
                  onCloseDeleteAlert();
                }}
                size="sm"
                borderRadius="8px"
              >
                Delete Chat
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

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

