import React, { useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Box,
  Text,
  IconButton,
  HStack,
  VStack,
} from "@chakra-ui/react";
import { IoCall } from "react-icons/io5";
import UserAvatar from "../common/UserAvatar";
import { useCall } from "../../context/callContext";

const IncomingCallModal: React.FC = () => {
  const { callState, callType, otherUser, acceptCall, rejectCall } = useCall();

  const isOpen = callState === "incoming";

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        acceptCall();
      } else if (e.key === "Escape") {
        rejectCall();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, acceptCall, rejectCall]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => rejectCall()}
      isCentered
      size="sm"
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(8px)" />
      <ModalContent
        bg="#0F172A"
        color="white"
        borderRadius="28px"
        overflow="hidden"
        border="1px solid rgba(255, 255, 255, 0.12)"
        boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.85)"
      >
        <ModalBody p={8} textAlign="center">
          <VStack spacing={6}>
            <Box position="relative" display="inline-block">
              {/* Outer pulsing ring */}
              <Box
                position="absolute"
                top="-8px"
                left="-8px"
                right="-8px"
                bottom="-8px"
                borderRadius="full"
                border="2px solid #10B981"
                opacity={0.7}
                animation="incomingPulse 1.8s infinite ease-out"
              />
              <UserAvatar
                name={otherUser?.name || "Caller"}
                src={otherUser?.pic}
                size="2xl"
                showStatus={false}
              />
            </Box>

            <Box>
              <Text fontSize="22px" fontWeight="700" color="#F8FAFC">
                {otherUser?.name || "Unknown Caller"}
              </Text>
              <Text fontSize="sm" color="#10B981" fontWeight="600" mt={1}>
                {callType === "video" ? "Incoming Video Call..." : "Incoming Voice Call..."}
              </Text>
            </Box>

            <HStack spacing={10} pt={2}>
              {/* Decline Button */}
              <VStack spacing={2}>
                <IconButton
                  size="lg"
                  borderRadius="full"
                  bg="#EF4444"
                  color="white"
                  w="64px"
                  h="64px"
                  _hover={{ bg: "#DC2626", transform: "scale(1.08)" }}
                  _active={{ transform: "scale(0.96)" }}
                  transition="all 0.15s ease"
                  boxShadow="0 8px 20px rgba(239, 68, 68, 0.4)"
                  icon={<IoCall size={26} style={{ transform: "rotate(135deg)" }} />}
                  onClick={() => rejectCall()}
                  aria-label="Decline call"
                />
                <Text fontSize="xs" color="#94A3B8" fontWeight="500">
                  Decline
                </Text>
              </VStack>

              {/* Accept Button */}
              <VStack spacing={2}>
                <IconButton
                  size="lg"
                  borderRadius="full"
                  bg="#10B981"
                  color="white"
                  w="64px"
                  h="64px"
                  _hover={{ bg: "#059669", transform: "scale(1.08)" }}
                  _active={{ transform: "scale(0.96)" }}
                  transition="all 0.15s ease"
                  boxShadow="0 8px 20px rgba(16, 185, 129, 0.4)"
                  icon={<IoCall size={26} />}
                  onClick={() => acceptCall()}
                  aria-label="Accept call"
                />
                <Text fontSize="xs" color="#94A3B8" fontWeight="500">
                  Accept
                </Text>
              </VStack>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default IncomingCallModal;
