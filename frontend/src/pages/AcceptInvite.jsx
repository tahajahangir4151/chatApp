import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Spinner,
  useToast,
  Badge,
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import {
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoMailOutline,
  IoPeopleOutline,
  IoChatbubblesOutline,
  IoArrowForward,
} from "react-icons/io5";
import axios from "axios";
import { useChatState } from "../context/chatProvider";
import UserAvatar from "../components/common/UserAvatar";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";
import "../components/styles.css";

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, setUser, setSelectedChat } = useChatState();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [authMode, setAuthMode] = useState("signup"); // "signup" | "login"

  const loggedUser = user?.data || user;

  // 1. Fetch invite details
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/invite/${token}`);
        setInviteData(data);
        if (data.hasAccount) {
          setAuthMode("login");
        } else {
          setAuthMode("signup");
        }
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setErrorMsg(
          err.response?.data?.message || "Invalid or expired invitation link."
        );
      }
    };

    if (token) {
      fetchInvite();
    }
  }, [token]);

  // 2. Accept invite when logged in
  const handleAcceptInvite = async () => {
    const activeToken = loggedUser?.token;
    if (!activeToken) {
      toast({
        title: "Authentication Required",
        description: "Please log in or create an account to accept this invite.",
        status: "warning",
        duration: 2500,
      });
      return;
    }

    try {
      setAccepting(true);
      const config = {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      };

      const { data } = await axios.post(`/api/invite/${token}/accept`, {}, config);

      toast({
        title: "Invitation Accepted!",
        description: `Entering ${inviteData?.inviteType === "group" ? "group conversation" : "chat"}...`,
        status: "success",
        duration: 2000,
      });

      setAccepting(false);
      if (data.chat) {
        setSelectedChat(data.chat);
      }
      navigate("/api/chats");
    } catch (err) {
      setAccepting(false);
      toast({
        title: "Could not accept invite",
        description: err.response?.data?.message || "Error processing invitation",
        status: "error",
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-glass-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <Spinner size="xl" color="blue.500" thickness="3px" mb={4} />
          <Text fontSize="md" fontWeight="600" color="#1E293B">
            Verifying invitation...
          </Text>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-glass-card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <Box
            w="56px"
            h="56px"
            borderRadius="full"
            bg="#FEE2E2"
            color="#DC2626"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
            mb={3}
          >
            <IoAlertCircleOutline size={32} />
          </Box>
          <Text fontSize="xl" fontWeight="700" color="#0F172A" mb={2}>
            Invitation Unavailable
          </Text>
          <Text fontSize="sm" color="#64748B" mb={5}>
            {errorMsg}
          </Text>
          <Button
            colorScheme="blue"
            borderRadius="12px"
            onClick={() => navigate("/")}
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const isGroup = inviteData?.inviteType === "group";
  const inviter = inviteData?.inviter || {};
  const chat = inviteData?.chat || {};

  return (
    <div className="auth-page-wrapper">
      <div className="auth-ambient-glow-1" />
      <div className="auth-ambient-glow-2" />

      <div className="auth-glass-card">
        {/* Top Header Card */}
        <VStack spacing={3} mb={5} textAlign="center">
          <UserAvatar
            name={inviter.name || "User"}
            src={inviter.pic}
            size="lg"
            showStatus={false}
          />
          <Box>
            <Badge
              colorScheme={isGroup ? "purple" : "blue"}
              borderRadius="full"
              px={3}
              py={0.5}
              fontSize="11px"
              mb={1}
            >
              {isGroup ? "Group Invitation" : "Chat Invitation"}
            </Badge>
            <Text fontSize="xl" fontWeight="800" color="#0F172A">
              {inviter.name} invited you!
            </Text>
            <Text fontSize="sm" color="#64748B">
              {isGroup
                ? `Join "${chat.chatName || "Group Chat"}" on Talk-A-Tive`
                : "Connect and chat 1-on-1 on Talk-A-Tive"}
            </Text>
          </Box>
        </VStack>

        {/* If user is ALREADY logged in */}
        {loggedUser ? (
          <VStack spacing={4} align="stretch" py={3}>
            <Box
              p={3}
              bg="#F8FAFC"
              borderRadius="12px"
              border="1px solid #E2E8F0"
              fontSize="xs"
              color="#475569"
            >
              <Text>
                Logged in as: <strong>{loggedUser.name}</strong> ({loggedUser.email})
              </Text>
            </Box>

            <Button
              className="auth-btn-primary"
              onClick={handleAcceptInvite}
              isLoading={accepting}
              loadingText="Accepting..."
              rightIcon={<IoArrowForward size={16} />}
              py={6}
            >
              Accept Invite & Start Chatting
            </Button>
          </VStack>
        ) : (
          /* User is NOT logged in: Prompt to create account or log in */
          <Box>
            <Box mb={4} p={3} bg="#EFF6FF" borderRadius="12px" border="1px solid #BFDBFE">
              <Text fontSize="xs" color="#1E40AF" textAlign="center">
                {authMode === "signup"
                  ? "Create an account to accept this invite and start chatting right away!"
                  : "Sign in to accept this invitation."}
              </Text>
            </Box>

            {/* Switch between Signup and Login */}
            <div className="auth-tab-bar">
              <button
                type="button"
                className={`auth-tab-btn ${authMode === "signup" ? "active" : ""}`}
                onClick={() => setAuthMode("signup")}
              >
                Create Account
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${authMode === "login" ? "active" : ""}`}
                onClick={() => setAuthMode("login")}
              >
                Sign In
              </button>
            </div>

            {authMode === "signup" ? (
              <Signup onSwitchToLogin={() => setAuthMode("login")} />
            ) : (
              <Login onSwitchToSignup={() => setAuthMode("signup")} />
            )}
          </Box>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
