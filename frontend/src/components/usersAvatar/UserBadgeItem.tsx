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
      px={2}
      py={1}
      borderRadius={"lg"}
      m={1}
      mb={2}
      fontSize={12}
      backgroundColor="purple"
      color="white"
      cursor={"pointer"}
      onClick={handleFunction}
    >
      {user.name}
      <CloseIcon pl={1} />
    </Box>
  );
};

export default UserBadgeItem;

