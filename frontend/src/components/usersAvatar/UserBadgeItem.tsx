import { CloseIcon } from "@chakra-ui/icons";
import { Box } from "@chakra-ui/react";
import React from "react";
import { IUser } from "@/types/chat";

interface UserBadgeItemProps {
  user: IUser;
  handleFunction: () => void;
  admin?: IUser | string;
}

const UserBadgeItem: React.FC<UserBadgeItemProps> = ({ user, handleFunction }) => {
  return (
    <Box
      px={2.5}
      py={1}
      borderRadius="full"
      m={1}
      mb={2}
      fontSize="12px"
      fontWeight="600"
      bg="linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)"
      boxShadow="0 2px 8px rgba(124, 58, 237, 0.35)"
      color="white"
      cursor="pointer"
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      transition="all 0.18s ease"
      _hover={{
        transform: "scale(1.04)",
        bg: "linear-gradient(135deg, #6D28D9 0%, #7E22CE 100%)",
      }}
      onClick={handleFunction}
    >
      <span>{user.name}</span>
      <CloseIcon fontSize="8px" />
    </Box>
  );
};

export default UserBadgeItem;

