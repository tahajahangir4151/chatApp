import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Kbd,
  Badge,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  useDisclosure,
  useToast,
  Spinner,
  HStack,
} from "@chakra-ui/react";
import {
  IoSearchOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoSettingsOutline,
  IoColorPaletteOutline,
  IoLogOutOutline,
  IoChevronDown,
} from "react-icons/io5";
import { MdOutlineInstallDesktop } from "react-icons/md";
import { BsChatDotsFill } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useChatState } from "../../context/chatProvider";
import { getSender } from "../../config/chatLogics";
import UserAvatar from "../common/UserAvatar";
import UserListItem from "../usersAvatar/UserListItem";
import ChatLoading from "../ChatLoading";
import ProfileModal from "../miscellaneous/ProfileModal";
import EditProfileModal from "../modals/EditProfileModal";
import SettingsModal from "../modals/SettingsModal";

const TopBar = ({ onOpenSettings }) => {
  const {
    user,
    setSelectedChat,
    notification,
    setNotification,
    chats,
    setChats,
  } = useChatState();

  const userData = user?.data || user || {};
  const toast = useToast();
  const navigate = useNavigate();

  // Search Drawer
  const {
    isOpen: isSearchOpen,
    onOpen: onSearchOpen,
    onClose: onSearchClose,
  } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);

  // Modals
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onClose: onSettingsClose,
  } = useDisclosure();

  // PWA Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearchOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchOpen]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Please enter a search term",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    try {
      setSearchLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${userData.token}`,
        },
      };
      const { data } = await axios.get(
        `/api/user?search=${searchQuery}`,
        config
      );
      setSearchResult(data);
      setSearchLoading(false);
    } catch (error) {
      toast({
        title: "Error fetching search results",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
      setSearchLoading(false);
    }
  };

  const accessChat = async (userId) => {
    try {
      setAccessLoading(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
      };
      const { data } = await axios.post("/api/chat", { userId }, config);

      if (!chats.find((c) => c._id === data._id)) {
        setChats([data, ...chats]);
      }
      setSelectedChat(data);
      setAccessLoading(false);
      onSearchClose();
    } catch (error) {
      toast({
        title: "Error creating chat",
        description: error.message,
        status: "error",
        duration: 2000,
        isClosable: true,
      });
      setAccessLoading(false);
    }
  };

  return (
    <>
      <Flex
        as="header"
        align="center"
        justify="space-between"
        bg="white"
        px={{ base: 3, md: 5 }}
        py={2.5}
        borderBottom="1px solid"
        borderColor="#E2E8F0"
        boxShadow="0 1px 3px rgba(0,0,0,0.03)"
        w="100%"
        h="60px"
        userSelect="none"
        zIndex={30}
      >
        {/* Left: Brand Logo */}
        <Flex align="center" gap={2.5} cursor="pointer">
          <Flex
            align="center"
            justify="center"
            w="36px"
            h="36px"
            borderRadius="10px"
            bg="linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)"
            color="white"
            boxShadow="0 2px 8px rgba(37, 99, 235, 0.3)"
          >
            <BsChatDotsFill size={18} />
          </Flex>
          <Box>
            <Text
              fontSize="18px"
              fontWeight="700"
              color="#0F172A"
              lineHeight="1.2"
              fontFamily="Work sans, -apple-system, sans-serif"
            >
              Talk-A-Tive
            </Text>
          </Box>
        </Flex>

        {/* Center: Global Search Bar */}
        <Box
          w={{ base: "auto", md: "380px" }}
          maxW="480px"
          mx={4}
          display={{ base: "none", sm: "block" }}
        >
          <InputGroup size="sm" onClick={onSearchOpen} cursor="pointer">
            <InputLeftElement pointerEvents="none" color="#94A3B8">
              <IoSearchOutline size={16} />
            </InputLeftElement>
            <Input
              readOnly
              placeholder="Search conversations & users..."
              bg="#F8FAFC"
              borderColor="#E2E8F0"
              borderRadius="10px"
              cursor="pointer"
              _hover={{ borderColor: "#CBD5E1", bg: "#F1F5F9" }}
            />
            <InputRightElement width="4.5rem">
              <HStack spacing={1} pr={2}>
                <Kbd fontSize="10px" color="#64748B">
                  Ctrl
                </Kbd>
                <Kbd fontSize="10px" color="#64748B">
                  K
                </Kbd>
              </HStack>
            </InputRightElement>
          </InputGroup>
        </Box>

        {/* Right Actions: Notifications + Avatar + Dropdown */}
        <Flex align="center" gap={2}>
          {/* Mobile Search Icon */}
          <IconButton
            display={{ base: "flex", sm: "none" }}
            size="sm"
            variant="ghost"
            aria-label="Search"
            icon={<IoSearchOutline size={20} />}
            onClick={onSearchOpen}
          />

          {/* PWA Install Button */}
          {isInstallable && (
            <Button
              size="xs"
              colorScheme="blue"
              variant="outline"
              leftIcon={<MdOutlineInstallDesktop size={14} />}
              onClick={handleInstallApp}
              display={{ base: "none", md: "inline-flex" }}
              borderRadius="8px"
            >
              Install App
            </Button>
          )}

          {/* Notifications Menu */}
          <Menu>
            <MenuButton
              as={IconButton}
              size="sm"
              variant="ghost"
              color="#64748B"
              _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
              aria-label="Notifications"
              position="relative"
              icon={
                <>
                  <IoNotificationsOutline size={20} />
                  {notification?.length > 0 && (
                    <Badge
                      position="absolute"
                      top="2px"
                      right="2px"
                      bg="#EF4444"
                      color="white"
                      borderRadius="full"
                      fontSize="10px"
                      px="4px"
                      py="1px"
                    >
                      {notification.length}
                    </Badge>
                  )}
                </>
              }
            />
            <MenuList minW="260px" borderRadius="12px" p={2} shadow="lg">
              <Text px={3} py={1} fontSize="xs" fontWeight="700" color="#94A3B8">
                NOTIFICATIONS
              </Text>
              {!notification?.length && (
                <Text px={3} py={2} fontSize="sm" color="#64748B">
                  No new messages
                </Text>
              )}
              {notification?.map((notif) => (
                <MenuItem
                  key={notif._id}
                  borderRadius="8px"
                  py={2}
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    setNotification(notification.filter((n) => n !== notif));
                  }}
                >
                  <Box>
                    <Text fontSize="sm" fontWeight="600">
                      {notif.chat?.isGroupChat
                        ? notif.chat.chatName
                        : getSender(user, notif.chat?.users || [])}
                    </Text>
                    <Text fontSize="xs" color="#64748B" noOfLines={1}>
                      {notif.content || "Sent an attachment"}
                    </Text>
                  </Box>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* User Profile Dropdown Menu */}
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              size="sm"
              p={1}
              borderRadius="10px"
              _hover={{ bg: "#F1F5F9" }}
            >
              <HStack spacing={2}>
                <UserAvatar
                  name={userData.name}
                  src={userData.pic}
                  size="sm"
                  status={userData.status || "online"}
                />
                <Text
                  fontSize="sm"
                  fontWeight="600"
                  color="#0F172A"
                  display={{ base: "none", md: "block" }}
                >
                  {userData.name}
                </Text>
                <IoChevronDown size={12} color="#64748B" />
              </HStack>
            </MenuButton>

            <MenuList borderRadius="14px" p={2} shadow="xl" minW="200px">
              <Box px={3} py={2}>
                <Text fontSize="sm" fontWeight="700" color="#0F172A">
                  {userData.name}
                </Text>
                <Text fontSize="xs" color="#64748B" noOfLines={1}>
                  {userData.email}
                </Text>
              </Box>
              <MenuDivider />

              <ProfileModal user={user}>
                <MenuItem icon={<IoPersonOutline size={16} />} borderRadius="8px">
                  View Profile
                </MenuItem>
              </ProfileModal>

              <MenuItem
                icon={<IoPersonOutline size={16} />}
                borderRadius="8px"
                onClick={onEditOpen}
              >
                Edit Profile
              </MenuItem>

              <MenuItem
                icon={<IoSettingsOutline size={16} />}
                borderRadius="8px"
                onClick={onSettingsOpen}
              >
                Settings
              </MenuItem>

              <MenuItem
                icon={<IoColorPaletteOutline size={16} />}
                borderRadius="8px"
                onClick={onSettingsOpen}
              >
                Appearance
              </MenuItem>

              {isInstallable && (
                <MenuItem
                  icon={<MdOutlineInstallDesktop size={16} />}
                  borderRadius="8px"
                  onClick={handleInstallApp}
                >
                  Install App (PWA)
                </MenuItem>
              )}

              <MenuDivider />

              <MenuItem
                icon={<IoLogOutOutline size={16} />}
                borderRadius="8px"
                color="#EF4444"
                _hover={{ bg: "#FEE2E2", color: "#B91C1C" }}
                onClick={logoutHandler}
              >
                Log Out
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      {/* Global Search Drawer */}
      <Drawer placement="left" onClose={onSearchClose} isOpen={isSearchOpen}>
        <DrawerOverlay backdropFilter="blur(2px)" />
        <DrawerContent>
          <DrawerHeader borderBottomWidth="1px" pb={3} fontSize="md">
            Search Users & Conversations
          </DrawerHeader>
          <DrawerBody py={3}>
            <Flex pb={3} gap={2}>
              <Input
                placeholder="Search by name or email"
                value={searchQuery}
                borderRadius="10px"
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchUsers();
                }}
                autoFocus
              />
              <Button
                colorScheme="blue"
                onClick={handleSearchUsers}
                borderRadius="10px"
              >
                Search
              </Button>
            </Flex>

            {searchLoading ? (
              <ChatLoading />
            ) : (
              searchResult?.map((u) => (
                <UserListItem
                  key={u._id}
                  user={u}
                  handleFunction={() => accessChat(u._id)}
                />
              ))
            )}
            {accessLoading && <Spinner display="flex" mx="auto" my={4} />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Edit Profile Modal */}
      <EditProfileModal isOpen={isEditOpen} onClose={onEditClose} />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={onSettingsClose} />
    </>
  );
};

export default TopBar;
