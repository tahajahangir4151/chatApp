import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Text,
  Switch,
  Box,
  Button,
  useToast,
} from "@chakra-ui/react";
import {
  IoColorPaletteOutline,
  IoNotificationsOutline,
  IoShieldCheckmarkOutline,
  IoSunnyOutline,
  IoMoonOutline,
} from "react-icons/io5";
import { useTheme } from "../../context/themeContext";
import {
  isSoundEnabled,
  setSoundEnabled as saveSoundEnabled,
  isDesktopNotifsEnabled,
  setDesktopNotifsEnabled as saveDesktopNotifsEnabled,
  requestNotificationPermission,
  getNotificationPermission,
  playNotificationChime,
  showSystemNotification,
} from "../../utils/notificationService";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, isDark } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [enterToSend, setEnterToSend] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setSoundEnabled(isSoundEnabled());
      const notifsEnabled = isDesktopNotifsEnabled() && getNotificationPermission() === "granted";
      setDesktopNotifs(notifsEnabled);
    }
  }, [isOpen]);

  const handleToggleDesktopNotifs = async (checked: boolean) => {
    if (checked) {
      const perm = await requestNotificationPermission();
      if (perm === "granted") {
        setDesktopNotifs(true);
        saveDesktopNotifsEnabled(true);
        playNotificationChime();
        showSystemNotification({
          title: "Desktop Alerts Enabled",
          body: "You'll now receive system notifications like WhatsApp.",
          icon: "/talkative-logo.png",
        });
        toast({
          title: "Desktop Alerts Enabled",
          description: "Talk-A-Tive will now notify you even when the window is closed or minimized.",
          status: "success",
          duration: 3000,
        });
      } else {
        setDesktopNotifs(false);
        saveDesktopNotifsEnabled(false);
        toast({
          title: "Permission Required",
          description: "Notifications are blocked by your browser. Please allow notifications in site settings.",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
      }
    } else {
      setDesktopNotifs(false);
      saveDesktopNotifsEnabled(false);
    }
  };

  const handleToggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
    saveSoundEnabled(checked);
    if (checked) {
      playNotificationChime();
    }
  };

  const handleSave = () => {
    saveSoundEnabled(soundEnabled);
    saveDesktopNotifsEnabled(desktopNotifs);
    toast({
      title: "Settings Saved",
      status: "success",
      duration: 1500,
      isClosable: true,
    });
    onClose();
  };

  const cardBg = isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC";
  const cardBorder = isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #E2E8F0";

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(6px)" />
      <ModalContent borderRadius="20px" p={2}>
        <ModalHeader pb={1} fontSize="20px" fontWeight="700">
          Application Settings
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Tabs variant="line" colorScheme="blue">
            <TabList mb={3} borderColor={isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0"}>
              <Tab fontSize="sm" color={isDark ? "#94A3B8" : undefined} _selected={{ color: isDark ? "#60A5FA" : "#2563EB" }}>
                <HStack spacing={2}>
                  <IoColorPaletteOutline />
                  <span>Appearance</span>
                </HStack>
              </Tab>
              <Tab fontSize="sm" color={isDark ? "#94A3B8" : undefined} _selected={{ color: isDark ? "#60A5FA" : "#2563EB" }}>
                <HStack spacing={2}>
                  <IoNotificationsOutline />
                  <span>Notifications</span>
                </HStack>
              </Tab>
              <Tab fontSize="sm" color={isDark ? "#94A3B8" : undefined} _selected={{ color: isDark ? "#60A5FA" : "#2563EB" }}>
                <HStack spacing={2}>
                  <IoShieldCheckmarkOutline />
                  <span>Chat & Privacy</span>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={1} py={2}>
                <VStack spacing={4} align="stretch">
                  <Box p={3.5} bg={cardBg} border={cardBorder} borderRadius="12px">
                    <Text fontWeight="600" fontSize="sm" color={isDark ? "#F8FAFC" : "#0F172A"}>
                      Theme
                    </Text>
                    <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"} mb={3}>
                      Choose between light and sleek dark mode
                    </Text>
                    <HStack spacing={3}>
                      <Button
                        size="sm"
                        borderRadius="10px"
                        colorScheme="blue"
                        variant={theme === "light" ? "solid" : "outline"}
                        leftIcon={<IoSunnyOutline size={16} />}
                        onClick={() => setTheme("light")}
                      >
                        Light Mode
                      </Button>
                      <Button
                        size="sm"
                        borderRadius="10px"
                        colorScheme="purple"
                        variant={theme === "dark" ? "solid" : "outline"}
                        leftIcon={<IoMoonOutline size={16} />}
                        onClick={() => setTheme("dark")}
                      >
                        Dark Mode
                      </Button>
                    </HStack>
                  </Box>
                </VStack>
              </TabPanel>

              <TabPanel px={1} py={2}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" p={3.5} bg={cardBg} border={cardBorder} borderRadius="12px">
                    <Box>
                      <Text fontWeight="600" fontSize="sm" color={isDark ? "#F8FAFC" : "#0F172A"}>
                        Message Sound
                      </Text>
                      <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"}>
                        Play audio sound on new messages
                      </Text>
                    </Box>
                    <Switch
                      colorScheme="blue"
                      isChecked={soundEnabled}
                      onChange={(e) => handleToggleSound(e.target.checked)}
                    />
                  </HStack>

                  <HStack justify="space-between" p={3.5} bg={cardBg} border={cardBorder} borderRadius="12px">
                    <Box>
                      <Text fontWeight="600" fontSize="sm" color={isDark ? "#F8FAFC" : "#0F172A"}>
                        Desktop Alerts
                      </Text>
                      <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"}>
                        Show notification popup when window is closed or unfocused
                      </Text>
                    </Box>
                    <Switch
                      colorScheme="blue"
                      isChecked={desktopNotifs}
                      onChange={(e) => handleToggleDesktopNotifs(e.target.checked)}
                    />
                  </HStack>
                </VStack>
              </TabPanel>

              <TabPanel px={1} py={2}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" p={3.5} bg={cardBg} border={cardBorder} borderRadius="12px">
                    <Box>
                      <Text fontWeight="600" fontSize="sm" color={isDark ? "#F8FAFC" : "#0F172A"}>
                        Read Receipts
                      </Text>
                      <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"}>
                        Show double blue check when messages are read
                      </Text>
                    </Box>
                    <Switch
                      colorScheme="blue"
                      isChecked={readReceipts}
                      onChange={(e) => setReadReceipts(e.target.checked)}
                    />
                  </HStack>

                  <HStack justify="space-between" p={3.5} bg={cardBg} border={cardBorder} borderRadius="12px">
                    <Box>
                      <Text fontWeight="600" fontSize="sm" color={isDark ? "#F8FAFC" : "#0F172A"}>
                        Press Enter to Send
                      </Text>
                      <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"}>
                        Send message instantly on Enter key
                      </Text>
                    </Box>
                    <Switch
                      colorScheme="blue"
                      isChecked={enterToSend}
                      onChange={(e) => setEnterToSend(e.target.checked)}
                    />
                  </HStack>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Box mt={4} display="flex" justifyContent="flex-end">
            <Button
              borderRadius="12px"
              bg="linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)"
              color="white"
              _hover={{ bg: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}
              size="sm"
              onClick={handleSave}
            >
              Save Preferences
            </Button>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SettingsModal;

