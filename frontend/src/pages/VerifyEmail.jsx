import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  Spinner,
  Input,
  useToast,
} from "@chakra-ui/react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoMailOutline,
  IoArrowForward,
} from "react-icons/io5";
import axios from "axios";
import { useChatState } from "../context/chatProvider";
import "../components/styles.css";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const toast = useToast();
  const { setUser } = useChatState();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setLoading(false);
        setErrorMsg("No verification token found in URL.");
        return;
      }

      try {
        setLoading(true);
        const { data } = await axios.get(`/api/user/verify-email?token=${token}`);
        setSuccess(true);
        setLoading(false);

        // Store active session
        localStorage.setItem("userInfo", JSON.stringify(data));
        setUser(data);

        toast({
          title: "Email Verified!",
          description: "Your account is now fully active.",
          status: "success",
          duration: 2500,
        });
      } catch (err) {
        setLoading(false);
        setErrorMsg(
          err.response?.data?.message || "Verification link is invalid or has expired."
        );
      }
    };

    verify();
  }, [token, setUser, toast]);

  const handleResend = async () => {
    if (!resendEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email to receive a new link.",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    try {
      setResending(true);
      await axios.post("/api/user/resend-verification", { email: resendEmail.trim() });
      setResending(false);
      toast({
        title: "Verification Email Sent!",
        description: `Check your inbox at ${resendEmail}.`,
        status: "success",
        duration: 3000,
      });
    } catch (err) {
      setResending(false);
      toast({
        title: "Resend Failed",
        description: err.response?.data?.message || "Could not resend email",
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-ambient-glow-1" />
      <div className="auth-ambient-glow-2" />

      <div className="auth-glass-card" style={{ textAlign: "center", padding: "44px 30px" }}>
        {loading ? (
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="3px" />
            <Text fontSize="md" fontWeight="600" color="#1E293B">
              Verifying your email address...
            </Text>
          </VStack>
        ) : success ? (
          <VStack spacing={4}>
            <Box
              w="64px"
              h="64px"
              borderRadius="full"
              bg="#DCFCE7"
              color="#15803D"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <IoCheckmarkCircle size={44} />
            </Box>
            <Text fontSize="22px" fontWeight="800" color="#0F172A">
              Email Verified Successfully!
            </Text>
            <Text fontSize="sm" color="#64748B" maxW="340px">
              Your account has been activated. You can now chat and connect with your team.
            </Text>
            <Button
              className="auth-btn-primary"
              onClick={() => navigate("/api/chats")}
              rightIcon={<IoArrowForward size={16} />}
              mt={2}
              py={5}
            >
              Continue to Talk-A-Tive
            </Button>
          </VStack>
        ) : (
          <VStack spacing={4}>
            <Box
              w="64px"
              h="64px"
              borderRadius="full"
              bg="#FEE2E2"
              color="#DC2626"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <IoAlertCircleOutline size={40} />
            </Box>
            <Text fontSize="20px" fontWeight="700" color="#0F172A">
              Verification Failed
            </Text>
            <Text fontSize="sm" color="#64748B">
              {errorMsg}
            </Text>

            <Box w="100%" pt={3} textAlign="left">
              <Text fontSize="xs" fontWeight="600" color="#475569" mb={1.5}>
                Request a New Verification Link:
              </Text>
              <HStack>
                <Input
                  placeholder="Enter your registered email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  size="sm"
                  borderRadius="10px"
                  bg="#F8FAFC"
                />
                <Button
                  size="sm"
                  colorScheme="blue"
                  borderRadius="10px"
                  onClick={handleResend}
                  isLoading={resending}
                >
                  Resend
                </Button>
              </HStack>
            </Box>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              mt={2}
            >
              Back to Sign In
            </Button>
          </VStack>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
