import React from "react";
import { useChatState } from "../context/chatProvider";
import { Box } from "@chakra-ui/react";
import SingleChat from "./SingleChat";

const ChatBox = ({ fetchAgain, setFetchAgain }) => {
  const { selectedChat } = useChatState();

  return (
    <Box
      className="glass-panel glass-chat-panel"
      display={{ base: selectedChat ? "flex" : "none", md: "flex" }}
      flex="1"
      h="100%"
      bg="white"
      overflow="hidden"
      position="relative"
    >
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
    </Box>
  );
};

export default ChatBox;
