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
  DrawerCloseButton,
  DrawerFooter,
  useDisclosure,
  useToast,
  Spinner,
  HStack,
  VStack,
  Skeleton,
  SkeletonCircle,
} from "@chakra-ui/react";
import {
  IoSearchOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoChevronDown,
  IoMoonOutline,
  IoSunnyOutline,
  IoPersonAddOutline,
  IoCloseCircleOutline,
  IoTimeOutline,
  IoSparklesOutline,
  IoArrowForwardOutline,
  IoChatbubblesOutline,
} from "react-icons/io5";
import { MdOutlineInstallDesktop } from "react-icons/md";
import { BsChatDotsFill } from "react-icons/bs";
import { useRouter } from "next/router";
import axios from "axios";
import { useChatState } from "../../context/chatProvider";
import { getSender } from "../../config/chatLogics";
import UserAvatar from "../common/UserAvatar";
import UserListItem from "../usersAvatar/UserListItem";
import ChatLoading from "../ChatLoading";
import ProfileModal from "../miscellaneous/ProfileModal";
import EditProfileModal from "../modals/EditProfileModal";
import SettingsModal from "../modals/SettingsModal";
import SendInviteModal from "../modals/SendInviteModal";
import { useTheme } from "../../context/themeContext";
import { IUser } from "@/types/chat";

