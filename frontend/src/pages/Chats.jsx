import React, { useState } from "react";
import { useChatState } from "../context/chatProvider";
import { Flex, useDisclosure } from "@chakra-ui/react";
import TopBar from "../components/layout/TopBar";
import NavSidebar from "../components/layout/NavSidebar";
import MyChats from "../components/MyChats";
import ChatBox from "../components/ChatBox";
import SettingsModal from "../components/modals/SettingsModal";
import OfflineBanner from "../components/common/OfflineBanner";

const Chats = () => {
  const { user } = useChatState();
  const [fetchAgain, setFetchAgain] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("chats");

  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onClose: onSettingsClose,
  } = useDisclosure();

  return (
    <Flex direction="column" w="100%" h="100vh" overflow="hidden" bg="#F8FAFC">
      {/* Polished Top Navigation Bar */}
      {user && <TopBar onOpenSettings={onSettingsOpen} />}

      {/* WhatsApp-style Offline & Outbox Sync Alert Banner */}
      <OfflineBanner token={user?.data?.token || user?.token} />

      {/* Main 3-Pane Messaging Body */}
      <Flex flex="1" w="100%" h="calc(100vh - 60px)" overflow="hidden">
        {/* Left Navigation Rail (Collapsible) */}
        {user && (
          <NavSidebar
            activeTab={activeNavTab}
            onTabChange={setActiveNavTab}
            onOpenSettings={onSettingsOpen}
          />
        )}

        {/* Conversation List Sidebar */}
        {user && <MyChats fetchAgain={fetchAgain} />}

        {/* Active Chat Area */}
        {user && (
          <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
        )}
      </Flex>

      {/* Global Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={onSettingsClose} />
    </Flex>
  );
};

export default Chats;
