import React, { useState } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  VStack,
  HStack,
  Text,
  Box,
  Divider,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import {
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoFlashOutline,
  IoArrowForward,
} from "react-icons/io5";
import axios from "axios";
import { useRouter } from "next/router";
import { useChatState } from "../../context/chatProvider";

interface LoginProps {
  onSwitchToSignup: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToSignup }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [loginOtp, setLoginOtp] = useState("");
  const [verifyingLoginOtp, setVerifyingLoginOtp] = useState(false);

  const handleClickShow = () => setShow(!show);
  const toast = useToast();
  const router = useRouter();
  const { setUser } = useChatState();

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    try {
      setResending(true);
      await axios.post("/api/user/resend-otp", { email: unverifiedEmail });
      setResending(false);
      toast({
        title: "Verification Code Sent!",
        description: `Please check your inbox at ${unverifiedEmail} for your 6-digit code.`,
        status: "success",
        duration: 3500,
        position: "top",
      });
    } catch (err: any) {
      setResending(false);
      toast({
        title: "Resend Failed",
        description: err.response?.data?.message || "Could not resend email",
        status: "error",
        duration: 3000,
        position: "top",
      });
    }
  };

  const handleVerifyOtpLogin = async () => {
    if (!unverifiedEmail || loginOtp.trim().length !== 6) return;
    try {
      setVerifyingLoginOtp(true);
      const { data } = await axios.post("/api/user/verify-otp", {
        email: unverifiedEmail,
        otp: loginOtp.trim(),
      });
      setVerifyingLoginOtp(false);
      toast({
        title: "Account Verified! 🎉",
        description: "Successfully signed in to Talk-A-Tive.",
        status: "success",
        duration: 2000,
        position: "top",
      });
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      router.push("/chats");
    } catch (err: any) {
      setVerifyingLoginOtp(false);
      toast({
        title: "Verification Failed",
        description: err.response?.data?.message || "Invalid or expired code",
        status: "error",
        duration: 3000,
        position: "top",
      });
    }
  };

  const submitHandler = async () => {
    setLoading(true);

    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        status: "warning",
        duration: 2500,
        isClosable: true,
        position: "top",
      });
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        status: "warning",
        duration: 2500,
        isClosable: true,
        position: "top",
      });
      setLoading(false);
      return;
    }

    try {
      const config = {
        headers: { "Content-type": "application/json" },
      };
      const { data } = await axios.post(
        "/api/user/login",
        { email, password },
        config
      );

      toast({
        title: "Welcome Back!",
        description: "Successfully signed in to Talk-A-Tive.",
        status: "success",
        duration: 2000,
        isClosable: true,
        position: "top",
      });

      setLoading(false);
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      router.push("/chats");
    } catch (error: any) {
      if (error.response?.data?.needsVerification) {
        setUnverifiedEmail(error.response.data.email || email);
      }
      toast({
        title: "Sign In Failed",
        description:
          error.response?.data?.message || "Invalid email or password",
        status: "error",
        duration: 3500,
        isClosable: true,
        position: "top",
      });
      setLoading(false);
    }
  };

  const fillGuestCredentials = () => {
    setEmail("guest@gmail.com");
    setPassword("guest123*");
    setUnverifiedEmail(null);
    toast({
      title: "Guest Credentials Applied",
      description: "Click 'Sign In' to enter the demo account.",
      status: "info",
      duration: 2000,
      isClosable: true,
      position: "top",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submitHandler();
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      {unverifiedEmail && (
        <Box
          p={3.5}
          bg="#FEF2F2"
          border="1px solid #FECACA"
          borderRadius="12px"
          fontSize="xs"
          color="#991B1B"
        >
          <Text fontWeight="700" mb={1}>
            ⚠️ Verification Code Required
          </Text>
          <Text mb={2} color="#7F1D1D">
            Your account is not verified yet. Enter the 6-digit code sent to <strong>{unverifiedEmail}</strong>:
          </Text>
          <HStack mb={2}>
            <Input
              size="sm"
              placeholder="6-digit code"
              value={loginOtp}
              onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              bg="white"
              borderRadius="8px"
              letterSpacing="3px"
              fontWeight="bold"
            />
            <Button
              size="sm"
              colorScheme="blue"
              onClick={handleVerifyOtpLogin}
              isLoading={verifyingLoginOtp}
              isDisabled={loginOtp.length !== 6}
            >
              Verify
            </Button>
          </HStack>
          <Button
            size="xs"
            variant="ghost"
            color="#991B1B"
            onClick={handleResendVerification}
            isLoading={resending}
            p={0}
            h="auto"
          >
            Resend 6-Digit Code
          </Button>
        </Box>
      )}

      <FormControl id="login-email" isRequired>
        <FormLabel fontSize="12px" fontWeight="600" color="#475569" mb="5px">
          Email Address
        </FormLabel>
        <InputGroup size="md">
          <InputLeftElement pointerEvents="none" color="#94A3B8">
            <IoMailOutline size={18} />
          </InputLeftElement>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            borderRadius="12px"
            bg="#F8FAFC"
            borderColor="#E2E8F0"
            fontSize="14px"
            _focus={{
              bg: "white",
              borderColor: "#3B82F6",
              boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)",
            }}
          />
        </InputGroup>
      </FormControl>

      <FormControl id="login-password" isRequired>
        <HStack justify="space-between" mb="5px">
          <FormLabel fontSize="12px" fontWeight="600" color="#475569" m={0}>
            Password
          </FormLabel>
          <Text
            fontSize="11px"
            color="#2563EB"
            fontWeight="500"
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
            onClick={() => {
              toast({
                title: "Password Reset",
                description: "Contact your admin or use demo credentials.",
                status: "info",
                duration: 2500,
              });
            }}
          >
            Forgot password?
          </Text>
        </HStack>
        <InputGroup size="md">
          <InputLeftElement pointerEvents="none" color="#94A3B8">
            <IoLockClosedOutline size={18} />
          </InputLeftElement>
          <Input
            type={show ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            borderRadius="12px"
            bg="#F8FAFC"
            borderColor="#E2E8F0"
            fontSize="14px"
            _focus={{
              bg: "white",
              borderColor: "#3B82F6",
              boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)",
            }}
          />
          <InputRightElement width="3rem">
            <IconButton
              size="sm"
              variant="ghost"
              color="#94A3B8"
              _hover={{ color: "#2563EB" }}
              icon={show ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
              onClick={handleClickShow}
              aria-label={show ? "Hide password" : "Show password"}
            />
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button
        className="auth-btn-primary"
        onClick={submitHandler}
        isLoading={loading}
        loadingText="Signing In..."
        mt={1}
        rightIcon={<IoArrowForward size={16} />}
      >
        Sign In to Talk-A-Tive
      </Button>

      <HStack my={1}>
        <Divider borderColor="#E2E8F0" />
        <Text fontSize="11px" color="#94A3B8" px={2} whiteSpace="nowrap">
          OR
        </Text>
        <Divider borderColor="#E2E8F0" />
      </HStack>

      <button
        type="button"
        className="auth-btn-demo"
        onClick={fillGuestCredentials}
      >
        <IoFlashOutline size={16} color="#F59E0B" />
        <span>Try Demo Account (1-Click Fill)</span>
      </button>

      <Box textAlign="center" pt={1}>
        <Text fontSize="13px" color="#64748B">
          Don't have an account?{" "}
          <Text
            as="span"
            color="#2563EB"
            fontWeight="600"
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
            onClick={onSwitchToSignup}
          >
            Create an account
          </Text>
        </Text>
      </Box>
    </VStack>
  );
};

export default Login;

