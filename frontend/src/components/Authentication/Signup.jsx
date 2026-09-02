import React, { useState, useRef } from "react";
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
} from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Signup = ({ onSwitchToLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pic, setPic] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadingPic, setUploadingPic] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const [registeredEmail, setRegisteredEmail] = useState("");

  const fileInputRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleClickShow = () => setShow(!show);

  // Live password validation checks
  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*#?&]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleAvatarSelect = (file) => {
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
        { name, email, password, pic },
        config
      );

      toast({
        title: "Verification Email Sent!",
        description: "Please check your inbox to activate your account.",
        status: "success",
        duration: 4000,
        position: "top",
      });

      setLoading(false);
      setRegisteredEmail(email);
    } catch (error) {
      toast({
        title: "Registration Failed",
        description:
          error.response?.data?.message || "Failed to create account",
        status: "error",
        duration: 3000,
        position: "top",
      });
      setLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <VStack spacing={4} align="stretch" textAlign="center" py={4}>
        <Box
          w="64px"
          h="64px"
          borderRadius="full"
          bg="#DCFCE7"
          color="#15803D"
          display="flex"
          alignItems="center"
          justifyContent="center"
          mx="auto"
        >
          <IoCheckmarkCircle size={42} />
        </Box>
        <Text fontSize="xl" fontWeight="800" color="#0F172A">
          Verify Your Email
        </Text>
        <Text fontSize="sm" color="#64748B" lineHeight="1.6">
          We've sent an activation link to <strong>{registeredEmail}</strong>. Please check your inbox and click the button to verify your account.
        </Text>
        <Button
          className="auth-btn-primary"
          onClick={onSwitchToLogin}
          mt={2}
        >
          Go to Sign In
        </Button>
      </VStack>
    );
  }

  return (
    <VStack spacing={3.5} align="stretch">
      {/* Interactive Avatar Upload Circle */}
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

      {/* Full Name Input */}
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

      {/* Email Address Input */}
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

      {/* Password Input */}
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

        {/* Live Password Criteria Badges */}
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

      {/* Confirm Password Input */}
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

      {/* Submit Button */}
      <Button
        className="auth-btn-primary"
        onClick={submitHandler}
        isLoading={loading}
        loadingText="Creating Account..."
        mt={2}
        rightIcon={<IoArrowForward size={16} />}
      >
        Create Free Account
      </Button>

      {/* Switch to Sign In */}
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
