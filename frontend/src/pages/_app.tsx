import type { AppProps } from "next/app";
import Head from "next/head";
import { ChakraProvider } from "@chakra-ui/react";
import ThemeProvider from "../context/themeContext";
import ChatProvider from "../context/chatProvider";
import "../components/styles.css";
import "../App.css";
import "../index.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Talk-A-Tive - Realtime Chat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ChakraProvider>
        <ThemeProvider>
          <ChatProvider>
            <Component {...pageProps} />
          </ChatProvider>
        </ThemeProvider>
      </ChakraProvider>
    </>
  );
}

