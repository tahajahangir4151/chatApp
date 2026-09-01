import React, { useState } from "react";
import {
  Box,
  Flex,
  Tooltip,
  Text,
  IconButton,
  Badge,
} from "@chakra-ui/react";
import {
  IoChatbubblesOutline,
  IoChatbubbles,
  IoPeopleOutline,
  IoCallOutline,
  IoNotificationsOutline,
  IoBookmarkOutline,
  IoSettingsOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { useChatState } from "../../context/chatProvider";

const NAV_ITEMS = [
  { id: "chats", label: "Chats", icon: IoChatbubblesOutline, activeIcon: IoChatbubbles },
  { id: "contacts", label: "Contacts", icon: IoPeopleOutline, activeIcon: IoPeopleOutline },
  { id: "groups", label: "Groups", icon: HiOutlineUserGroup, activeIcon: HiOutlineUserGroup },
  { id: "calls", label: "Calls", icon: IoCallOutline, activeIcon: IoCallOutline },
  { id: "notifications", label: "Notifications", icon: IoNotificationsOutline, activeIcon: IoNotificationsOutline },
  { id: "saved", label: "Saved Messages", icon: IoBookmarkOutline, activeIcon: IoBookmarkOutline },
  { id: "settings", label: "Settings", icon: IoSettingsOutline, activeIcon: IoSettingsOutline },
];

const NavSidebar = ({ activeTab = "chats", onTabChange, onOpenSettings }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { notification } = useChatState();

  const handleItemClick = (id) => {
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
      bg="white"
      borderRight="1px solid"
      borderColor="#E2E8F0"
      h="100%"
      w={isCollapsed ? "64px" : "200px"}
      transition="width 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      display={{ base: "none", md: "flex" }}
      flexDirection="column"
      justifyContent="space-between"
      py={3}
      px={2}
      userSelect="none"
      zIndex={20}
    >
      {/* Top Nav Items */}
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
              <Flex
                align="center"
                px={isCollapsed ? 0 : 3}
                py={2.5}
                borderRadius="12px"
                cursor="pointer"
                transition="all 0.15s ease"
                bg={isActive ? "#EFF6FF" : "transparent"}
                color={isActive ? "#2563EB" : "#64748B"}
                fontWeight={isActive ? "600" : "500"}
                justify={isCollapsed ? "center" : "flex-start"}
                _hover={{
                  bg: isActive ? "#EFF6FF" : "#F1F5F9",
                  color: "#2563EB",
                }}
                onClick={() => handleItemClick(item.id)}
                position="relative"
              >
                {/* Active indicator bar */}
                {isActive && (
                  <Box
                    position="absolute"
                    left={isCollapsed ? "2px" : "4px"}
                    top="10px"
                    bottom="10px"
                    w="3px"
                    bg="#2563EB"
                    borderRadius="2px"
                  />
                )}

                <Box position="relative">
                  <Icon size={22} />
                  {unreadCount > 0 && (
                    <Badge
                      position="absolute"
                      top="-4px"
                      right="-6px"
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
                </Box>

                {!isCollapsed && (
                  <Text ml={3} fontSize="14px" whiteSpace="nowrap">
                    {item.label}
                  </Text>
                )}
              </Flex>
            </Tooltip>
          );
        })}
      </Flex>

      {/* Bottom Nav Items: Settings + Collapse Toggle */}
      <Flex direction="column" gap={1} pt={2} borderTop="1px solid #F1F5F9">
        <Tooltip
          label="Settings"
          placement="right"
          isDisabled={!isCollapsed}
          hasArrow
        >
          <Flex
            align="center"
            px={isCollapsed ? 0 : 3}
            py={2.5}
            borderRadius="12px"
            cursor="pointer"
            transition="all 0.15s ease"
            color="#64748B"
            justify={isCollapsed ? "center" : "flex-start"}
            _hover={{ bg: "#F1F5F9", color: "#2563EB" }}
            onClick={() => handleItemClick("settings")}
          >
            <IoSettingsOutline size={22} />
            {!isCollapsed && (
              <Text ml={3} fontSize="14px" fontWeight="500">
                Settings
              </Text>
            )}
          </Flex>
        </Tooltip>

        {/* Collapse toggle */}
        <Tooltip
          label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          placement="right"
          hasArrow
        >
          <IconButton
            size="sm"
            variant="ghost"
            color="#94A3B8"
            _hover={{ color: "#2563EB", bg: "#F1F5F9" }}
            aria-label="Toggle navigation rail"
            icon={
              isCollapsed ? (
                <IoChevronForwardOutline size={18} />
              ) : (
                <IoChevronBackOutline size={18} />
              )
            }
            onClick={() => setIsCollapsed(!isCollapsed)}
            mx={isCollapsed ? "auto" : 2}
          />
        </Tooltip>
      </Flex>
    </Box>
  );
};

export default NavSidebar;
