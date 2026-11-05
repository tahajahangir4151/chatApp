import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  Stack,
  Text,
  useToast,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Tabs,
  TabList,
  Tab,
  Flex,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  HStack,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import {
  IoSearchOutline,
  IoCloseCircleOutline,
  IoEllipsisVertical,
  IoPin,
  IoNotificationsOffOutline,
  IoNotificationsOutline,
  IoCloseOutline,
  IoStar,
  IoTrashOutline,
  IoAdd,
} from "react-icons/io5";
import { HiOutlineUserGroup } from "react-icons/hi2";
import {
  IoCheckmarkOutline,
  IoCheckmarkDoneOutline,
  IoCheckmarkDone,
  IoTimeOutline,
} from "react-icons/io5";
import axios from "axios";
import { useChatState } from "../context/chatProvider";
import { getSender, getSenderFull } from "../config/chatLogics";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import ChatLoading from "./ChatLoading";
import UserAvatar from "./common/UserAvatar";
import { useTheme } from "../context/themeContext";
import { IChat, IUser } from "@/types/chat";
import { clearCachedMessages } from "../utils/indexedDB";
import {
  getNotificationPermission,
  requestNotificationPermission,
  playNotificationChime,
  showSystemNotification,
} from "../utils/notificationService";

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "direct", label: "Direct" },
  { id: "groups", label: "Groups" },
  { id: "unread", label: "Unread" },
  { id: "favorites", label: "Favorites" },
];

interface MyChatsProps {
  fetchAgain: boolean;
  activeNavTab?: string;
  onTabChange?: (tabId: string) => void;
}

