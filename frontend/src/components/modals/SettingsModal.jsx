import React, { useState } from "react";
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

const SettingsModal = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [enterToSend, setEnterToSend] = useState(true);
  const toast = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      status: "success",
      duration: 1500,
      isClosable: true,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent borderRadius="16px">
        <ModalHeader pb={1}>Application Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Tabs variant="line" colorScheme="blue">
            <TabList mb={3}>
              <Tab fontSize="sm">
                <HStack spacing={2}>
                  <IoColorPaletteOutline />
                  <span>Appearance</span>
                </HStack>
              </Tab>
              <Tab fontSize="sm">
                <HStack spacing={2}>
                  <IoNotificationsOutline />
                  <span>Notifications</span>
                </HStack>
              </Tab>
              <Tab fontSize="sm">
                <HStack spacing={2}>
                  <IoShieldCheckmarkOutline />
                  <span>Chat & Privacy</span>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Appearance Tab */}
              <TabPanel px={1} py={2}>
                <VStack spacing={4} align="stretch">
                  <Box p={3} bg={theme === "dark" ? "gray.800" : "gray.50"} borderRadius="10px">
                    <Text fontWeight="600" fontSize="sm">
                      Theme
                    </Text>
                    <Text fontSize="xs" color="gray.500" mb={3}>
                      Choose between light and sleek dark mode
                    </Text>
                    <HStack spacing={3}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        variant={theme === "light" ? "solid" : "outline"}
                        leftIcon={<IoSunnyOutline size={16} />}
                        onClick={() => setTheme("light")}
                      >
                        Light Mode
                      </Button>
                      <Button
                        size="sm"
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

              {/* Notifications Tab */}
              <TabPanel px={1} py={2}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" p={3} bg="gray.50" borderRadius="10px">
                    <Box>
                      <Text fontWeight="600" fontSize="sm">Message Sound</Text>
                      <Text fontSize="xs" color="gray.500">Play audio sound on new messages</Text>
                    </Box>
                    <Switch
                      colorScheme="blue"
                      isChecked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                    />
                  </HStack>

                  <HStack justify="space-between" p={3} bg="gray.50" borderRadius="10px">
                    <Box>
                      <Text fontWeight="600" fontSize="sm">Desktop Alerts</Text>
                      <Text fontSize="xs" color="gray.500">Show notification popup when unfocused</Text>
                    </Box>
                    <Switch
                      colorScheme="blue"
                      isChecked={desktopNotifs}
                      onChange={(e) => setDesktopNotifs(e.target.checked)}
                    />
                  </HStack>
                </VStack>
              </TabPanel>

              {/* Chat & Privacy Tab */}
              <TabPanel px={1} py={2}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" p={3} bg="gray.50" borderRadius="10px">
                    <Box>
                      <Text fontWeight="600" fontSize="sm">Read Receipts</Text>
                      <Text fontSize="xs" color="gray.500">Show double blue check when messages are read</Text>
                    </Box>
                    <Switch
                      colorScheme="blue"
                      isChecked={readReceipts}
                      onChange={(e) => setReadReceipts(e.target.checked)}
                    />
                  </HStack>

                  <HStack justify="space-between" p={3} bg="gray.50" borderRadius="10px">
                    <Box>
                      <Text fontWeight="600" fontSize="sm">Press Enter to Send</Text>
                      <Text fontSize="xs" color="gray.500">Send message instantly on Enter key</Text>
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
            <Button colorScheme="blue" size="sm" onClick={handleSave}>
              Save Preferences
            </Button>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SettingsModal;
