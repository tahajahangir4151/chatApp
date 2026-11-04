import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { IUser } from "@/types/chat";
import UserAvatar from "../common/UserAvatar";
import { useTheme } from "../../context/themeContext";

interface UserListItemProps {
  user: IUser;
  handleFunction: () => void;
}

const UserListItem: React.FC<UserListItemProps> = ({ user, handleFunction }) => {
  const { isDark } = useTheme();

  return (
    <Box
      onClick={handleFunction}
      cursor="pointer"
      bg={isDark ? "rgba(255, 255, 255, 0.06)" : "#F1F5F9"}
      border="1px solid"
      borderColor={isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0"}
      _hover={{
        background: isDark ? "rgba(59, 130, 246, 0.2)" : "#EFF6FF",
        borderColor: isDark ? "rgba(96, 165, 250, 0.4)" : "#BFDBFE",
        color: isDark ? "#FFFFFF" : "#1D4ED8",
      }}
      w="100%"
      display="flex"
      alignItems="center"
      color={isDark ? "#F8FAFC" : "#0F172A"}
      px={3}
      py={2.5}
      mb={2}
      borderRadius="12px"
      transition="all 0.2s ease"
    >
      <Box mr={3}>
        <UserAvatar
          size="sm"
          name={user.name}
          src={user.pic}
          showStatus={false}
        />
      </Box>
      <Box minW={0} flex="1">
        <Text fontWeight="600" fontSize="sm" noOfLines={1}>
          {user.name}
        </Text>
        <Text fontSize="xs" color={isDark ? "#94A3B8" : "#64748B"} noOfLines={1}>
          {user.email}
        </Text>
      </Box>
    </Box>
  );
};

export default UserListItem;

