import React, { useState, useRef, useEffect } from "react";
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
  IconButton,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import {
  IoPersonOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoShieldCheckmarkOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoCameraOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoArrowForward,
  IoArrowBack,
  IoRefreshOutline,
} from "react-icons/io5";
import { useRouter } from "next/router";
import axios from "axios";
import { useChatState } from "../../context/chatProvider";

interface SignupProps {
  onSwitchToLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pic, setPic] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadingPic, setUploadingPic] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();
  const { setUser } = useChatState();

  const handleClickShow = () => setShow(!show);

  useEffect(() => {
    let timer: any;
    if (step === "otp" && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  useEffect(() => {
    if (step === "otp" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*#?&]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleAvatarSelect = (file: File | null) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar must be under 5MB.",
        status: "warning",
        duration: 2500,
        isClosable: true,
        position: "top",
      });
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUploadingPic(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "Talk-A-Tive app");
    formData.append("cloud_name", "dnaa1baqk");

    fetch("https://api.cloudinary.com/v1_1/dnaa1baqk/image/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Upload failed");
        }
        return response.json();
      })
      .then((data) => {
        setPic(data.url);
        setUploadingPic(false);
        toast({
          title: "Photo Uploaded",
          status: "success",
          duration: 1500,
          position: "top",
        });
      })
      .catch(() => {
        setUploadingPic(false);
        toast({
          title: "Image Upload Failed",
          description: "Using default avatar instead.",
          status: "warning",
          duration: 2000,
          position: "top",
        });
      });
  };

  const submitHandler = async () => {
    setLoading(true);

    if (!name || !email || !password || !confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill out all required fields.",
        status: "warning",
        duration: 2500,
        position: "top",
      });
      setLoading(false);
      return;
    }

    if (name.trim().length < 3) {
      toast({
        title: "Invalid Name",
        description: "Name must be at least 3 characters.",
        status: "warning",
        duration: 2500,
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
        position: "top",
      });
      setLoading(false);
      return;
    }

    if (!hasMinLength || !hasNumber || !hasSpecial) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters with a number and special character.",
        status: "error",
        duration: 3000,
        position: "top",
      });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Mismatch",
        description: "Password confirmation does not match.",
        status: "error",
        duration: 2500,
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
        "/api/user",
        { name, email: email.toLowerCase().trim(), password, pic },
        config
      );

      toast({
        title: "Verification Code Sent!",
        description: data.message || "Please check your email for the 6-digit verification code.",
        status: "success",
        duration: 4000,
        position: "top",
      });

      setLoading(false);
      setStep("otp");
      setResendCooldown(60);
      setOtp("");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description:
          error.response?.data?.message || "Failed to start registration",
        status: "error",
        duration: 3500,
        position: "top",
      });
      setLoading(false);
    }
  };

  const verifyOtpHandler = async () => {
    const cleanOtp = otp.trim().replace(/\s+/g, "");

    if (cleanOtp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the complete 6-digit verification code.",
        status: "warning",
        duration: 2500,
        position: "top",
      });
      return;
    }

    try {
      setVerifying(true);
      const config = {
        headers: { "Content-type": "application/json" },
      };
      const { data } = await axios.post(
        "/api/user/verify-otp",
        { email: email.toLowerCase().trim(), otp: cleanOtp },
        config
      );

      toast({
        title: "Account Created! 🎉",
        description: "Email verified successfully! Welcome to Talk-A-Tive.",
        status: "success",
        duration: 2500,
        position: "top",
      });

      setVerifying(false);
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      router.push("/chats");
    } catch (error: any) {
      setVerifying(false);
      toast({
        title: "Verification Failed",
        description:
          error.response?.data?.message || "Invalid or expired verification code",
        status: "error",
        duration: 3500,
        position: "top",
      });
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    try {
      setResending(true);
      const { data } = await axios.post("/api/user/resend-otp", {
        email: email.toLowerCase().trim(),
      });
      setResending(false);
      setResendCooldown(60);
      toast({
        title: "New Code Sent!",
        description: data.message || `A new 6-digit code was sent to ${email}.`,
        status: "success",
        duration: 3500,
        position: "top",
      });
    } catch (error: any) {
      setResending(false);
      toast({
        title: "Resend Failed",
        description:
          error.response?.data?.message || "Could not resend verification code",
        status: "error",
        duration: 3000,
        position: "top",
      });
    }
  };

  if (step === "otp") {
    return (
      <VStack spacing={4} align="stretch" textAlign="center" py={2}>
        <Box
          w="68px"
          h="68px"
          borderRadius="20px"
          bg="linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.12) 100%)"
          color="#2563EB"
          display="flex"
          alignItems="center"
          justifyContent="center"
          mx="auto"
          border="1px solid rgba(37, 99, 235, 0.2)"
        >
          <IoShieldCheckmarkOutline size={38} />
        </Box>

        <Box>
          <Text fontSize="20px" fontWeight="800" color="#0F172A">
            Verify Your Email
          </Text>
          <Text fontSize="13px" color="#64748B" mt={1} lineHeight="1.5">
            We sent a 6-digit verification code to:<br />
            <strong style={{ color: "#2563EB" }}>{email}</strong>
          </Text>
        </Box>

        <Box py={2}>
          <FormControl id="otp-code">
            <Input
              ref={otpInputRef}
              className="auth-otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              placeholder="••••••"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && otp.length === 6) {
                  verifyOtpHandler();
                }
              }}
            />
          </FormControl>
          <Text fontSize="11px" color="#94A3B8" mt={1.5}>
            Enter the 6 numbers from your email (expires in 10 minutes)
          </Text>
        </Box>

        <Button
          className="auth-btn-primary"
          onClick={verifyOtpHandler}
          isLoading={verifying}
          loadingText="Verifying Code..."
          isDisabled={otp.length !== 6}
          py={6}
          rightIcon={<IoCheckmarkCircle size={18} />}
        >
          Verify & Create Account
        </Button>

        <HStack justify="center" spacing={1} pt={1}>
          {resendCooldown > 0 ? (
            <Text fontSize="12px" color="#94A3B8">
              Resend code in <strong>{resendCooldown}s</strong>
            </Text>
          ) : (
            <Button
              variant="link"
              size="sm"
              color="#2563EB"
              fontWeight="600"
              fontSize="13px"
              onClick={handleResendOtp}
              isLoading={resending}
              leftIcon={<IoRefreshOutline size={15} />}
            >
              Didn't receive code? Resend
            </Button>
          )}
        </HStack>

        <HStack justify="center" pt={1}>
          <Button
            variant="ghost"
            size="xs"
            color="#64748B"
            leftIcon={<IoArrowBack size={13} />}
            onClick={() => setStep("form")}
          >
            Edit registration details / wrong email
          </Button>
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack spacing={3.5} align="stretch">
      <Box className="auth-avatar-upload-wrap">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleAvatarSelect(e.target.files[0]);
            }
          }}
        />
        <div
          className="auth-avatar-circle"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          title="Click to choose profile picture"
        >
          {uploadingPic ? (
            <Spinner size="md" color="blue.500" thickness="3px" />
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <IoCameraOutline size={28} color="#3B82F6" />
          )}
          <div className="auth-avatar-overlay">
            <IoCameraOutline size={20} />
          </div>
        </div>
        <Text fontSize="11px" color="#64748B" mt={1}>
          {previewUrl ? "Change profile photo" : "Upload profile photo (optional)"}
        </Text>
      </Box>

      <FormControl id="signup-name" isRequired>
        <FormLabel fontSize="12px" fontWeight="600" color="#475569" mb="4px">
          Full Name
        </FormLabel>
        <InputGroup size="md">
          <InputLeftElement pointerEvents="none" color="#94A3B8">
            <IoPersonOutline size={18} />
          </InputLeftElement>
          <Input
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
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

      <FormControl id="signup-email" isRequired>
        <FormLabel fontSize="12px" fontWeight="600" color="#475569" mb="4px">
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

      <FormControl id="signup-password" isRequired>
        <FormLabel fontSize="12px" fontWeight="600" color="#475569" mb="4px">
          Password
        </FormLabel>
        <InputGroup size="md">
          <InputLeftElement pointerEvents="none" color="#94A3B8">
            <IoLockClosedOutline size={18} />
          </InputLeftElement>
          <Input
            type={show ? "text" : "password"}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {password.length > 0 && (
          <HStack spacing={2} mt={1.5} flexWrap="wrap">
            <span
              className="password-strength-badge"
              style={{
                color: hasMinLength ? "#15803D" : "#64748B",
                background: hasMinLength ? "#DCFCE7" : "#F1F5F9",
              }}
            >
              {hasMinLength ? <IoCheckmarkCircle size={13} /> : "•"} 6+ chars
            </span>
            <span
              className="password-strength-badge"
              style={{
                color: hasNumber ? "#15803D" : "#64748B",
                background: hasNumber ? "#DCFCE7" : "#F1F5F9",
              }}
            >
              {hasNumber ? <IoCheckmarkCircle size={13} /> : "•"} 1 number
            </span>
            <span
              className="password-strength-badge"
              style={{
                color: hasSpecial ? "#15803D" : "#64748B",
                background: hasSpecial ? "#DCFCE7" : "#F1F5F9",
              }}
            >
              {hasSpecial ? <IoCheckmarkCircle size={13} /> : "•"} 1 special char
            </span>
          </HStack>
        )}
      </FormControl>

      <FormControl id="signup-confirm-password" isRequired>
        <FormLabel fontSize="12px" fontWeight="600" color="#475569" mb="4px">
          Confirm Password
        </FormLabel>
        <InputGroup size="md">
          <InputLeftElement pointerEvents="none" color="#94A3B8">
            <IoShieldCheckmarkOutline size={18} />
          </InputLeftElement>
          <Input
            type={show ? "text" : "password"}
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
        {confirmPassword && (
          <Text
            fontSize="11px"
            mt={1}
            display="flex"
            alignItems="center"
            gap="3px"
            color={passwordsMatch ? "#15803D" : "#DC2626"}
          >
            {passwordsMatch ? (
              <>
                <IoCheckmarkCircle size={13} /> Passwords match
              </>
            ) : (
              <>
                <IoCloseCircle size={13} /> Passwords do not match
              </>
            )}
          </Text>
        )}
      </FormControl>

      <Button
        className="auth-btn-primary"
        onClick={submitHandler}
        isLoading={loading}
        loadingText="Sending Verification Code..."
        mt={2}
        rightIcon={<IoArrowForward size={16} />}
      >
        Send Verification Code
      </Button>

      <Box textAlign="center" pt={1}>
        <Text fontSize="13px" color="#64748B">
          Already have an account?{" "}
          <Text
            as="span"
            color="#2563EB"
            fontWeight="600"
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
            onClick={onSwitchToLogin}
          >
            Sign In
          </Text>
        </Text>
      </Box>
    </VStack>
  );
};

export default Signup;

