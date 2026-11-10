import React from "react";
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
  SimpleGrid,
  Badge,
} from "@chakra-ui/react";
import {
  IoCall,
  IoMic,
  IoMicOff,
  IoVolumeHigh,
  IoVolumeMute,
  IoPeople,
} from "react-icons/io5";
import UserAvatar from "../common/UserAvatar";
import { useCall } from "../../context/callContext";
import { useChatState } from "../../context/chatProvider";

const GroupCallModal: React.FC = () => {
  const {
    isInGroupCall,
    activeGroupCall,
    groupCallDuration,
    groupParticipants,
    isGroupMuted,
    isSpeakerOn,
    toggleGroupMute,
    toggleSpeaker,
    leaveGroupCall,
  } = useCall();

  const { user } = useChatState();
  const loggedUser = user?.data || user;

  if (!isInGroupCall) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const groupName = activeGroupCall?.chatName || "Group Call";
  const participantsCount = groupParticipants.length;

  return (
    <Modal
      isOpen={isInGroupCall}
      onClose={leaveGroupCall}
      isCentered
      size="xl"
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay bg="blackAlpha.850" backdropFilter="blur(10px)" />
      <ModalContent
        bg="#0F172A"
        color="white"
        borderRadius="28px"
        overflow="hidden"
        border="1px solid rgba(255, 255, 255, 0.12)"
        boxShadow="0 25px 60px -15px rgba(0, 0, 0, 0.9)"
        maxW={{ base: "90%", md: "640px" }}
      >
        <ModalBody p={{ base: 5, md: 8 }} textAlign="center">
          <VStack spacing={6}>
            {/* Call Header */}
            <Box>
              <HStack justify="center" spacing={2} mb={1}>
                <IoPeople size={20} color="#38BDF8" />
                <Text fontSize={{ base: "18px", md: "22px" }} fontWeight="700" color="#F8FAFC">
                  {groupName}
                </Text>
              </HStack>
              <HStack justify="center" spacing={3}>
                <Badge
                  colorScheme="green"
                  variant="subtle"
                  borderRadius="full"
                  px={3}
                  py={0.5}
                  fontSize="12px"
                >
                  {formatDuration(groupCallDuration)}
                </Badge>
                <Text fontSize="xs" color="#94A3B8">
                  {participantsCount} {participantsCount === 1 ? "participant" : "participants"}
                </Text>
              </HStack>
            </Box>

            {/* Participants Grid */}
            <Box
              w="100%"
              maxH="340px"
              overflowY="auto"
              px={2}
              py={1}
              sx={{
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { background: "rgba(255, 255, 255, 0.2)", borderRadius: "4px" },
              }}
            >
              <SimpleGrid
                columns={participantsCount <= 2 ? 2 : participantsCount <= 4 ? 2 : 3}
                spacing={4}
              >
                {groupParticipants.map((p) => {
                  const isLocalUser = p.user._id === loggedUser?._id;
                  const participantMuted = isLocalUser ? isGroupMuted : p.isMuted;

                  return (
                    <Box
                      key={p.socketId || p.user._id}
                      bg="rgba(30, 41, 59, 0.7)"
                      borderRadius="20px"
                      p={4}
                      border="1px solid"
                      borderColor={isLocalUser ? "#3B82F6" : "rgba(255, 255, 255, 0.08)"}
                      position="relative"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      transition="all 0.2s ease"
                      _hover={{ bg: "rgba(30, 41, 59, 0.95)" }}
                    >
                      <Box position="relative">
                        {/* Audio wave glow when active */}
                        {!participantMuted && (
                          <Box
                            position="absolute"
                            top="-4px"
                            left="-4px"
                            right="-4px"
                            bottom="-4px"
                            borderRadius="full"
                            border="2px solid #10B981"
                            opacity={0.65}
                            animation="connectedPulse 2.2s infinite ease-in-out"
                          />
                        )}
                        <UserAvatar
                          name={p.user.name || "Member"}
                          src={p.user.pic}
                          size="lg"
                          showStatus={false}
                        />
                      </Box>

                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color="#F8FAFC"
                        mt={2}
                        noOfLines={1}
                        maxW="110px"
                      >
                        {p.user.name || "Member"} {isLocalUser && "(You)"}
                      </Text>

                      {/* Mute badge */}
                      {participantMuted ? (
                        <HStack spacing={1} mt={1} color="#EF4444">
                          <IoMicOff size={13} />
                          <Text fontSize="10px" fontWeight="600">
                            Muted
                          </Text>
                        </HStack>
                      ) : (
                        <HStack spacing={1} mt={1} color="#10B981">
                          <Box w="6px" h="6px" borderRadius="full" bg="#10B981" />
                          <Text fontSize="10px" fontWeight="500">
                            Speaking
                          </Text>
                        </HStack>
                      )}
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>

            {/* Bottom Call Controls */}
            <HStack spacing={6} pt={2}>
              {/* Mute Button */}
              <VStack spacing={1}>
                <IconButton
                  size="lg"
                  borderRadius="full"
                  bg={isGroupMuted ? "#EF4444" : "#1E293B"}
                  color="white"
                  w="56px"
                  h="56px"
                  _hover={{ bg: isGroupMuted ? "#DC2626" : "#334155" }}
                  _active={{ transform: "scale(0.95)" }}
                  icon={isGroupMuted ? <IoMicOff size={22} /> : <IoMic size={22} />}
                  onClick={toggleGroupMute}
                  aria-label={isGroupMuted ? "Unmute microphone" : "Mute microphone"}
                  title={isGroupMuted ? "Unmute" : "Mute"}
                />
                <Text fontSize="11px" color="#94A3B8">
                  {isGroupMuted ? "Muted" : "Mute"}
                </Text>
              </VStack>

              {/* Leave Call Button */}
              <VStack spacing={1}>
                <IconButton
                  size="lg"
                  borderRadius="full"
                  bg="#EF4444"
                  color="white"
                  w="66px"
                  h="66px"
                  _hover={{ bg: "#DC2626", transform: "scale(1.06)" }}
                  _active={{ transform: "scale(0.94)" }}
                  transition="all 0.15s ease"
                  boxShadow="0 8px 24px rgba(239, 68, 68, 0.45)"
                  icon={<IoCall size={28} style={{ transform: "rotate(135deg)" }} />}
                  onClick={leaveGroupCall}
                  aria-label="Leave call"
                  title="Leave Group Call"
                />
                <Text fontSize="11px" color="#94A3B8">
                  Leave
                </Text>
              </VStack>

              {/* Speaker Button */}
              <VStack spacing={1}>
                <IconButton
                  size="lg"
                  borderRadius="full"
                  bg={!isSpeakerOn ? "#475569" : "#1E293B"}
                  color="white"
                  w="56px"
                  h="56px"
                  _hover={{ bg: "#334155" }}
                  _active={{ transform: "scale(0.95)" }}
                  icon={
                    !isSpeakerOn ? (
                      <IoVolumeMute size={22} />
                    ) : (
                      <IoVolumeHigh size={22} />
                    )
                  }
                  onClick={toggleSpeaker}
                  aria-label={isSpeakerOn ? "Mute speaker" : "Turn on speaker"}
                  title={isSpeakerOn ? "Speaker On" : "Speaker Muted"}
                />
                <Text fontSize="11px" color="#94A3B8">
                  {isSpeakerOn ? "Speaker" : "Muted"}
                </Text>
              </VStack>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default GroupCallModal;