interface TopBarProps {
  onOpenSettings?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onOpenSettings }) => {
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
  const router = useRouter();

  const {
    isOpen: isSearchOpen,
    onOpen: onSearchOpen,
    onClose: onSearchClose,
  } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<IUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);

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
  const {
    isOpen: isInviteOpen,
    onOpen: onInviteOpen,
    onClose: onInviteClose,
  } = useDisclosure();

  const { isDark, toggleTheme } = useTheme();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    router.push("/");
  };

  const executeSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResult([]);
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
        `/api/user?search=${encodeURIComponent(trimmed)}`,
        config
      );
      setSearchResult(Array.isArray(data) ? data : []);
      setSearchLoading(false);
    } catch (error) {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearchOpen) return;
    if (!searchQuery.trim()) {
      setSearchResult([]);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(searchQuery);
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery, isSearchOpen]);

  const handleSearchUsers = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Please enter a search term",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    executeSearch(searchQuery);
  };

  const handleCloseSearch = () => {
    setSearchQuery("");
    setSearchResult([]);
    onSearchClose();
  };

  const accessChat = async (userId: string) => {
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
    } catch (error: any) {
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
        className="glass-panel glass-topbar"
        align="center"
        justify="space-between"
        bg={isDark ? "rgba(15, 23, 42, 0.65)" : "white"}
        px={{ base: 3, md: 5 }}
        py={2.5}
        borderBottom="1px solid"
        borderColor={isDark ? "rgba(255, 255, 255, 0.10)" : "#E2E8F0"}
        boxShadow={isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.03)"}
        w="100%"
        h="60px"
        userSelect="none"
        zIndex={30}
      >
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
              color={isDark ? "#F8FAFC" : "#0F172A"}
              lineHeight="1.2"
              fontFamily="Work sans, -apple-system, sans-serif"
            >
              Talk-A-Tive
            </Text>
          </Box>
        </Flex>

        <Box
          w={{ base: "auto", md: "380px" }}
          maxW="480px"
          mx={4}
          display={{ base: "none", sm: "block" }}
        >
          <InputGroup size="sm" onClick={onSearchOpen} cursor="pointer">
            <InputLeftElement pointerEvents="none" color={isDark ? "#94A3B8" : "#94A3B8"}>
              <IoSearchOutline size={16} />
            </InputLeftElement>
            <Input
              readOnly
              placeholder="Search conversations & users..."
              bg={isDark ? "rgba(255, 255, 255, 0.08)" : "#F8FAFC"}
              borderColor={isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0"}
              color={isDark ? "#F8FAFC" : "#0F172A"}
              borderRadius="10px"
              cursor="pointer"
              _hover={{
                borderColor: isDark ? "rgba(255, 255, 255, 0.25)" : "#CBD5E1",
                bg: isDark ? "rgba(255, 255, 255, 0.12)" : "#F1F5F9",
              }}
            />
            <InputRightElement width="4.5rem">
              <HStack spacing={1} pr={2}>
                <Kbd
                  fontSize="10px"
                  color={isDark ? "#94A3B8" : "#64748B"}
                  bg={isDark ? "rgba(255, 255, 255, 0.08)" : undefined}
                  borderColor={isDark ? "rgba(255, 255, 255, 0.12)" : undefined}
                >
                  Ctrl
                </Kbd>
                <Kbd
                  fontSize="10px"
                  color={isDark ? "#94A3B8" : "#64748B"}
                  bg={isDark ? "rgba(255, 255, 255, 0.08)" : undefined}
                  borderColor={isDark ? "rgba(255, 255, 255, 0.12)" : undefined}
                >
                  K
                </Kbd>
              </HStack>
            </InputRightElement>
          </InputGroup>
        </Box>

        <Flex align="center" gap={2}>
          <IconButton
            display={{ base: "flex", sm: "none" }}
            size="sm"
            variant="ghost"
            aria-label="Search"
            color={isDark ? "#CBD5E1" : "#64748B"}
            _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9" }}
            icon={<IoSearchOutline size={20} />}
            onClick={onSearchOpen}
          />

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

          <Menu>
            <MenuButton
              as={IconButton}
              size="sm"
              variant="ghost"
              color={isDark ? "#CBD5E1" : "#64748B"}
              bg="transparent"
              _hover={{
                bg: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9",
                color: isDark ? "#60A5FA" : "#2563EB",
              }}
              _active={{
                bg: isDark ? "rgba(255, 255, 255, 0.14)" : "#E2E8F0",
                color: isDark ? "#60A5FA" : "#2563EB",
              }}
              _expanded={{
                bg: isDark ? "rgba(255, 255, 255, 0.14)" : "#E2E8F0",
                color: isDark ? "#60A5FA" : "#2563EB",
              }}
              _focus={{ boxShadow: "none" }}
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
            <MenuList
              minW="260px"
              borderRadius="16px"
              p={2}
              bg={isDark ? "rgba(22, 16, 46, 0.92)" : "rgba(255, 255, 255, 0.92)"}
              borderColor={isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(226, 232, 240, 0.8)"}
              backdropFilter="blur(28px) saturate(190%)"
              boxShadow={
                isDark
                  ? "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(139, 92, 246, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.22)"
                  : "0 20px 45px rgba(31, 38, 135, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95)"
              }
              color={isDark ? "#F8FAFC" : "inherit"}
            >
              <Text px={3} py={1} fontSize="xs" fontWeight="700" color={isDark ? "#94A3B8" : "#94A3B8"}>
                NOTIFICATIONS
              </Text>
              {!notification?.length && (
                <Text px={3} py={2} fontSize="sm" color={isDark ? "#94A3B8" : "#64748B"}>
                  No new messages
                </Text>
              )}
              {notification?.map((notif) => (
                <MenuItem
                  key={notif._id}
                  borderRadius="8px"
                  py={2}
                  bg="transparent"
                  _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.08)" : "#F8FAFC" }}
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    setNotification(notification.filter((n) => n !== notif));
                  }}
                >
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color={isDark ? "#F8FAFC" : "#0F172A"}>
                      {notif.chat?.isGroupChat
                        ? notif.chat.chatName
                        : getSender(user, notif.chat?.users || [])}
                    </Text>
                    <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"} noOfLines={1}>
                      {notif.content || "Sent an attachment"}
                    </Text>
                  </Box>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          <IconButton
            size="sm"
            variant="ghost"
            color={isDark ? "#CBD5E1" : "#64748B"}
            _hover={{
              bg: isDark ? "rgba(255, 255, 255, 0.08)" : "#EFF6FF",
              color: isDark ? "#60A5FA" : "#2563EB",
            }}
            icon={<IoPersonAddOutline size={19} />}
            onClick={onInviteOpen}
            aria-label="Invite friends via email"
            title="Invite friend to chat"
          />

          <IconButton
            size="sm"
            variant="ghost"
            color={isDark ? "#F59E0B" : "#64748B"}
            _hover={{
              bg: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9",
              color: "#F59E0B",
            }}
            icon={isDark ? <IoSunnyOutline size={20} color="#F59E0B" /> : <IoMoonOutline size={19} />}
            onClick={toggleTheme}
            aria-label="Toggle theme mode"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          />

          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              size="sm"
              p={1}
              borderRadius="10px"
              bg="transparent"
              _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9" }}
              _active={{ bg: isDark ? "rgba(255, 255, 255, 0.14)" : "#E2E8F0" }}
              _expanded={{ bg: isDark ? "rgba(255, 255, 255, 0.14)" : "#E2E8F0" }}
              _focus={{ boxShadow: "none" }}
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
                  color={isDark ? "#F8FAFC" : "#0F172A"}
                  display={{ base: "none", md: "block" }}
                >
                  {userData.name}
                </Text>
                <IoChevronDown size={12} color={isDark ? "#94A3B8" : "#64748B"} />
              </HStack>
            </MenuButton>

            <MenuList
              borderRadius="16px"
              p={2}
              minW="220px"
              bg={isDark ? "rgba(22, 16, 46, 0.92)" : "rgba(255, 255, 255, 0.94)"}
              borderColor={isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(226, 232, 240, 0.8)"}
              backdropFilter="blur(28px) saturate(190%)"
              boxShadow={
                isDark
                  ? "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(139, 92, 246, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.22)"
                  : "0 20px 45px rgba(31, 38, 135, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95)"
              }
              color={isDark ? "#F8FAFC" : "inherit"}
            >
              <Box px={3} py={2}>
                <Text fontSize="sm" fontWeight="700" color={isDark ? "#F8FAFC" : "#0F172A"}>
                  {userData.name}
                </Text>
                <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"} noOfLines={1}>
                  {userData.email}
                </Text>
              </Box>
              <MenuDivider borderColor={isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0"} />

              <ProfileModal user={user}>
                <MenuItem
                  icon={<IoPersonOutline size={16} />}
                  borderRadius="10px"
                  bg="transparent"
                  _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.10)" : "#F1F5F9" }}
                >
                  View Profile
                </MenuItem>
              </ProfileModal>

              <MenuItem
                icon={<IoPersonOutline size={16} />}
                borderRadius="10px"
                bg="transparent"
                _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.10)" : "#F1F5F9" }}
                onClick={onEditOpen}
              >
                Edit Profile
              </MenuItem>

              <MenuItem
                icon={<IoSettingsOutline size={16} />}
                borderRadius="10px"
                bg="transparent"
                _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.10)" : "#F1F5F9" }}
                onClick={onSettingsOpen}
              >
                Settings
              </MenuItem>

              <MenuItem
                icon={<IoPersonAddOutline size={16} />}
                borderRadius="10px"
                bg="transparent"
                _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.10)" : "#F1F5F9" }}
                onClick={onInviteOpen}
              >
                Invite Friend via Email
              </MenuItem>

              <MenuItem
                icon={isDark ? <IoSunnyOutline size={16} /> : <IoMoonOutline size={16} />}
                borderRadius="10px"
                bg="transparent"
                _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.10)" : "#F1F5F9" }}
                onClick={toggleTheme}
              >
                {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </MenuItem>

              {isInstallable && (
                <MenuItem
                  icon={<MdOutlineInstallDesktop size={16} />}
                  borderRadius="10px"
                  bg="transparent"
                  _hover={{ bg: isDark ? "rgba(255, 255, 255, 0.10)" : "#F1F5F9" }}
                  onClick={handleInstallApp}
                >
                  Install App (PWA)
                </MenuItem>
              )}

              <MenuDivider borderColor={isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0"} />

              <MenuItem
                icon={<IoLogOutOutline size={16} />}
                borderRadius="10px"
                color="#EF4444"
                bg="transparent"
                _hover={{
                  bg: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
                  color: isDark ? "#FCA5A5" : "#B91C1C",
                }}
                onClick={logoutHandler}
              >
                Log Out
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      <Drawer
        placement="left"
        onClose={handleCloseSearch}
        isOpen={isSearchOpen}
        size="md"
      >
        <DrawerOverlay
          bg={isDark ? "rgba(10, 8, 24, 0.75)" : "rgba(15, 23, 42, 0.45)"}
          backdropFilter="blur(10px)"
        />
        <DrawerContent
          maxW={{ base: "100%", sm: "440px" }}
          bg={isDark ? "rgba(20, 15, 42, 0.96)" : "rgba(255, 255, 255, 0.96)"}
          backdropFilter="blur(32px) saturate(200%)"
          borderRight="1px solid"
          borderColor={isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(226, 232, 240, 0.9)"}
          boxShadow={
            isDark
              ? "15px 0 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(139, 92, 246, 0.22)"
              : "15px 0 50px rgba(31, 38, 135, 0.12)"
          }
          color={isDark ? "#F8FAFC" : "#0F172A"}
          display="flex"
          flexDirection="column"
        >
          {/* Drawer Header */}
          <DrawerHeader
            px={5}
            py={4}
            borderBottom="1px solid"
            borderColor={isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(226, 232, 240, 0.8)"}
          >
            <Flex align="center" justify="space-between">
              <HStack spacing={3}>
                <Flex
                  w="40px"
                  h="40px"
                  borderRadius="12px"
                  bg="linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)"
                  color="white"
                  align="center"
                  justify="center"
                  boxShadow="0 4px 14px rgba(124, 58, 237, 0.4)"
                >
                  <IoSearchOutline size={20} />
                </Flex>
                <Box>
                  <Text
                    fontSize="17px"
                    fontWeight="700"
                    color={isDark ? "#F8FAFC" : "#0F172A"}
                    lineHeight="1.2"
                  >
                    Search & Explore
                  </Text>
                  <Text
                    fontSize="xs"
                    color={isDark ? "#94A3B8" : "#64748B"}
                    fontWeight="400"
                  >
                    Find users, start chats & contacts
                  </Text>
                </Box>
              </HStack>

              <DrawerCloseButton
                position="static"
                borderRadius="10px"
                color={isDark ? "#94A3B8" : "#64748B"}
                _hover={{
                  bg: isDark ? "rgba(255, 255, 255, 0.10)" : "#F1F5F9",
                  color: isDark ? "#FFFFFF" : "#0F172A",
                }}
              />
            </Flex>
          </DrawerHeader>

          {/* Drawer Body */}
          <DrawerBody px={5} py={4} className="custom-scrollbar" overflowY="auto">
            {/* Search Input Bar */}
            <Box mb={3}>
              <InputGroup size="md">
                <InputLeftElement
                  pointerEvents="none"
                  color={isDark ? "#94A3B8" : "#64748B"}
                  h="46px"
                >
                  <IoSearchOutline size={18} />
                </InputLeftElement>
                <Input
                  h="46px"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchUsers();
                  }}
                  borderRadius="14px"
                  bg={isDark ? "rgba(255, 255, 255, 0.07)" : "#F8FAFC"}
                  border="1px solid"
                  borderColor={isDark ? "rgba(255, 255, 255, 0.14)" : "#E2E8F0"}
                  color={isDark ? "#F8FAFC" : "#0F172A"}
                  fontSize="sm"
                  pl="42px"
                  pr={searchQuery ? "80px" : "42px"}
                  _hover={{
                    borderColor: isDark ? "rgba(255, 255, 255, 0.25)" : "#CBD5E1",
                    bg: isDark ? "rgba(255, 255, 255, 0.09)" : "#F1F5F9",
                  }}
                  _focus={{
                    borderColor: "#3B82F6",
                    bg: isDark ? "rgba(255, 255, 255, 0.11)" : "white",
                    boxShadow: "0 0 0 1px #3B82F6, 0 0 18px rgba(59, 130, 246, 0.35)",
                  }}
                  autoFocus
                />
                {searchQuery && (
                  <InputRightElement h="46px" pr={2}>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      aria-label="Clear search"
                      icon={<IoCloseCircleOutline size={18} />}
                      color={isDark ? "#94A3B8" : "#64748B"}
                      _hover={{ color: isDark ? "#FFFFFF" : "#0F172A" }}
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResult([]);
                      }}
                    />
                  </InputRightElement>
                )}
              </InputGroup>
            </Box>

            {/* Quick Action / Key info bar */}
            <Flex justify="space-between" align="center" mb={4}>
              <HStack spacing={1.5}>
                <Kbd
                  fontSize="11px"
                  bg={isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9"}
                  borderColor={isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0"}
                  color={isDark ? "#94A3B8" : "#64748B"}
                >
                  Enter ↵
                </Kbd>
                <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"}>
                  to search
                </Text>
              </HStack>

              <Button
                size="xs"
                borderRadius="8px"
                bg="linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)"
                color="white"
                px={3}
                py={1.5}
                fontWeight="600"
                boxShadow="0 2px 10px rgba(37, 99, 235, 0.35)"
                _hover={{ bg: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}
                onClick={handleSearchUsers}
                isLoading={searchLoading}
              >
                Search
              </Button>
            </Flex>

            {/* Content Display: Loading, Results, No Results, or Recent Chats */}
            {searchLoading ? (
              <VStack spacing={3} align="stretch">
                {[1, 2, 3, 4].map((i) => (
                  <HStack
                    key={i}
                    p={3}
                    borderRadius="14px"
                    bg={isDark ? "rgba(255, 255, 255, 0.04)" : "#F8FAFC"}
                    border="1px solid"
                    borderColor={isDark ? "rgba(255, 255, 255, 0.06)" : "#E2E8F0"}
                    spacing={3}
                  >
                    <SkeletonCircle
                      size="10"
                      startColor={isDark ? "#2D1B4E" : "#E2E8F0"}
                      endColor={isDark ? "#4C2882" : "#CBD5E1"}
                    />
                    <VStack align="start" spacing={2} flex={1}>
                      <Skeleton
                        h="12px"
                        w="45%"
                        borderRadius="md"
                        startColor={isDark ? "#2D1B4E" : "#E2E8F0"}
                        endColor={isDark ? "#4C2882" : "#CBD5E1"}
                      />
                      <Skeleton
                        h="10px"
                        w="70%"
                        borderRadius="md"
                        startColor={isDark ? "#2D1B4E" : "#E2E8F0"}
                        endColor={isDark ? "#4C2882" : "#CBD5E1"}
                      />
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            ) : searchQuery.trim() !== "" ? (
              searchResult.length > 0 ? (
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between" px={1} mb={1}>
                    <Text
                      fontSize="xs"
                      fontWeight="700"
                      textTransform="uppercase"
                      letterSpacing="0.05em"
                      color={isDark ? "#94A3B8" : "#64748B"}
                    >
                      Users Found ({searchResult.length})
                    </Text>
                  </HStack>

                  {searchResult.map((u) => (
                    <Box
                      key={u._id}
                      onClick={() => accessChat(u._id)}
                      cursor="pointer"
                      p={3}
                      borderRadius="14px"
                      bg={isDark ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF"}
                      border="1px solid"
                      borderColor={isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0"}
                      transition="all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                      role="group"
                      _hover={{
                        bg: isDark ? "rgba(139, 92, 246, 0.15)" : "#EFF6FF",
                        borderColor: isDark ? "rgba(167, 139, 250, 0.4)" : "#93C5FD",
                        transform: "translateY(-1px)",
                        boxShadow: isDark
                          ? "0 8px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(139, 92, 246, 0.2)"
                          : "0 6px 16px rgba(37, 99, 235, 0.12)",
                      }}
                    >
                      <Flex align="center" justify="space-between">
                        <HStack spacing={3} minW={0} flex={1}>
                          <UserAvatar
                            size="md"
                            name={u.name}
                            src={u.pic}
                            status={u.status || "online"}
                          />
                          <Box minW={0} flex={1}>
                            <Text
                              fontSize="sm"
                              fontWeight="600"
                              color={isDark ? "#F8FAFC" : "#0F172A"}
                              noOfLines={1}
                            >
                              {u.name}
                            </Text>
                            <Text
                              fontSize="xs"
                              color={isDark ? "#94A3B8" : "#64748B"}
                              noOfLines={1}
                            >
                              {u.email}
                            </Text>
                          </Box>
                        </HStack>

                        <Button
                          size="xs"
                          borderRadius="8px"
                          colorScheme="blue"
                          variant="ghost"
                          rightIcon={<IoArrowForwardOutline />}
                          _groupHover={{
                            bg: isDark ? "rgba(59, 130, 246, 0.25)" : "#DBEAFE",
                            color: isDark ? "#60A5FA" : "#1D4ED8",
                          }}
                        >
                          Chat
                        </Button>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              ) : (
                <VStack
                  py={10}
                  px={4}
                  spacing={4}
                  textAlign="center"
                  bg={isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC"}
                  borderRadius="16px"
                  border="1px dashed"
                  borderColor={isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0"}
                >
                  <Flex
                    w="52px"
                    h="52px"
                    borderRadius="full"
                    bg={isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2"}
                    color={isDark ? "#F87171" : "#DC2626"}
                    align="center"
                    justify="center"
                  >
                    <IoSearchOutline size={26} />
                  </Flex>
                  <Box>
                    <Text fontSize="md" fontWeight="700" color={isDark ? "#F8FAFC" : "#0F172A"}>
                      No users found
                    </Text>
                    <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"} maxW="280px" mx="auto" mt={1}>
                      We couldn't find anyone matching "{searchQuery}". Try a different name or invite them directly.
                    </Text>
                  </Box>
                  <Button
                    size="sm"
                    borderRadius="10px"
                    leftIcon={<IoPersonAddOutline />}
                    bg="linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)"
                    color="white"
                    _hover={{ bg: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}
                    onClick={() => {
                      onSearchClose();
                      onInviteOpen();
                    }}
                  >
                    Invite via Email
                  </Button>
                </VStack>
              )
            ) : (
              <VStack spacing={3} align="stretch">
                {chats && chats.length > 0 && (
                  <>
                    <HStack justify="space-between" px={1}>
                      <HStack spacing={1.5} color={isDark ? "#94A3B8" : "#64748B"}>
                        <IoTimeOutline size={14} />
                        <Text
                          fontSize="xs"
                          fontWeight="700"
                          textTransform="uppercase"
                          letterSpacing="0.05em"
                        >
                          Recent Conversations
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color={isDark ? "#64748B" : "#94A3B8"}>
                        {chats.slice(0, 5).length} chats
                      </Text>
                    </HStack>

                    {chats.slice(0, 5).map((chat) => {
                      const chatTitle = chat.isGroupChat
                        ? chat.chatName
                        : getSender(user, chat.users || []);
                      const otherUser = !chat.isGroupChat
                        ? (chat.users || []).find((u) => u._id !== userData._id)
                        : null;

                      return (
                        <Box
                          key={chat._id}
                          onClick={() => {
                            setSelectedChat(chat);
                            onSearchClose();
                          }}
                          cursor="pointer"
                          p={2.5}
                          borderRadius="12px"
                          bg={isDark ? "rgba(255, 255, 255, 0.04)" : "#F8FAFC"}
                          border="1px solid"
                          borderColor={isDark ? "rgba(255, 255, 255, 0.07)" : "#E2E8F0"}
                          transition="all 0.18s ease"
                          _hover={{
                            bg: isDark ? "rgba(255, 255, 255, 0.08)" : "#EFF6FF",
                            borderColor: isDark ? "rgba(96, 165, 250, 0.3)" : "#BFDBFE",
                            transform: "translateX(2px)",
                          }}
                        >
                          <Flex align="center" justify="space-between">
                            <HStack spacing={3} minW={0} flex={1}>
                              <UserAvatar
                                size="sm"
                                name={chatTitle}
                                src={otherUser?.pic}
                                status={otherUser?.status || "online"}
                              />
                              <Box minW={0} flex={1}>
                                <Text
                                  fontSize="sm"
                                  fontWeight="600"
                                  color={isDark ? "#F8FAFC" : "#0F172A"}
                                  noOfLines={1}
                                >
                                  {chatTitle}
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color={isDark ? "#94A3B8" : "#64748B"}
                                  noOfLines={1}
                                >
                                  {chat.latestMessage?.content ||
                                    (chat.isGroupChat ? "Group conversation" : "Direct message")}
                                </Text>
                              </Box>
                            </HStack>
                            <IoArrowForwardOutline
                              size={14}
                              color={isDark ? "#64748B" : "#94A3B8"}
                            />
                          </Flex>
                        </Box>
                      );
                    })}
                  </>
                )}

                {/* Quick Invite Friend Banner */}
                <Box
                  p={4}
                  mt={2}
                  borderRadius="16px"
                  bg={
                    isDark
                      ? "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)"
                      : "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)"
                  }
                  border="1px solid"
                  borderColor={isDark ? "rgba(139, 92, 246, 0.25)" : "#DDD6FE"}
                >
                  <HStack spacing={3} align="start">
                    <Flex
                      w="36px"
                      h="36px"
                      borderRadius="10px"
                      bg="linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)"
                      color="white"
                      align="center"
                      justify="center"
                      flexShrink={0}
                      boxShadow="0 4px 12px rgba(124, 58, 237, 0.3)"
                    >
                      <IoSparklesOutline size={18} />
                    </Flex>
                    <Box flex={1}>
                      <Text
                        fontSize="sm"
                        fontWeight="700"
                        color={isDark ? "#F8FAFC" : "#0F172A"}
                      >
                        Invite New Friends
                      </Text>
                      <Text
                        fontSize="xs"
                        color={isDark ? "#CBD5E1" : "#475569"}
                        mt={0.5}
                        mb={2.5}
                      >
                        Can't find who you're looking for? Send an email invitation directly to their inbox.
                      </Text>
                      <Button
                        size="xs"
                        borderRadius="8px"
                        leftIcon={<IoPersonAddOutline size={13} />}
                        bg="linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)"
                        color="white"
                        _hover={{ bg: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}
                        onClick={() => {
                          onSearchClose();
                          onInviteOpen();
                        }}
                      >
                        Send Invite
                      </Button>
                    </Box>
                  </HStack>
                </Box>
              </VStack>
            )}

            {accessLoading && (
              <Flex justify="center" align="center" py={4}>
                <Spinner size="md" color="#3B82F6" />
              </Flex>
            )}
          </DrawerBody>

          {/* Drawer Footer */}
          <DrawerFooter
            borderTop="1px solid"
            borderColor={isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0"}
            py={2.5}
            px={5}
            justifyContent="space-between"
          >
            <HStack spacing={1.5} color={isDark ? "#64748B" : "#94A3B8"}>
              <Kbd fontSize="10px" bg={isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9"}>
                ESC
              </Kbd>
              <Text fontSize="11px">to close</Text>
            </HStack>
            <Text fontSize="11px" color={isDark ? "#64748B" : "#94A3B8"}>
              Talk-A-Tive Search
            </Text>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <EditProfileModal isOpen={isEditOpen} onClose={onEditClose} />
      <SettingsModal isOpen={isSettingsOpen} onClose={onSettingsClose} />
      <SendInviteModal isOpen={isInviteOpen} onClose={onInviteClose} />
    </>
  );
};

export default TopBar;

