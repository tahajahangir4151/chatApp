import React, { useMemo, useState } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Image,
  Badge,
  Button,
  Switch,
  Divider,
  useToast,
  useDisclosure,
} from "@chakra-ui/react";
import {
  IoDocumentTextOutline,
  IoNotificationsOffOutline,
  IoBanOutline,
  IoFlagOutline,
  IoLogOutOutline,
  IoDownloadOutline,
  IoPersonAddOutline,
} from "react-icons/io5";
import { useChatState } from "../../context/chatProvider";
import { getSender, getSenderFull } from "../../config/chatLogics";
import UserAvatar from "../common/UserAvatar";
import SendInviteModal from "../modals/SendInviteModal";
import { useTheme } from "../../context/themeContext";
import { IChat, IMessage, IUser } from "@/types/chat";

interface ChatInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chat: IChat | null;
  messages?: IMessage[];
  onClearChat?: () => void;
}

const ChatInfoPanel: React.FC<ChatInfoPanelProps> = ({
  isOpen,
  onClose,
  chat,
  messages = [],
}) => {
  const { user } = useChatState();
  const { isDark } = useTheme();
  const loggedUser = user?.data || user;
  const toast = useToast();

  const [isMuted, setIsMuted] = useState(false);
  const {
    isOpen: isInviteOpen,
    onOpen: onInviteOpen,
    onClose: onInviteClose,
  } = useDisclosure();

  const sharedMedia = useMemo(() => {
    return (messages || []).filter(
      (m) =>
        (m.mediaType === "image" || m.mediaType === "video") &&
        Boolean(m.fileUrl)
    );
  }, [messages]);

  const sharedFiles = useMemo(() => {
    return (messages || []).filter(
      (m) =>
        (m.mediaType === "file" || m.mediaType === "audio") &&
        Boolean(m.fileUrl)
    );
  }, [messages]);

  const starredMessages = useMemo(() => {
    return (messages || []).filter((m) => m.isStarred);
  }, [messages]);

  if (!chat) return null;

  const isGroup = chat.isGroupChat;
  const otherUser = !isGroup ? (getSenderFull(loggedUser, chat.users) as IUser) : null;
  const chatTitle = !isGroup
    ? getSender(loggedUser, chat.users)
    : chat.chatName;

  const handleActionToast = (msg: string, status: "info" | "warning" | "success" | "error" = "info") => {
    toast({
      title: msg,
      status: status,
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <>
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="sm">
        <DrawerOverlay backdropFilter="blur(2px)" />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader
            borderBottomWidth="1px"
            fontSize="md"
            color={isDark ? "#F8FAFC" : "#0F172A"}
            borderColor={isDark ? "#334155" : "#E2E8F0"}
            bg={isDark ? "#1E293B" : "white"}
          >
            {isGroup ? "Group Information" : "Contact Information"}
          </DrawerHeader>

          <DrawerBody p={0} className="custom-scrollbar" overflowY="auto" bg={isDark ? "#0F172A" : "white"}>
            <VStack spacing={3} py={6} px={4} bg={isDark ? "rgba(255, 255, 255, 0.03)" : "gray.50"} align="center">
              <UserAvatar
                name={chatTitle}
                src={isGroup ? "" : otherUser?.pic}
                size="2xl"
                status={(otherUser as any)?.status || "online"}
                showStatus={!isGroup}
              />

              <Box textAlign="center">
                <Text fontSize="18px" fontWeight="700" color={isDark ? "#F8FAFC" : "#0F172A"}>
                  {chatTitle}
                </Text>
                {!isGroup ? (
                  <>
                    <Text fontSize="xs" color="#64748B">
                      {otherUser?.email}
                    </Text>
                    <Text fontSize="xs" color="#10B981" fontWeight="500" mt={1}>
                      {(otherUser as any)?.status === "online"
                        ? "🟢 Online"
                        : (otherUser as any)?.status === "away"
                          ? "🟡 Away"
                          : "⚪ Offline"}
                    </Text>
                  </>
                ) : (
                  <Text fontSize="xs" color="#64748B">
                    Group • {chat.users?.length || 0} members
                  </Text>
                )}
              </Box>

              <Box
                w="100%"
                bg="white"
                p={3}
                borderRadius="12px"
                border="1px solid #E2E8F0"
                textAlign="left"
              >
                <Text fontSize="xs" fontWeight="700" color="#94A3B8" mb={1}>
                  {isGroup ? "GROUP DESCRIPTION" : "ABOUT"}
                </Text>
                <Text fontSize="sm" color="#334155">
                  {!isGroup
                    ? otherUser?.about || "Hey there! I am using Talk-A-Tive."
                    : chat.description || "No description provided."}
                </Text>
              </Box>
            </VStack>

            <Box p={3}>
              <Tabs variant="soft-rounded" colorScheme="blue" size="sm">
                <TabList gap={1} overflowX="auto" pb={2}>
                  <Tab fontSize="xs" borderRadius="8px">
                    Media ({sharedMedia.length})
                  </Tab>
                  <Tab fontSize="xs" borderRadius="8px">
                    Files ({sharedFiles.length})
                  </Tab>
                  <Tab fontSize="xs" borderRadius="8px">
                    Starred ({starredMessages.length})
                  </Tab>
                  {isGroup && (
                    <Tab fontSize="xs" borderRadius="8px">
                      Members ({chat.users?.length || 0})
                    </Tab>
                  )}
                </TabList>

                <TabPanels>
                  <TabPanel px={0} py={2}>
                    {sharedMedia.length === 0 ? (
                      <Text fontSize="xs" color="#94A3B8" textAlign="center" py={6}>
                        No shared photos or videos
                      </Text>
                    ) : (
                      <SimpleGrid columns={3} spacing={2}>
                        {sharedMedia.map((m) => (
                          <Box
                            key={m._id}
                            borderRadius="8px"
                            overflow="hidden"
                            h="80px"
                            bg="gray.100"
                            cursor="pointer"
                            onClick={() => window.open(m.fileUrl, "_blank")}
                          >
                            {m.mediaType === "video" ? (
                              <Box
                                h="100%"
                                bg="black"
                                color="white"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                fontSize="xs"
                              >
                                🎥 Video
                              </Box>
                            ) : (
                              <Image
                                src={m.fileUrl}
                                alt={m.fileName || "Media"}
                                w="100%"
                                h="100%"
                                objectFit="cover"
                              />
                            )}
                          </Box>
                        ))}
                      </SimpleGrid>
                    )}
                  </TabPanel>

                  <TabPanel px={0} py={2}>
                    {sharedFiles.length === 0 ? (
                      <Text fontSize="xs" color="#94A3B8" textAlign="center" py={6}>
                        No shared documents or audio
                      </Text>
                    ) : (
                      <VStack spacing={2} align="stretch">
                        {sharedFiles.map((m) => (
                          <Flex
                            key={m._id}
                            p={2}
                            bg="gray.50"
                            borderRadius="8px"
                            align="center"
                            justify="space-between"
                          >
                            <HStack spacing={2} minW={0}>
                              <IoDocumentTextOutline size={18} color="#2563EB" />
                              <Box minW={0}>
                                <Text fontSize="xs" fontWeight="600" noOfLines={1}>
                                  {m.fileName || "Attachment"}
                                </Text>
                                <Text fontSize="10px" color="#94A3B8">
                                  {m.fileSize
                                    ? `${(m.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                    : "File"}
                                </Text>
                              </Box>
                            </HStack>
                            <a href={m.fileUrl} download target="_blank" rel="noreferrer">
                              <IoDownloadOutline size={16} color="#64748B" />
                            </a>
                          </Flex>
                        ))}
                      </VStack>
                    )}
                  </TabPanel>

                  <TabPanel px={0} py={2}>
                    {starredMessages.length === 0 ? (
                      <Text fontSize="xs" color="#94A3B8" textAlign="center" py={6}>
                        No starred messages
                      </Text>
                    ) : (
                      <VStack spacing={2} align="stretch">
                        {starredMessages.map((m) => (
                          <Box
                            key={m._id}
                            p={2.5}
                            bg={isDark ? "rgba(255, 255, 255, 0.05)" : "gray.50"}
                            borderRadius="8px"
                            border="1px solid"
                            borderColor={isDark ? "#334155" : "#E2E8F0"}
                          >
                            <Text fontSize="xs" fontWeight="600" color="#2563EB" mb={1}>
                              {m.sender?.name}
                            </Text>
                            <Text fontSize="xs" color={isDark ? "#F8FAFC" : "#0F172A"}>
                              {m.content || "Media attachment"}
                            </Text>
                          </Box>
                        ))}
                      </VStack>
                    )}
                  </TabPanel>

                  {isGroup && (
                    <TabPanel px={0} py={2}>
                      <Button
                        size="xs"
                        colorScheme="purple"
                        variant="outline"
                        leftIcon={<IoPersonAddOutline size={14} />}
                        onClick={onInviteOpen}
                        borderRadius="8px"
                        w="100%"
                        mb={2}
                      >
                        Invite Member via Email
                      </Button>
                      <VStack spacing={2} align="stretch">
                        {chat.users?.map((u) => {
                          const isAdmin = (chat.groupAdmin as any)?._id === u._id;
                          return (
                            <Flex
                              key={u._id}
                              p={2}
                              borderRadius="8px"
                              align="center"
                              justify="space-between"
                              _hover={{ bg: "gray.50" }}
                            >
                              <HStack spacing={2.5}>
                                <UserAvatar
                                  name={u.name}
                                  src={u.pic}
                                  size="sm"
                                  status={(u as any)?.status || "online"}
                                />
                                <Box>
                                  <Text fontSize="xs" fontWeight="600">
                                    {u._id === loggedUser?._id ? "You" : u.name}
                                  </Text>
                                  <Text fontSize="10px" color="#94A3B8">
                                    {u.email}
                                  </Text>
                                </Box>
                              </HStack>
                              {isAdmin && (
                                <Badge colorScheme="green" fontSize="10px">
                                  Admin
                                </Badge>
                              )}
                            </Flex>
                          );
                        })}
                      </VStack>
                    </TabPanel>
                  )}
                </TabPanels>
              </Tabs>
            </Box>

            <Divider my={2} />

            <VStack spacing={1} p={3} align="stretch">
              <Flex
                align="center"
                justify="space-between"
                p={2}
                borderRadius="8px"
                _hover={{ bg: "gray.50" }}
              >
                <HStack spacing={3}>
                  <IoNotificationsOffOutline size={18} color="#64748B" />
                  <Text fontSize="sm" color="#334155">
                    Mute Notifications
                  </Text>
                </HStack>
                <Switch
                  size="sm"
                  colorScheme="blue"
                  isChecked={isMuted}
                  onChange={(e) => {
                    setIsMuted(e.target.checked);
                    handleActionToast(
                      e.target.checked ? "Notifications muted" : "Notifications unmuted"
                    );
                  }}
                />
              </Flex>

              {!isGroup ? (
                <>
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    size="sm"
                    leftIcon={<IoBanOutline size={18} color="#EF4444" />}
                    color="#EF4444"
                    onClick={() => handleActionToast("User blocked", "warning")}
                  >
                    Block User
                  </Button>
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    size="sm"
                    leftIcon={<IoFlagOutline size={18} color="#EF4444" />}
                    color="#EF4444"
                    onClick={() => handleActionToast("User reported", "warning")}
                  >
                    Report User
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  justifyContent="flex-start"
                  size="sm"
                  leftIcon={<IoLogOutOutline size={18} color="#EF4444" />}
                  color="#EF4444"
                  onClick={() => handleActionToast("Left group", "warning")}
                >
                  Leave Group
                </Button>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <SendInviteModal
        isOpen={isInviteOpen}
        onClose={onInviteClose}
        defaultChat={chat}
      />
    </>
  );
};

export default ChatInfoPanel;

