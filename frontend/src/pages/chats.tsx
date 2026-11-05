import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useChatState } from "../context/chatProvider";
import { Flex, useDisclosure } from "@chakra-ui/react";
import TopBar from "../components/layout/TopBar";
import NavSidebar from "../components/layout/NavSidebar";
import MyChats from "../components/MyChats";
import ChatBox from "../components/ChatBox";
import SettingsModal from "../components/modals/SettingsModal";
import OfflineBanner from "../components/common/OfflineBanner";

const Chats: React.FC = () => {
  const { user, chats, setSelectedChat } = useChatState();
  const router = useRouter();
  const [fetchAgain, setFetchAgain] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("chats");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "SELECT_CHAT" && event.data.chatId) {
        const found = chats?.find((c) => c._id === event.data.chatId);
        if (found) {
          setSelectedChat(found);
        }
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    if (router.query.chatId && chats && chats.length > 0) {
      const found = chats.find((c) => c._id === router.query.chatId);
      if (found) {
        setSelectedChat(found);
      }
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, [chats, router.query.chatId, setSelectedChat]);

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

        {mounted && user && (
          <MyChats
            fetchAgain={fetchAgain}
            activeNavTab={activeNavTab}
            onTabChange={setActiveNavTab}
          />
        )}

        {mounted && user && (
          <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
        )}
      </Flex>

      {mounted && <SettingsModal isOpen={isSettingsOpen} onClose={onSettingsClose} />}
    </Flex>
  );
};

export default Chats;

