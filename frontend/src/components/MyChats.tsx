import React, { useEffect, useState, useMemo } from "react";
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
} from "@chakra-ui/react";
import {
  IoSearchOutline,
  IoCloseCircleOutline,
  IoEllipsisVertical,
  IoPin,
  IoNotificationsOffOutline,
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

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
  { id: "favorites", label: "Favorites" },
];

interface MyChatsProps {
  fetchAgain: boolean;
}

const MyChats: React.FC<MyChatsProps> = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState<any>();
  const [chatSearch, setChatSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { selectedChat, setSelectedChat, user, chats, setChats, notification } =
    useChatState();
  const { isDark } = useTheme();
  const userData = user?.data || user || {};
  const toast = useToast();

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

    if (filterCategory === "groups") {
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
              variant="solid"
              colorScheme="blue"
              leftIcon={<IoAdd size={18} />}
              borderRadius="10px"
              fontWeight="600"
              fontSize="xs"
              boxShadow="0 2px 6px rgba(37, 99, 235, 0.25)"
              _hover={{
                bg: "#1D4ED8",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
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
                onClick={() => setFilterCategory(tab.id)}
              >
                <motion.div
                  whileTap={{ scale: 0.94 }}
                  whileHover={{
                    backgroundColor: !isActive
                      ? isDark
                        ? "rgba(255, 255, 255, 0.06)"
                        : "rgba(0, 0, 0, 0.04)"
                      : undefined,
                  }}
                  style={{
                    position: "relative",
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? isDark
                        ? "#FFFFFF"
                        : "#2563EB"
                      : isDark
                      ? "#94A3B8"
                      : "#64748B",
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
                        backgroundColor: isDark
                          ? "rgba(37, 99, 235, 0.45)"
                          : "#EFF6FF",
                        boxShadow: isDark
                          ? "0 2px 8px rgba(37, 99, 235, 0.35), inset 0 0 0 1px rgba(96, 165, 250, 0.3)"
                          : "0 1px 3px rgba(37, 99, 235, 0.1), inset 0 0 0 1px rgba(37, 99, 235, 0.15)",
                        zIndex: 1,
                      }}
                    />
                  )}

                  <span style={{ position: "relative", zIndex: 2 }}>
                    {tab.label}
                  </span>
                </motion.div>
              </Box>
            );
          })}
        </HStack>
      </Box>

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
              const otherUser = !chat.isGroupChat
                ? (getSenderFull(loggedUser, chat.users) as IUser)
                : null;
              const chatTitle = !chat.isGroupChat
                ? getSender(loggedUser, chat.users)
                : chat.chatName;

              const isPinned = chat.pinnedBy?.includes(userData._id);
              const isMuted = chat.mutedBy?.includes(userData._id);
              const isFav = chat.favorites?.includes(userData._id);

              const unreadNotifs = notification?.filter(
                (n) => n.chat?._id === chat._id
              );
              const unreadCount = unreadNotifs?.length || 0;

              const lastMsg = chat.latestMessage;
              const isLastMsgMine = lastMsg?.sender?._id === userData._id;

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
                              color="#EF4444"
                              icon={<IoTrashOutline size={14} />}
                              onClick={(e) => handleClearChat(chat._id, e)}
                            >
                              Clear Messages
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
    </Box>
  );
};

export default MyChats;

