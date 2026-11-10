import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Box,
  Text,
  IconButton,
  Button,
  HStack,
  VStack,
} from "@chakra-ui/react";
import { IoCall, IoClose, IoPeople } from "react-icons/io5";
import UserAvatar from "../common/UserAvatar";
import { useCall } from "../../context/callContext";

const IncomingGroupCallModal: React.FC = () => {
  const {
    incomingGroupCall,
    joinGroupCall,
    dismissIncomingGroupCall,
  } = useCall();

  if (!incomingGroupCall) return null;

  return (
    <Modal
      isOpen={!!incomingGroupCall}
      onClose={dismissIncomingGroupCall}
      isCentered
      size="sm"
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
        <ModalBody p={7} textAlign="center">
          <VStack spacing={5}>
            <Box position="relative" display="inline-block">
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
                name={incomingGroupCall.initiator?.name || "Group"}
                src={incomingGroupCall.initiator?.pic}
                size="2xl"
                showStatus={false}
              />
            </Box>

            <Box>
              <HStack justify="center" spacing={1} mb={1}>
                <IoPeople size={18} color="#38BDF8" />
                <Text fontSize="18px" fontWeight="700" color="#F8FAFC">
                  {incomingGroupCall.chatName}
                </Text>
              </HStack>
              <Text fontSize="sm" color="#10B981" fontWeight="600">
                Group Voice Call in progress
              </Text>
              <Text fontSize="xs" color="#94A3B8" mt={1}>
                Started by {incomingGroupCall.initiator?.name || "a member"}
              </Text>
            </Box>

            <HStack spacing={4} pt={2} w="100%" justify="center">
              <Button
                variant="outline"
                borderColor="rgba(255, 255, 255, 0.16)"
                color="#CBD5E1"
                borderRadius="full"
                px={6}
                size="md"
                _hover={{ bg: "rgba(255, 255, 255, 0.08)" }}
                onClick={dismissIncomingGroupCall}
                leftIcon={<IoClose size={18} />}
              >
                Dismiss
              </Button>

              <Button
                colorScheme="green"
                bg="#10B981"
                _hover={{ bg: "#059669", transform: "scale(1.04)" }}
                _active={{ transform: "scale(0.96)" }}
                borderRadius="full"
                px={6}
                size="md"
                onClick={() => joinGroupCall(incomingGroupCall.chatId)}
                leftIcon={<IoCall size={18} />}
              >
                Join Call
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default IncomingGroupCallModal;
