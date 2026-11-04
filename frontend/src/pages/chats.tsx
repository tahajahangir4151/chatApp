import React, { useState, useEffect } from "react";
import { useChatState } from "../context/chatProvider";
import { Flex, useDisclosure } from "@chakra-ui/react";
import TopBar from "../components/layout/TopBar";
import NavSidebar from "../components/layout/NavSidebar";
import MyChats from "../components/MyChats";
import ChatBox from "../components/ChatBox";
import SettingsModal from "../components/modals/SettingsModal";
import OfflineBanner from "../components/common/OfflineBanner";

const Chats: React.FC = () => {
  const { user } = useChatState();
  const [fetchAgain, setFetchAgain] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("chats");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onClose: onSettingsClose,
  } = useDisclosure();

  return (
    <Flex direction="column" w="100%" h="100vh" overflow="hidden" className="glass-wallpaper chat-shell">
      {mounted && user && <TopBar onOpenSettings={onSettingsOpen} />}

      {mounted && <OfflineBanner token={user?.data?.token || user?.token} />}

      <Flex flex="1" w="100%" h="calc(100vh - 60px)" overflow="hidden" className="chat-workspace">
        {mounted && user && (
          <NavSidebar
            activeTab={activeNavTab}
            onTabChange={setActiveNavTab}
            onOpenSettings={onSettingsOpen}
          />
        )}

        {mounted && user && <MyChats fetchAgain={fetchAgain} />}

        {mounted && user && (
          <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
        )}
      </Flex>

      {mounted && <SettingsModal isOpen={isSettingsOpen} onClose={onSettingsClose} />}
    </Flex>
  );
};

export default Chats;

