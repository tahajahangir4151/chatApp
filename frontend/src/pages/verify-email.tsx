import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  Spinner,
  Input,
  FormControl,
  FormLabel,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import {
  IoCheckmarkCircle,
  IoArrowForward,
  IoShieldCheckmarkOutline,
  IoRefreshOutline,
} from "react-icons/io5";
import axios from "axios";
import { useChatState } from "../context/chatProvider";

const VerifyEmail: React.FC = () => {
  const router = useRouter();
  const { token, email: emailParam } = router.query;
  const toast = useToast();
  const { setUser } = useChatState();

  const [loading, setLoading] = useState(Boolean(token));
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [email, setEmail] = useState((emailParam as string) || "");
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (emailParam && typeof emailParam === "string") {
      setEmail(emailParam);
    }
  }, [emailParam]);

  useEffect(() => {
    if (!token || typeof token !== "string") return;

    const verifyToken = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/user/verify-email?token=${token}`);
        setSuccess(true);
        setLoading(false);

        localStorage.setItem("userInfo", JSON.stringify(data));
        setUser(data);

        toast({
          title: "Email Verified!",
          description: "Your account is now fully active.",
          status: "success",
          duration: 2500,
        });
      } catch (err: any) {
        setLoading(false);
        setErrorMsg(
          err.response?.data?.message || "Verification link is invalid or has expired."
        );
      }
    };

    verifyToken();
  }, [token, setUser, toast]);

  const handleManualVerify = async () => {
    if (!email.trim() || !otp.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your email and the 6-digit verification code.",
        status: "warning",
        duration: 2500,
      });
      return;
    }

    try {
      setVerifyingOtp(true);
      const { data } = await axios.post("/api/user/verify-otp", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      setSuccess(true);
      setVerifyingOtp(false);

      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);

      toast({
        title: "Account Verified! 🎉",
        description: "Welcome to Talk-A-Tive.",
        status: "success",
        duration: 2500,
      });
    } catch (err: any) {
      setVerifyingOtp(false);
      toast({
        title: "Verification Failed",
        description: err.response?.data?.message || "Invalid or expired code",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email to receive a new 6-digit code.",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    try {
      setResending(true);
      await axios.post("/api/user/resend-otp", { email: email.trim().toLowerCase() });
      setResending(false);
      toast({
        title: "Verification Code Sent!",
        description: `Check your inbox at ${email} for the 6-digit code.`,
        status: "success",
        duration: 3500,
      });
    } catch (err: any) {
      setResending(false);
      toast({
        title: "Resend Failed",
        description: err.response?.data?.message || "Could not send verification code",
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-ambient-glow-1" />
      <div className="auth-ambient-glow-2" />

      <div className="auth-glass-card" style={{ textAlign: "center", padding: "40px 28px", maxWidth: "440px" }}>
        {loading ? (
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="3px" />
            <Text fontSize="md" fontWeight="600" color="#1E293B">
              Verifying your account...
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
              Account Verified Successfully!
            </Text>
            <Text fontSize="sm" color="#64748B" maxW="340px">
              Your account has been created and verified. You can now chat and connect with your friends.
            </Text>
            <Button
              className="auth-btn-primary"
              onClick={() => router.push("/chats")}
              rightIcon={<IoArrowForward size={16} />}
              mt={2}
              py={5}
            >
              Continue to Talk-A-Tive
            </Button>
          </VStack>
        ) : (
          <VStack spacing={4} align="stretch">
            <Box
              w="60px"
              h="60px"
              borderRadius="18px"
              bg="rgba(37,99,235,0.1)"
              color="#2563EB"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mx="auto"
            >
              <IoShieldCheckmarkOutline size={34} />
            </Box>

            <Box>
              <Text fontSize="20px" fontWeight="800" color="#0F172A">
                Enter Verification Code
              </Text>
              <Text fontSize="12px" color="#64748B" mt={1}>
                {errorMsg ? errorMsg : "Enter your email and the 6-digit code sent to your inbox"}
              </Text>
            </Box>

            <FormControl isRequired textAlign="left">
              <FormLabel fontSize="12px" fontWeight="600" color="#475569" mb={1}>
                Email Address
              </FormLabel>
              <Input
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                borderRadius="12px"
                bg="#F8FAFC"
                fontSize="14px"
              />
            </FormControl>

            <FormControl isRequired textAlign="left">
              <FormLabel fontSize="12px" fontWeight="600" color="#475569" mb={1}>
                6-Digit Verification Code
              </FormLabel>
              <Input
                className="auth-otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </FormControl>

            <Button
              className="auth-btn-primary"
              onClick={handleManualVerify}
              isLoading={verifyingOtp}
              isDisabled={otp.length !== 6 || !email}
              py={5}
              mt={1}
            >
              Verify & Complete Registration
            </Button>

            <HStack justify="space-between" pt={2}>
              <Button
                variant="ghost"
                size="xs"
                color="#64748B"
                onClick={() => router.push("/")}
              >
                Back to Sign In
              </Button>
              <Button
                variant="link"
                size="xs"
                color="#2563EB"
                onClick={handleResend}
                isLoading={resending}
                leftIcon={<IoRefreshOutline size={12} />}
              >
                Resend Code
              </Button>
            </HStack>
          </VStack>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

