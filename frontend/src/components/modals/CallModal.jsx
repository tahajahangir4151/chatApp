import React, { useState, useEffect } from "react";
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
import {
  IoCall,
  IoMic,
  IoMicOff,
  IoVideocam,
  IoVideocamOff,
  IoVolumeHigh,
} from "react-icons/io5";
import UserAvatar from "../common/UserAvatar";

const CallModal = ({ isOpen, onClose, callType = "voice", contact = {} }) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === "video");
  const [callStatus, setCallStatus] = useState("Calling..."); // "Calling..." -> "Connected"

  useEffect(() => {
    let timer;
    if (isOpen) {
      setCallStatus("Calling...");
      setCallDuration(0);

      // Simulate connection after 2 seconds
      const connectTimer = setTimeout(() => {
        setCallStatus("Connected");
      }, 2000);

      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => {
        clearInterval(timer);
        clearTimeout(connectTimer);
      };
    }
  }, [isOpen]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(6px)" />
      <ModalContent
        bg="#0F172A"
        color="white"
        borderRadius="24px"
        overflow="hidden"
        boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.7)"
      >
        <ModalBody p={8} textAlign="center">
          <VStack spacing={5}>
            {/* Contact Details */}
            <UserAvatar
              name={contact.name || "Contact"}
              src={contact.pic}
              size="2xl"
              showStatus={false}
            />

            <Box>
              <Text fontSize="22px" fontWeight="700">
                {contact.name || "Contact"}
              </Text>
              <Text fontSize="sm" color="#94A3B8" mt={1}>
                {callStatus === "Connected"
                  ? formatDuration(callDuration)
                  : callStatus}
              </Text>
            </Box>

            {/* Video preview placeholder if video call */}
            {callType === "video" && isVideoOn && (
              <Box
                w="100%"
                h="180px"
                bg="blackAlpha.600"
                borderRadius="16px"
                border="1px solid #334155"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="xs" color="#64748B">
                  Camera Feed Active
                </Text>
              </Box>
            )}

            {/* Call Control Actions */}
            <HStack spacing={4} pt={4}>
              {/* Mute Mic */}
              <IconButton
                size="lg"
                borderRadius="full"
                bg={isMuted ? "#EF4444" : "#1E293B"}
                color="white"
                _hover={{ bg: isMuted ? "#DC2626" : "#334155" }}
                icon={isMuted ? <IoMicOff size={22} /> : <IoMic size={22} />}
                onClick={() => setIsMuted(!isMuted)}
                aria-label="Toggle mute"
              />

              {/* End Call Button */}
              <IconButton
                size="lg"
                borderRadius="full"
                bg="#EF4444"
                color="white"
                w="64px"
                h="64px"
                _hover={{ bg: "#DC2626", transform: "scale(1.05)" }}
                icon={<IoCall size={26} style={{ transform: "rotate(135deg)" }} />}
                onClick={onClose}
                aria-label="End call"
              />

              {/* Video Toggle */}
              {callType === "video" && (
                <IconButton
                  size="lg"
                  borderRadius="full"
                  bg={!isVideoOn ? "#EF4444" : "#1E293B"}
                  color="white"
                  _hover={{ bg: !isVideoOn ? "#DC2626" : "#334155" }}
                  icon={
                    !isVideoOn ? (
                      <IoVideocamOff size={22} />
                    ) : (
                      <IoVideocam size={22} />
                    )
                  }
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  aria-label="Toggle camera"
                />
              )}

              {/* Speaker Toggle */}
              <IconButton
                size="lg"
                borderRadius="full"
                bg="#1E293B"
                color="white"
                _hover={{ bg: "#334155" }}
                icon={<IoVolumeHigh size={22} />}
                aria-label="Speaker"
              />
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CallModal;
