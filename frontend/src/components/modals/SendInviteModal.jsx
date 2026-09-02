import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  useToast,
  Divider,
} from "@chakra-ui/react";
import {
  IoMailOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoPeopleOutline,
  IoPaperPlaneOutline,
  IoLinkOutline,
} from "react-icons/io5";
import axios from "axios";
import { useChatState } from "../../context/chatProvider";

const SendInviteModal = ({ isOpen, onClose, defaultChat = null }) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const { user, selectedChat } = useChatState();
  const activeChat = defaultChat || selectedChat;
  const isGroup = activeChat?.isGroupChat;
  const [inviteType, setInviteType] = useState(isGroup ? "group" : "direct");

  const toast = useToast();
  const currentToken = user?.data?.token || user?.token;

  const handleSendInvite = async () => {
    if (!recipientEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter the recipient's email address.",
        status: "warning",
        duration: 2000,
        position: "top",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        status: "warning",
        duration: 2000,
        position: "top",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      };

      const payload = {
        recipientEmail: recipientEmail.trim(),
        inviteType: isGroup ? "group" : inviteType,
        chatId: isGroup ? activeChat._id : undefined,
      };

      const { data } = await axios.post("/api/invite", payload, config);

      setCreatedInvite(data.invite);
      setLoading(false);
      toast({
        title: "Invitation Sent!",
        description: `Email dispatched to ${recipientEmail}.`,
        status: "success",
        duration: 3000,
        position: "top",
      });
    } catch (error) {
      setLoading(false);
      toast({
        title: "Failed to Send Invite",
        description: error.response?.data?.message || "Could not send invite",
        status: "error",
        duration: 3000,
        position: "top",
      });
    }
  };

  const handleCopyLink = () => {
    if (!createdInvite?.token) return;
    const inviteUrl = `${window.location.origin}/invite/${createdInvite.token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({
      title: "Link Copied to Clipboard!",
      status: "info",
      duration: 1500,
      position: "top",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetAndClose = () => {
    setRecipientEmail("");
    setCreatedInvite(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleResetAndClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(6px)" />
      <ModalContent borderRadius="20px" p={2}>
        <ModalHeader pb={1}>
          <HStack spacing={2}>
            <Box
              p={2}
              borderRadius="12px"
              bg={isGroup ? "#F3E8FF" : "#EFF6FF"}
              color={isGroup ? "#7C3AED" : "#2563EB"}
            >
              {isGroup ? <IoPeopleOutline size={20} /> : <IoMailOutline size={20} />}
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="700">
                {isGroup ? "Invite to Group" : "Invite to Chat"}
              </Text>
              <Text fontSize="xs" color="#64748B" fontWeight="400">
                {isGroup
                  ? `Send an email invite to join "${activeChat?.chatName}"`
                  : "Invite any friend via email to start chatting"}
              </Text>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody py={4}>
          {!createdInvite ? (
            <VStack spacing={4} align="stretch">
              {isGroup && (
                <Box p={3} bg="#F8FAFC" borderRadius="12px" border="1px solid #E2E8F0">
                  <HStack justify="space-between">
                    <Text fontSize="xs" fontWeight="600" color="#475569">
                      Target Group:
                    </Text>
                    <Badge colorScheme="purple" borderRadius="md" px={2} py={0.5}>
                      {activeChat?.chatName}
                    </Badge>
                  </HStack>
                </Box>
              )}

              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="600" color="#475569" mb={1}>
                  Recipient's Email Address
                </FormLabel>
                <InputGroup size="md">
                  <InputLeftElement pointerEvents="none" color="#94A3B8">
                    <IoMailOutline size={18} />
                  </InputLeftElement>
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    borderRadius="12px"
                    bg="#F8FAFC"
                    fontSize="sm"
                    _focus={{ borderColor: "#3B82F6", bg: "white" }}
                    autoFocus
                  />
                </InputGroup>
                <Text fontSize="11px" color="#94A3B8" mt={1}>
                  If they don't have an account yet, they will be prompted to create one.
                </Text>
              </FormControl>

              <Button
                colorScheme="blue"
                borderRadius="12px"
                py={5}
                leftIcon={<IoPaperPlaneOutline size={18} />}
                onClick={handleSendInvite}
                isLoading={loading}
                loadingText="Sending Email..."
                w="100%"
                boxShadow="0 4px 12px rgba(37, 99, 235, 0.3)"
              >
                Send Email Invitation
              </Button>
            </VStack>
          ) : (
            <VStack spacing={4} align="stretch" textAlign="center" py={2}>
              <Box
                w="56px"
                h="56px"
                borderRadius="full"
                bg="#DCFCE7"
                color="#15803D"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mx="auto"
              >
                <IoCheckmarkOutline size={32} />
              </Box>

              <Box>
                <Text fontSize="md" fontWeight="700" color="#0F172A">
                  Invitation Sent!
                </Text>
                <Text fontSize="xs" color="#64748B" mt={1}>
                  We emailed an invite link to <strong>{recipientEmail}</strong>.
                </Text>
              </Box>

              <Divider />

              <Box textAlign="left">
                <Text fontSize="xs" fontWeight="600" color="#475569" mb={1.5}>
                  Or Share Direct Invite Link:
                </Text>
                <HStack>
                  <Input
                    readOnly
                    size="sm"
                    value={`${window.location.origin}/invite/${createdInvite.token}`}
                    borderRadius="10px"
                    bg="#F8FAFC"
                    fontSize="xs"
                  />
                  <Button
                    size="sm"
                    colorScheme={copied ? "green" : "blue"}
                    onClick={handleCopyLink}
                    leftIcon={copied ? <IoCheckmarkOutline size={16} /> : <IoCopyOutline size={16} />}
                    minW="90px"
                    borderRadius="10px"
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </HStack>
              </Box>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreatedInvite(null);
                  setRecipientEmail("");
                }}
                mt={2}
              >
                Send Another Invite
              </Button>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SendInviteModal;
