import React, { useEffect, useState, useMemo } from "react";
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
} from "react-icons/io5";
import axios from "axios";
import { useChatState } from "../context/chatProvider";
import { getSender, getSenderFull } from "../config/chatLogics";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import ChatLoading from "./ChatLoading";
import UserAvatar from "./common/UserAvatar";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const [chatSearch, setChatSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all"); // "all" | "unread" | "groups" | "favorites"

  const { selectedChat, setSelectedChat, user, chats, setChats, notification } =
    useChatState();
  const toast = useToast();

  const fetchChats = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.data.token}`,
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
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
    // eslint-disable-next-line
  }, [fetchAgain]);

  // Format message time
  const formatChatTime = (dateStr) => {
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

  // Toggle Pin
  const handleTogglePin = async (chatId, e) => {
    e.stopPropagation();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.data.token}`,
        },
      };
      const { data } = await axios.put("/api/chat/pin", { chatId }, config);
      setChats((prev) => prev.map((c) => (c._id === chatId ? data : c)));
      toast({
        title: data.pinnedBy?.includes(user.data._id)
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

  // Toggle Mute
  const handleToggleMute = async (chatId, e) => {
    e.stopPropagation();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.data.token}`,
        },
      };
      const { data } = await axios.put("/api/chat/mute", { chatId }, config);
      setChats((prev) => prev.map((c) => (c._id === chatId ? data : c)));
      toast({
        title: data.mutedBy?.includes(user.data._id)
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

  // Toggle Favorite
  const handleToggleFavorite = async (chatId, e) => {
    e.stopPropagation();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.data.token}`,
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

  // Clear Chat
  const handleClearChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.data.token}`,
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

  // Filtered & Sorted Chats
  const processedChats = useMemo(() => {
    if (!chats) return [];
    let list = [...chats];

    // Filter by search
    if (chatSearch.trim()) {
      const q = chatSearch.toLowerCase();
      list = list.filter((c) => {
        const title = !c.isGroupChat
          ? getSender(loggedUser, c.users)?.toLowerCase()
          : c.chatName.toLowerCase();
        return title?.includes(q);
      });
    }

    // Filter by category
    if (filterCategory === "groups") {
      list = list.filter((c) => c.isGroupChat);
    } else if (filterCategory === "favorites") {
      list = list.filter((c) => c.favorites?.includes(user?.data?._id));
    } else if (filterCategory === "unread") {
      list = list.filter((c) =>
        notification?.some((n) => n.chat?._id === c._id)
      );
    }

    // Sort: Pinned chats first, then by updatedAt
    list.sort((a, b) => {
      const aPinned = a.pinnedBy?.includes(user?.data?._id) ? 1 : 0;
      const bPinned = b.pinnedBy?.includes(user?.data?._id) ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    return list;
  }, [chats, chatSearch, filterCategory, loggedUser, user, notification]);

  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDirection="column"
      bg="white"
      w={{ base: "100%", md: "340px", lg: "380px" }}
      h="100%"
      borderRight="1px solid"
      borderColor="#E2E8F0"
      userSelect="none"
    >
      {/* Header with Title and New Group / New Chat */}
      <Flex
        px={4}
        pt={3}
        pb={2}
        justify="space-between"
        align="center"
        borderBottom="1px solid #F1F5F9"
      >
        <Text
          fontSize="20px"
          fontWeight="700"
          color="#0F172A"
          fontFamily="Work sans, -apple-system, sans-serif"
        >
          My Chats
        </Text>

        <HStack spacing={1}>
          <GroupChatModal>
            <Button
              size="xs"
              variant="solid"
              colorScheme="blue"
              leftIcon={<IoAdd size={16} />}
              borderRadius="8px"
            >
              New Group
            </Button>
          </GroupChatModal>
        </HStack>
      </Flex>

      {/* Conversation Search Input */}
      <Box px={3} pt={2} pb={1}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none" color="#94A3B8">
            <IoSearchOutline size={16} />
          </InputLeftElement>
          <Input
            placeholder="Search conversations..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            borderRadius="10px"
            bg="#F8FAFC"
            borderColor="#E2E8F0"
            _focus={{ bg: "white", borderColor: "#3B82F6" }}
          />
          {chatSearch && (
            <InputRightElement>
              <IconButton
                size="xs"
                variant="ghost"
                icon={<IoCloseCircleOutline size={16} />}
                onClick={() => setChatSearch("")}
                aria-label="Clear search"
              />
            </InputRightElement>
          )}
        </InputGroup>
      </Box>

      {/* Filter Tabs: All, Unread, Groups, Favorites */}
      <Box px={2} pt={1} pb={2}>
        <Tabs
          size="sm"
          variant="soft-rounded"
          colorScheme="blue"
          onChange={(index) => {
            const tabs = ["all", "unread", "groups", "favorites"];
            setFilterCategory(tabs[index]);
          }}
        >
          <TabList gap={1}>
            <Tab fontSize="xs" px={3} py={1} borderRadius="8px">
              All
            </Tab>
            <Tab fontSize="xs" px={3} py={1} borderRadius="8px">
              Unread
            </Tab>
            <Tab fontSize="xs" px={3} py={1} borderRadius="8px">
              Groups
            </Tab>
            <Tab fontSize="xs" px={3} py={1} borderRadius="8px">
              Favorites
            </Tab>
          </TabList>
        </Tabs>
      </Box>

      {/* Conversations List */}
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
                ? getSenderFull(loggedUser, chat.users)
                : null;
              const chatTitle = !chat.isGroupChat
                ? getSender(loggedUser, chat.users)
                : chat.chatName;

              const isPinned = chat.pinnedBy?.includes(user?.data?._id);
              const isMuted = chat.mutedBy?.includes(user?.data?._id);
              const isFav = chat.favorites?.includes(user?.data?._id);

              const unreadNotifs = notification?.filter(
                (n) => n.chat?._id === chat._id
              );
              const unreadCount = unreadNotifs?.length || 0;

              // Last message details
              const lastMsg = chat.latestMessage;
              const isLastMsgMine = lastMsg?.sender?._id === user?.data?._id;

              return (
                <Box
                  key={chat._id}
                  className={`conversation-item ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    setSelectedChat(chat);
                  }}
                  role="group"
                >
                  {/* Avatar */}
                  <Box mr={3}>
                    <UserAvatar
                      name={chatTitle}
                      src={
                        chat.isGroupChat
                          ? ""
                          : otherUser?.pic
                      }
                      size="md"
                      status={otherUser?.status || "online"}
                      showStatus={!chat.isGroupChat}
                    />
                  </Box>

                  {/* Middle: Title & Message Snippet */}
                  <Box flex="1" minW={0}>
                    <Flex justify="space-between" align="center" mb="2px">
                      <HStack spacing={1.5} maxW="70%">
                        <Text
                          fontSize="sm"
                          fontWeight={unreadCount > 0 ? "700" : "600"}
                          color="#0F172A"
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
                        {/* Outgoing status ticks */}
                        {isLastMsgMine && (
                          <Box as="span" display="inline-flex">
                            {lastMsg?.status === "seen" ? (
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

                      {/* Right icons: Pin, Mute, Unread Badge */}
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

                        {/* 3-dots Context Action Menu */}
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
