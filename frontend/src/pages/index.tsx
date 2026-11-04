import React, { useState, useEffect } from "react";
import { Box, Text, Flex } from "@chakra-ui/react";
import { BsChatDotsFill } from "react-icons/bs";
import { IoShieldCheckmarkOutline } from "react-icons/io5";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";
import { useRouter } from "next/router";

const Home: React.FC = () => {
  const [tabIndex, setTabIndex] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    try {
      const user = localStorage.getItem("userInfo");
      if (user) {
        router.push("/chats");
      }
    } catch (e) {
      // ignore
    }
  }, [router]);

  return (
    <div className="auth-page-wrapper">
      <div className="auth-ambient-glow-1" />
      <div className="auth-ambient-glow-2" />

      <div className="auth-glass-card">
        <Flex direction="column" align="center" textAlign="center" mb={5}>
          <div className="auth-logo-badge">
            <BsChatDotsFill size={26} />
          </div>
          <Text
            fontSize="26px"
            fontWeight="800"
            color="#0F172A"
            letterSpacing="-0.5px"
            lineHeight="1.2"
          >
            Talk-A-Tive
          </Text>
          <Text fontSize="13px" color="#64748B" mt={1}>
            Real-time messaging with modern privacy
          </Text>
        </Flex>

        <div className="auth-tab-bar">
          <button
            type="button"
            className={`auth-tab-btn ${tabIndex === 0 ? "active" : ""}`}
            onClick={() => setTabIndex(0)}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tabIndex === 1 ? "active" : ""}`}
            onClick={() => setTabIndex(1)}
          >
            Create Account
          </button>
        </div>

        <Box>
          {tabIndex === 0 ? (
            <Login onSwitchToSignup={() => setTabIndex(1)} />
          ) : (
            <Signup onSwitchToLogin={() => setTabIndex(0)} />
          )}
        </Box>

        <Flex
          justify="center"
          align="center"
          gap={1.5}
          mt={6}
          pt={4}
          borderTop="1px solid #F1F5F9"
          color="#94A3B8"
          fontSize="11px"
        >
          <IoShieldCheckmarkOutline size={14} color="#10B981" />
          <span>Secured with End-to-End Encryption</span>
        </Flex>
      </div>
    </div>
  );
};

export default Home;

