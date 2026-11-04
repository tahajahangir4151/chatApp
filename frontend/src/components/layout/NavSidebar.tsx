import React, { useState } from "react";
import {
  Box,
  Flex,
  Tooltip,
  Text,
  Badge,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import {
  IoChatbubblesOutline,
  IoChatbubbles,
  IoPeopleOutline,
  IoCallOutline,
  IoNotificationsOutline,
  IoBookmarkOutline,
  IoSettingsOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { useChatState } from "../../context/chatProvider";
import { useTheme } from "../../context/themeContext";

interface NavItem {
  id: string;
  label: string;
  icon: any;
  activeIcon: any;
}

const NAV_ITEMS: NavItem[] = [
  { id: "chats", label: "Chats", icon: IoChatbubblesOutline, activeIcon: IoChatbubbles },
  { id: "contacts", label: "Contacts", icon: IoPeopleOutline, activeIcon: IoPeopleOutline },
  { id: "groups", label: "Groups", icon: HiOutlineUserGroup, activeIcon: HiOutlineUserGroup },
  { id: "calls", label: "Calls", icon: IoCallOutline, activeIcon: IoCallOutline },
  { id: "notifications", label: "Notifications", icon: IoNotificationsOutline, activeIcon: IoNotificationsOutline },
  { id: "saved", label: "Saved Messages", icon: IoBookmarkOutline, activeIcon: IoBookmarkOutline },
  { id: "settings", label: "Settings", icon: IoSettingsOutline, activeIcon: IoSettingsOutline },
];

interface NavSidebarProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onOpenSettings?: () => void;
}

const NavSidebar: React.FC<NavSidebarProps> = ({
  activeTab = "chats",
  onTabChange,
  onOpenSettings,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { notification } = useChatState();
  const { isDark } = useTheme();

  const handleItemClick = (id: string) => {
    if (id === "settings" && onOpenSettings) {
      onOpenSettings();
      return;
    }
    if (onTabChange) {
      onTabChange(id);
    }
  };

  return (
    <Box
      as="nav"
      className="glass-panel glass-nav-sidebar"
      bg={isDark ? "rgba(15, 23, 42, 0.65)" : "white"}
      borderRight="1px solid"
      borderColor={isDark ? "rgba(255, 255, 255, 0.10)" : "#E2E8F0"}
      h="100%"
      w={isCollapsed ? "68px" : "210px"}
      transition="width 0.32s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease"
      willChange="width"
      overflow="hidden"
      display={{ base: "none", md: "flex" }}
      flexDirection="column"
      justifyContent="space-between"
      py={3}
      px={2}
      userSelect="none"
      zIndex={20}
    >
      <Flex direction="column" gap={1}>
        {NAV_ITEMS.slice(0, 6).map((item) => {
          const isActive = activeTab === item.id;
          const Icon = isActive ? item.activeIcon : item.icon;
          const unreadCount =
            item.id === "notifications"
              ? notification?.length || 0
              : 0;

          return (
            <Tooltip
              key={item.id}
              label={item.label}
              placement="right"
              isDisabled={!isCollapsed}
              hasArrow
            >
              <Box position="relative">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  whileHover={{
                    backgroundColor: !isActive
                      ? isDark
                        ? "rgba(255, 255, 255, 0.06)"
                        : "#F1F5F9"
                      : undefined,
                  }}
                  onClick={() => handleItemClick(item.id)}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    height: "44px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    color: isActive
                      ? isDark
                        ? "#60A5FA"
                        : "#2563EB"
                      : isDark
                      ? "#94A3B8"
                      : "#64748B",
                    fontWeight: isActive ? 600 : 500,
                    transition: "color 0.2s ease",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "12px",
                        backgroundColor: isDark
                          ? "rgba(37, 99, 235, 0.22)"
                          : "#EFF6FF",
                        boxShadow: isDark
                          ? "inset 0 0 0 1px rgba(96, 165, 250, 0.18)"
                          : "inset 0 0 0 1px rgba(37, 99, 235, 0.12)",
                        zIndex: 1,
                      }}
                    />
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      style={{
                        position: "absolute",
                        left: "3px",
                        top: "10px",
                        bottom: "10px",
                        width: "3.5px",
                        borderRadius: "9999px",
                        backgroundColor: isDark ? "#60A5FA" : "#2563EB",
                        boxShadow: isDark
                          ? "0 0 10px rgba(96, 165, 250, 0.7)"
                          : "0 0 8px rgba(37, 99, 235, 0.6)",
                        zIndex: 2,
                      }}
                    />
                  )}

                  <Flex
                    w="52px"
                    minW="52px"
                    h="100%"
                    align="center"
                    justify="center"
                    position="relative"
                    zIndex={3}
                  >
                    <motion.div
                      animate={{ scale: isActive ? [1, 1.15, 1] : 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Icon size={22} />
                    </motion.div>
                    {unreadCount > 0 && (
                      <Badge
                        position="absolute"
                        top="6px"
                        right="10px"
                        bg="#EF4444"
                        color="white"
                        borderRadius="full"
                        fontSize="10px"
                        px="4px"
                        py="1px"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Flex>

                  <Box
                    whiteSpace="nowrap"
                    overflow="hidden"
                    opacity={isCollapsed ? 0 : 1}
                    maxW={isCollapsed ? "0px" : "140px"}
                    transform={isCollapsed ? "translateX(-10px)" : "translateX(0)"}
                    transition="max-width 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
                    pointerEvents={isCollapsed ? "none" : "auto"}
                    position="relative"
                    zIndex={3}
                  >
                    <Text fontSize="14px" lineHeight="1" pr={2}>
                      {item.label}
                    </Text>
                  </Box>
                </motion.div>
              </Box>
            </Tooltip>
          );
        })}
      </Flex>

      <Flex
        direction="column"
        gap={1}
        pt={2}
        borderTop="1px solid"
        borderColor={isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9"}
      >
        <Tooltip
          label="Settings"
          placement="right"
          isDisabled={!isCollapsed}
          hasArrow
        >
          <Box position="relative">
            <motion.div
              whileTap={{ scale: 0.95 }}
              whileHover={{
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.06)"
                  : "#F1F5F9",
              }}
              onClick={() => handleItemClick("settings")}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                height: "44px",
                borderRadius: "12px",
                cursor: "pointer",
                color: isDark ? "#94A3B8" : "#64748B",
                transition: "color 0.2s ease",
              }}
            >
              <Flex
                w="52px"
                minW="52px"
                h="100%"
                align="center"
                justify="center"
              >
                <IoSettingsOutline size={22} />
              </Flex>

              <Box
                whiteSpace="nowrap"
                overflow="hidden"
                opacity={isCollapsed ? 0 : 1}
                maxW={isCollapsed ? "0px" : "140px"}
                transform={isCollapsed ? "translateX(-10px)" : "translateX(0)"}
                transition="max-width 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
                pointerEvents={isCollapsed ? "none" : "auto"}
              >
                <Text fontSize="14px" fontWeight="500" lineHeight="1" pr={2}>
                  Settings
                </Text>
              </Box>
            </motion.div>
          </Box>
        </Tooltip>

        <Tooltip
          label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          placement="right"
          hasArrow
        >
          <Box position="relative">
            <motion.div
              whileTap={{ scale: 0.95 }}
              whileHover={{
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.06)"
                  : "#F1F5F9",
              }}
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                height: "40px",
                borderRadius: "12px",
                cursor: "pointer",
                color: isDark ? "#94A3B8" : "#64748B",
                transition: "color 0.2s ease",
              }}
            >
              <Flex
                w="52px"
                minW="52px"
                h="100%"
                align="center"
                justify="center"
              >
                <Box
                  transform={isCollapsed ? "rotate(0deg)" : "rotate(180deg)"}
                  transition="transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <IoChevronForwardOutline size={18} />
                </Box>
              </Flex>

              <Box
                whiteSpace="nowrap"
                overflow="hidden"
                opacity={isCollapsed ? 0 : 1}
                maxW={isCollapsed ? "0px" : "140px"}
                transform={isCollapsed ? "translateX(-10px)" : "translateX(0)"}
                transition="max-width 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
                pointerEvents={isCollapsed ? "none" : "auto"}
              >
                <Text fontSize="13px" fontWeight="500" lineHeight="1" pr={2}>
                  Collapse
                </Text>
              </Box>
            </motion.div>
          </Box>
        </Tooltip>
      </Flex>
    </Box>
  );
};

export default NavSidebar;

