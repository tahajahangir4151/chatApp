import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/router";

export interface ChatContextType {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  selectedChat: any;
  setSelectedChat: React.Dispatch<React.SetStateAction<any>>;
  chats: any[];
  setChats: React.Dispatch<React.SetStateAction<any[]>>;
  notification: any[];
  setNotification: React.Dispatch<React.SetStateAction<any[]>>;
}

const ChatContext = createContext<ChatContextType>({
  user: null,
  setUser: () => { },
  selectedChat: null,
  setSelectedChat: () => { },
  chats: [],
  setChats: () => { },
  notification: [],
  setNotification: () => { },
});

export const useChatState = () => {
  return useContext(ChatContext);
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [notification, setNotification] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("userInfo");
      if (stored) {
        const userInfo = JSON.parse(stored);
        setUser(userInfo);
      } else {
        const isPublic =
          router.pathname === "/" ||
          router.pathname.startsWith("/invite") ||
          router.pathname.startsWith("/verify-email");
        if (!isPublic) {
          router.push("/");
        }
      }
    } catch (e) {
      // ignore
    }
  }, [router.pathname]);

  return (
    <ChatContext.Provider
      value={{
        user,
        setUser,
        selectedChat,
        setSelectedChat,
        chats,
        setChats,
        notification,
        setNotification,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;

