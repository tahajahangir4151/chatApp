import { useState, useEffect } from "react";
import { useChatState } from "../../context/chatProvider";
import {
  Avatar,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import axios from "axios";
import { BellIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { MdOutlineInstallDesktop } from "react-icons/md";
import ProfileModal from "./ProfileModal";
import UserListItem from "../usersAvatar/UserListItem";
import { cleanAvatarUrl } from "../common/UserAvatar";
import NotificationBadge, { Effect } from "react-notification-badge";
import ChatLoading from "../ChatLoading";
import { getSender } from "../../config/chatLogics";
import { IUser } from "@/types/chat";

const SideDrawer: React.FC = () => {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const {
    setSelectedChat,
    user,
    notification,
    setNotification,
    chats,
    setChats,
  } = useChatState();

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();
  const userData = user?.data || user || {};

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const installAppHandler = async () => {
    if (!deferredPrompt) {
      toast({
        title: "PWA is already installed or not supported on this browser.",
        status: "info",
        duration: 2500,
        isClosable: true,
      });
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      toast({
        title: "Thank you for installing Talk-A-Tive!",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    router.push("/");
  };

  const handleSearch = async () => {
    if (!search) {
      toast({
        title: "Please Enter something in search",
        status: "warning",
        duration: 2000,
        isClosable: true,
        position: "top-left",
      });
      return;
    }

    try {
      setLoading(true);

      const config = {
        headers: {
          Authorization: `Bearer ${userData.token}`,
        },
      };

      const { data } = await axios.get(`/api/user?search=${search}`, config);

      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Search Results",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoading(false);
    }
  };

  const accessChat = async (userId: string) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
      };
      const { data } = await axios.post("/api/chat", { userId }, config);

      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      onClose();
    } catch (error: any) {
      toast({
        title: "Error fetching the chat",
        description: error.message,
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoadingChat(false);
    }
  };

  return (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        bg="white"
        w="100%"
        p="5px 10px 5px 10px"
        borderWidth="5px"
      >
        <Tooltip label="Search Users to chat" hasArrow placement="bottom-end">
          <Button variant="ghost" onClick={onOpen}>
            <i className="fas fa-search"></i>
            <Text display={{ base: "none", md: "flex" }} px={4}>
              Search User
            </Text>
          </Button>
        </Tooltip>

        <Text fontSize="2xl" fontFamily="Work sans" fontWeight="bold">
          Talk-A-Tive
        </Text>

        <Box display="flex" alignItems="center" gap={1}>
          {isInstallable && (
            <Button
              size="sm"
              colorScheme="teal"
              variant="solid"
              leftIcon={<MdOutlineInstallDesktop size={18} />}
              onClick={installAppHandler}
              display={{ base: "none", sm: "inline-flex" }}
            >
              Install App
            </Button>
          )}

          <Menu>
            <MenuButton
              p={1}
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
            >
              <NotificationBadge
                count={notification.length}
                effect={Effect.SCALE}
              />
              <BellIcon fontSize="2xl" m={0} />
            </MenuButton>
            <MenuList pl={2}>
              {!notification.length && "No New Messages"}
              {notification.map((notif) => (
                <MenuItem
                  key={notif._id}
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    setNotification(notification.filter((n) => n !== notif));
                  }}
                >
                  {notif.chat.isGroupChat
                    ? `New Message in ${notif.chat.chatName}`
                    : `New Message from ${getSender(user, notif.chat.users)}`}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          <Menu>
            <MenuButton as={Button} bg="white" rightIcon={<ChevronDownIcon />}>
              <Avatar
                size="sm"
                cursor="pointer"
                name={userData.name}
                src={cleanAvatarUrl(userData.pic)}
              />
            </MenuButton>
            <MenuList>
              <ProfileModal user={user}>
                <MenuItem>My Profile</MenuItem>
              </ProfileModal>
              {isInstallable && (
                <MenuItem
                  icon={<MdOutlineInstallDesktop size={18} />}
                  onClick={installAppHandler}
                >
                  Install App (PWA)
                </MenuItem>
              )}
              <MenuDivider />
              <MenuItem onClick={logoutHandler}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay backdropFilter="blur(8px)" bg="rgba(10, 8, 24, 0.7)" />
        <DrawerContent
          bg="rgba(20, 15, 42, 0.96)"
          color="#F8FAFC"
          borderRight="1px solid rgba(255, 255, 255, 0.12)"
          backdropFilter="blur(24px)"
        >
          <DrawerHeader borderBottomWidth="1px" borderColor="rgba(255, 255, 255, 0.1)">
            Search Users
          </DrawerHeader>
          <DrawerBody>
            <Box display="flex" pb={3} gap={2}>
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                bg="rgba(255, 255, 255, 0.08)"
                borderColor="rgba(255, 255, 255, 0.14)"
                borderRadius="10px"
                _hover={{ borderColor: "rgba(255, 255, 255, 0.25)" }}
                _focus={{ borderColor: "#3B82F6" }}
              />
              <Button
                onClick={handleSearch}
                bg="linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)"
                color="white"
                borderRadius="10px"
                _hover={{ bg: "linear-gradient(135deg, #2563EB 0%, #6D28D9 100%)" }}
              >
                Search
              </Button>
            </Box>
            {loading ? (
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
            {loadingChat && <Spinner ml="auto" display="flex" />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default SideDrawer;

