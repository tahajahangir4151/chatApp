import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { IUser } from "@/types/chat";
import UserAvatar from "../common/UserAvatar";

interface UserListItemProps {
  user: IUser;
  handleFunction: () => void;
}

const UserListItem: React.FC<UserListItemProps> = ({ user, handleFunction }) => {
  return (
    <Box
      onClick={handleFunction}
      cursor={"pointer"}
      bg={"#E8E8E8"}
      _hover={{
        background: "#38B2AC",
        color: "white",
      }}
      w={"100%"}
      display={"flex"}
      alignItems={"center"}
      color={"black"}
      px={3}
      py={2}
      mb={2}
      borderRadius={"lg"}
    >
      <Box mr={2}>
        <UserAvatar
          size="sm"
          name={user.name}
          src={user.pic}
          showStatus={false}
        />
      </Box>
      <Box>
        <Text>{user.name}</Text>
        <Text fontSize={"xs"}>
          <b>Email: </b>
          {user.email}
        </Text>
      </Box>
    </Box>
  );
};

export default UserListItem;