const MyChats: React.FC<MyChatsProps> = ({ fetchAgain, activeNavTab, onTabChange }) => {
  const [loggedUser, setLoggedUser] = useState<any>();
  const [chatSearch, setChatSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [chatToDelete, setChatToDelete] = useState<IChat | null>(null);
  const cancelDeleteRef = useRef<any>();

  const { selectedChat, setSelectedChat, user, chats, setChats, notification } =
    useChatState();
  const { isDark } = useTheme();
  const userData = user?.data || user || {};
  const toast = useToast();

  useEffect(() => {
    if (!activeNavTab) return;
    if (activeNavTab === "chats") setFilterCategory("all");
    else if (activeNavTab === "contacts") setFilterCategory("direct");
    else if (activeNavTab === "groups") setFilterCategory("groups");
    else if (activeNavTab === "notifications") setFilterCategory("unread");
    else if (activeNavTab === "saved") setFilterCategory("favorites");
  }, [activeNavTab]);

  const handleFilterChange = (tabId: string) => {
    setFilterCategory(tabId);
    if (onTabChange) {
      if (tabId === "all") onTabChange("chats");
      else if (tabId === "direct") onTabChange("contacts");
      else if (tabId === "groups") onTabChange("groups");
      else if (tabId === "unread") onTabChange("notifications");
      else if (tabId === "favorites") onTabChange("saved");
    }
  };

  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("talkative_notif_banner_dismissed");
      const perm = getNotificationPermission();
      if (perm === "default" && !dismissed) {
        setShowPermissionBanner(true);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    if (res === "granted") {
      setShowPermissionBanner(false);
      playNotificationChime();
      showSystemNotification({
        title: "Desktop Notifications Activated",
        body: "You'll now receive alerts for new messages even when this window is closed or in the background.",
        icon: "/talkative-logo.png",
      });
      toast({
        title: "Desktop Notifications Enabled!",
        description: "You'll now receive system alerts for new messages like WhatsApp.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else {
      setShowPermissionBanner(false);
    }
  };

  const handleDismissBanner = () => {
    setShowPermissionBanner(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("talkative_notif_banner_dismissed", "true");
    }
  };

  const fetchChats = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userData.token}`,
        },
      };
      const { data } = await axios.get("/api/chat", config);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to load conversations",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("userInfo");
      if (stored) {
        setLoggedUser(JSON.parse(stored));
      }
    } catch (e) { }
    fetchChats();

    const handleSynced = () => {
      fetchChats();
    };
    window.addEventListener("message-synced", handleSynced);
    return () => {
      window.removeEventListener("message-synced", handleSynced);
    };
    // eslint-disable-next-line
  }, [fetchAgain]);

  const formatChatTime = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleTogglePin = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userData.token}`,
        },
      };
      const { data } = await axios.put("/api/chat/pin", { chatId }, config);
      setChats((prev) => prev.map((c) => (c._id === chatId ? data : c)));
      toast({
        title: data.pinnedBy?.includes(userData._id)
          ? "Conversation Pinned"
          : "Conversation Unpinned",
        status: "info",
        duration: 1500,
        isClosable: true,
      });
    } catch (err) {
      toast({ title: "Failed to pin chat", status: "error", duration: 1500 });
    }
  };

  const handleToggleMute = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userData.token}`,
        },
      };
      const { data } = await axios.put("/api/chat/mute", { chatId }, config);
      setChats((prev) => prev.map((c) => (c._id === chatId ? data : c)));
      toast({
        title: data.mutedBy?.includes(userData._id)
          ? "Chat Muted"
          : "Chat Unmuted",
        status: "info",
        duration: 1500,
        isClosable: true,
      });
    } catch (err) {
      toast({ title: "Failed to mute chat", status: "error", duration: 1500 });
    }
  };

  const handleToggleFavorite = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userData.token}`,
        },
      };
      const { data } = await axios.put(
        "/api/chat/favorite",
        { chatId },
        config
      );
      setChats((prev) => prev.map((c) => (c._id === chatId ? data : c)));
    } catch (err) {
      toast({
        title: "Failed to favorite chat",
        status: "error",
        duration: 1500,
      });
    }
  };

  const handleClearChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userData.token}`,
        },
      };
      await axios.delete(`/api/chat/${chatId}/clear`, config);
      await clearCachedMessages(chatId);

      setChats((prevChats) =>
        prevChats.map((c) =>
          c._id === chatId ? { ...c, latestMessage: null } : c
        )
      );

      if (selectedChat?._id === chatId) {
        setSelectedChat((prev: any) =>
          prev ? { ...prev, latestMessage: null } : prev
        );
      }

      toast({
        title: "Chat cleared",
        status: "success",
        duration: 1500,
        isClosable: true,
      });
      fetchChats();
    } catch (err) {
      toast({ title: "Failed to clear chat", status: "error", duration: 1500 });
    }
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    const chatId = chatToDelete._id;
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userData.token}`,
        },
      };
      await axios.delete(`/api/chat/${chatId}`, config);
      await clearCachedMessages(chatId);

      setChats((prevChats) => prevChats.filter((c) => c._id !== chatId));

      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
      }

      toast({
        title: "Chat deleted",
        description: "Conversation permanently removed",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      setChatToDelete(null);
    } catch (err) {
      toast({ title: "Failed to delete chat", status: "error", duration: 1500 });
      setChatToDelete(null);
    }
  };

  const processedChats: IChat[] = useMemo(() => {
    if (!chats) return [];
    let list = [...chats];

    if (chatSearch.trim()) {
      const q = chatSearch.toLowerCase();
      list = list.filter((c) => {
        const title = !c.isGroupChat
          ? getSender(loggedUser, c.users)?.toLowerCase()
          : c.chatName.toLowerCase();
        return title?.includes(q);
      });
    }

    if (filterCategory === "direct") {
      list = list.filter((c) => !c.isGroupChat);
    } else if (filterCategory === "groups") {
      list = list.filter((c) => c.isGroupChat);
    } else if (filterCategory === "favorites") {
      list = list.filter((c) => c.favorites?.includes(userData._id));
    } else if (filterCategory === "unread") {
      list = list.filter((c) =>
        notification?.some((n) => n.chat?._id === c._id)
      );
    }

    list.sort((a, b) => {
      const aPinned = a.pinnedBy?.includes(userData._id) ? 1 : 0;
      const bPinned = b.pinnedBy?.includes(userData._id) ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

    return list;
  }, [chats, chatSearch, filterCategory, loggedUser, userData._id, notification]);

  return (
    <Box
      className="glass-panel glass-conversation-panel"
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDirection="column"
      bg="white"
      w={{ base: "100%", md: "340px", lg: "380px" }}
      h="100%"
      borderRight="1px solid"
      borderColor="#E2E8F0"
      userSelect="none"
    >
      <Flex
        px={4}
        py={3}
        justify="space-between"
        align="center"
        borderBottom="1px solid"
        borderColor={isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9"}
      >
        <Text
          fontSize="20px"
          fontWeight="700"
          color={isDark ? "#F8FAFC" : "#0F172A"}
          fontFamily="Work sans, -apple-system, sans-serif"
        >
          My Chats
        </Text>

        <HStack spacing={1}>
          <GroupChatModal>
            <Button
              size="sm"
              h="34px"
              px={3.5}
              variant="unstyled"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              bg="linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)"
              color="white"
              leftIcon={<IoAdd size={18} />}
              borderRadius="10px"
              fontWeight="600"
              fontSize="xs"
              boxShadow="0 2px 10px rgba(59, 130, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)"
              transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
              _hover={{
                bg: "linear-gradient(135deg, #2563EB 0%, #6D28D9 100%)",
                boxShadow: "0 4px 16px rgba(124, 58, 237, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
                transform: "translateY(-1px)",
              }}
              _active={{
                transform: "translateY(0px)",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
              }}
            >
              New Group
            </Button>
          </GroupChatModal>
        </HStack>
      </Flex>

      <Box px={3} pt={2} pb={1}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none" color={isDark ? "#94A3B8" : "#94A3B8"}>
            <IoSearchOutline size={16} />
          </InputLeftElement>
          <Input
            placeholder="Search conversations..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            borderRadius="10px"
            bg={isDark ? "rgba(255, 255, 255, 0.08)" : "#F8FAFC"}
            borderColor={isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0"}
            color={isDark ? "#F8FAFC" : "#0F172A"}
            _focus={{
              bg: isDark ? "rgba(255, 255, 255, 0.12)" : "white",
              borderColor: "#3B82F6",
            }}
          />
          {chatSearch && (
            <InputRightElement>
              <IconButton
                size="xs"
                variant="ghost"
                icon={<IoCloseCircleOutline size={16} />}
                onClick={() => setChatSearch("")}
                aria-label="Clear search"
                color={isDark ? "#CBD5E1" : "#64748B"}
                _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9" }}
              />
            </InputRightElement>
          )}
        </InputGroup>
      </Box>

      <Box px={3} pt={1} pb={2}>
        <HStack spacing={1}>
          {FILTER_TABS.map((tab) => {
            const isActive = filterCategory === tab.id;
            return (
              <Box
                key={tab.id}
                position="relative"
                onClick={() => handleFilterChange(tab.id)}
              >
                <motion.div
                  whileTap={{ scale: 0.94 }}
                  whileHover={{
                    backgroundColor: !isActive
                      ? isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 0, 0, 0.05)"
                      : undefined,
                  }}
                  style={{
                    position: "relative",
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? "#FFFFFF"
                      : isDark
                      ? "#CBD5E1"
                      : "#475569",
                    cursor: "pointer",
                    userSelect: "none",
                    transition: "color 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeFilterPill"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 32,
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "8px",
                        background: isDark
                          ? "linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)"
                          : "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
                        boxShadow: isDark
                          ? "0 2px 10px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)"
                          : "0 1px 4px rgba(37, 99, 235, 0.25)",
                        zIndex: 1,
                      }}
                    />
                  )}

                  <span
                    style={{
                      position: "relative",
                      zIndex: 2,
                      textShadow: isActive ? "0 1px 2px rgba(0,0,0,0.3)" : undefined,
                    }}
                  >
                    {tab.label}
                  </span>
                </motion.div>
              </Box>
            );
          })}
        </HStack>
      </Box>

      {showPermissionBanner && (
        <Box
          mx={3}
          mb={2}
          p={3}
          borderRadius="12px"
          bg={isDark ? "rgba(37, 99, 235, 0.16)" : "#EFF6FF"}
          border="1px solid"
          borderColor={isDark ? "rgba(96, 165, 250, 0.3)" : "#BFDBFE"}
        >
          <Flex justify="space-between" align="start">
            <HStack spacing={2.5} align="start" flex={1} pr={2}>
              <Box color="#3B82F6" mt={0.5} flexShrink={0}>
                <IoNotificationsOutline size={20} />
              </Box>
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color={isDark ? "#F8FAFC" : "#1E3A8A"}
                >
                  Turn on Desktop Notifications
                </Text>
                <Text
                  fontSize="11px"
                  color={isDark ? "#CBD5E1" : "#3B82F6"}
                  lineHeight="1.3"
                  mt={0.5}
                >
                  Get alerted on your desktop when new messages arrive even if the window is closed or minimized.
                </Text>
                <Button
                  size="xs"
                  mt={2}
                  colorScheme="blue"
                  borderRadius="8px"
                  fontWeight="600"
                  onClick={handleEnableNotifications}
                >
                  Turn On
                </Button>
              </Box>
            </HStack>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Dismiss banner"
              icon={<IoCloseOutline size={16} />}
              onClick={handleDismissBanner}
              color={isDark ? "#94A3B8" : "#64748B"}
              _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.1)" : "#DBEAFE" }}
            />
          </Flex>
        </Box>
      )}

      <Box
        flex="1"
        overflowY="auto"
        className="custom-scrollbar"
        px={2}
        py={1}
      >
        {processedChats ? (
          <Stack spacing="2px">
            {processedChats.length === 0 && (
              <Box py={8} textAlign="center" color="#94A3B8">
                <Text fontSize="sm">No conversations found</Text>
              </Box>
            )}

            {processedChats.map((chat) => {
              const isSelected = selectedChat?._id === chat._id;
              const currentChat =
                isSelected && selectedChat?.latestMessage
                  ? { ...chat, latestMessage: selectedChat.latestMessage }
                  : chat;
              const otherUser = !currentChat.isGroupChat
                ? (getSenderFull(loggedUser, currentChat.users) as IUser)
                : null;
              const chatTitle = !currentChat.isGroupChat
                ? getSender(loggedUser, currentChat.users)
                : currentChat.chatName;

              const isPinned = currentChat.pinnedBy?.includes(userData._id);
              const isMuted = currentChat.mutedBy?.includes(userData._id);
              const isFav = currentChat.favorites?.includes(userData._id);

              const unreadNotifs = notification?.filter(
                (n) => n.chat?._id === currentChat._id
              );
              const unreadCount = unreadNotifs?.length || 0;

              const lastMsg = currentChat.latestMessage;
              const lastMsgSenderId = lastMsg?.sender?._id || lastMsg?.sender;
              const isLastMsgMine = lastMsgSenderId === userData._id;

              return (
                <Box
                  key={chat._id}
                  className={`conversation-item ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    setSelectedChat(chat);
                  }}
                  role="group"
                >
                  <Box mr={3}>
                    <UserAvatar
                      name={chatTitle}
                      src={chat.isGroupChat ? "" : otherUser?.pic}
                      size="md"
                      status={(otherUser as any)?.status || "online"}
                      showStatus={!chat.isGroupChat}
                    />
                  </Box>

                  <Box flex="1" minW={0}>
                    <Flex justify="space-between" align="center" mb="2px">
                      <HStack spacing={1.5} maxW="70%">
                        <Text
                          fontSize="sm"
                          fontWeight={unreadCount > 0 ? "700" : "600"}
                          color={isDark ? "#F8FAFC" : "#0F172A"}
                          noOfLines={1}
                        >
                          {chatTitle}
                        </Text>
                        {chat.isGroupChat && (
                          <HiOutlineUserGroup size={14} color="#64748B" />
                        )}
                        {isFav && <IoStar size={12} color="#F59E0B" />}
                      </HStack>

                      <Text
                        fontSize="11px"
                        color={unreadCount > 0 ? "#2563EB" : "#94A3B8"}
                        fontWeight={unreadCount > 0 ? "600" : "normal"}
                      >
                        {formatChatTime(
                          lastMsg?.createdAt || chat.updatedAt
                        )}
                      </Text>
                    </Flex>

                    <Flex justify="space-between" align="center">
                      <HStack spacing={1} maxW="80%" minW={0}>
                        {isLastMsgMine && (
                          <Box as="span" display="inline-flex">
                            {lastMsg?.status === "pending" ||
                              lastMsg?.isPending ||
                              (typeof lastMsg?._id === "string" &&
                                lastMsg?._id.startsWith("temp_")) ? (
                              <IoTimeOutline size={14} color="#8696A0" />
                            ) : lastMsg?.status === "seen" ? (
                              <IoCheckmarkDone size={14} color="#34B7F1" />
                            ) : lastMsg?.status === "delivered" ? (
                              <IoCheckmarkDoneOutline
                                size={14}
                                color="#8696A0"
                              />
                            ) : (
                              <IoCheckmarkOutline size={14} color="#8696A0" />
                            )}
                          </Box>
                        )}

                        <Text
                          fontSize="xs"
                          color={unreadCount > 0 ? "#1E293B" : "#64748B"}
                          fontWeight={unreadCount > 0 ? "600" : "normal"}
                          noOfLines={1}
                        >
                          {lastMsg ? (
                            <>
                              {lastMsg.mediaType === "image" && "📷 Photo"}
                              {lastMsg.mediaType === "video" && "🎥 Video"}
                              {lastMsg.mediaType === "audio" && "🎵 Audio"}
                              {lastMsg.mediaType === "file" && "📄 Document"}
                              {lastMsg.content &&
                                (lastMsg.mediaType !== "text"
                                  ? ` • ${lastMsg.content}`
                                  : lastMsg.content)}
                            </>
                          ) : (
                            <span style={{ fontStyle: "italic", color: "#94A3B8" }}>
                              No messages yet
                            </span>
                          )}
                        </Text>
                      </HStack>

                      <HStack spacing={1.5}>
                        {isMuted && (
                          <IoNotificationsOffOutline
                            size={14}
                            color="#94A3B8"
                          />
                        )}
                        {isPinned && <IoPin size={13} color="#2563EB" />}
                        {unreadCount > 0 && (
                          <Badge
                            bg="#2563EB"
                            color="white"
                            borderRadius="full"
                            fontSize="10px"
                            px="6px"
                            py="1px"
                          >
                            {unreadCount}
                          </Badge>
                        )}

                        <Menu isLazy>
                          <MenuButton
                            as={IconButton}
                            size="xs"
                            variant="ghost"
                            color="#94A3B8"
                            opacity={0}
                            _groupHover={{ opacity: 1 }}
                            icon={<IoEllipsisVertical size={14} />}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Conversation options"
                          />
                          <MenuList
                            borderRadius="12px"
                            p={1}
                            shadow="lg"
                            minW="160px"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MenuItem
                              fontSize="xs"
                              borderRadius="6px"
                              icon={<IoPin size={14} />}
                              onClick={(e) => handleTogglePin(chat._id, e)}
                            >
                              {isPinned ? "Unpin Chat" : "Pin Chat"}
                            </MenuItem>
                            <MenuItem
                              fontSize="xs"
                              borderRadius="6px"
                              icon={<IoNotificationsOffOutline size={14} />}
                              onClick={(e) => handleToggleMute(chat._id, e)}
                            >
                              {isMuted ? "Unmute Notifications" : "Mute Notifications"}
                            </MenuItem>
                            <MenuItem
                              fontSize="xs"
                              borderRadius="6px"
                              icon={<IoStar size={14} />}
                              onClick={(e) => handleToggleFavorite(chat._id, e)}
                            >
                              {isFav ? "Remove Favorite" : "Add to Favorites"}
                            </MenuItem>
                            <MenuItem
                              fontSize="xs"
                              borderRadius="6px"
                              color="#F59E0B"
                              icon={<IoTrashOutline size={14} />}
                              onClick={(e) => handleClearChat(chat._id, e)}
                            >
                              Clear Messages
                            </MenuItem>
                            <MenuItem
                              fontSize="xs"
                              borderRadius="6px"
                              color="#EF4444"
                              icon={<IoCloseCircleOutline size={14} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setChatToDelete(chat);
                              }}
                            >
                              Delete Chat
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </HStack>
                    </Flex>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <ChatLoading />
        )}
      </Box>

      {/* Delete Chat Confirmation Alert */}
      <AlertDialog
        isOpen={Boolean(chatToDelete)}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => setChatToDelete(null)}
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
              Are you sure you want to delete this conversation? This will permanently remove the chat and all its messages.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button
                ref={cancelDeleteRef}
                onClick={() => setChatToDelete(null)}
                size="sm"
                borderRadius="8px"
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteChat}
                size="sm"
                borderRadius="8px"
              >
                Delete Chat
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default MyChats;

