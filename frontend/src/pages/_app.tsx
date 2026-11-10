import { useEffect } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ChakraProvider } from "@chakra-ui/react";
import ThemeProvider from "../context/themeContext";
import ChatProvider from "../context/chatProvider";
import { CallProvider } from "../context/callContext";
import IncomingCallModal from "../components/modals/IncomingCallModal";
import CallModal from "../components/modals/CallModal";
import GroupCallModal from "../components/modals/GroupCallModal";
import IncomingGroupCallModal from "../components/modals/IncomingGroupCallModal";
import { resetDocumentTitle } from "../utils/notificationService";
import "../components/styles.css";
import "../App.css";
import "../index.css";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.log("SW registration skipped:", err));
      }

      const handleFocus = () => {
        resetDocumentTitle();
      };
      window.addEventListener("focus", handleFocus);
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          resetDocumentTitle();
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, []);

  return (
    <>
      <Head>
        <title>Talk-A-Tive - Realtime Chat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ChakraProvider>
        <ThemeProvider>
          <ChatProvider>
            <CallProvider>
              <Component {...pageProps} />
              <IncomingCallModal />
              <CallModal />
              <IncomingGroupCallModal />
              <GroupCallModal />
            </CallProvider>
          </ChatProvider>
        </ThemeProvider>
      </ChakraProvider>
    </>
  );
}

