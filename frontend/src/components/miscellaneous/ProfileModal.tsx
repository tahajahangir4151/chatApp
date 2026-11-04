import React from "react";
import { ViewIcon } from "@chakra-ui/icons";
import {
  Button,
  IconButton,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  Box,
  useDisclosure,
} from "@chakra-ui/react";
import { IUser } from "@/types/chat";
import UserAvatar, { cleanAvatarUrl } from "../common/UserAvatar";
import { useTheme } from "../../context/themeContext";

interface ProfileModalProps {
  user: any;
  children?: React.ReactNode;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isDark } = useTheme();
  const userData: IUser = user?.data ? user.data : user || {};

  return (
    <>
      {children ? (
        <span onClick={onOpen}>{children}</span>
      ) : (
        <IconButton
          display={{ base: "flex" }}
          icon={<ViewIcon />}
          onClick={onOpen}
          aria-label="View Profile"
        />
      )}
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent p={2}>
          <ModalHeader
            fontSize="20px"
            fontWeight="700"
            display="flex"
            justifyContent="center"
            pb={2}
          >
            User Profile
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={4} align="center">
              <Box
                p={1.5}
                borderRadius="full"
                bg={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"}
                boxShadow={isDark ? "0 0 25px rgba(139, 92, 246, 0.3)" : "0 4px 15px rgba(0, 0, 0, 0.06)"}
              >
                {cleanAvatarUrl(userData?.pic) ? (
                  <Image
                    borderRadius="full"
                    boxSize="120px"
                    objectFit="cover"
                    src={cleanAvatarUrl(userData?.pic)}
                    alt={userData?.name}
                  />
                ) : (
                  <UserAvatar
                    size="2xl"
                    name={userData?.name}
                    showStatus={false}
                  />
                )}
              </Box>

              <VStack spacing={1} textAlign="center">
                <Text fontSize="22px" fontWeight="700" color={isDark ? "#F8FAFC" : "#0F172A"}>
                  {userData?.name}
                </Text>
                <Text fontSize="sm" color={isDark ? "#94A3B8" : "#64748B"}>
                  {userData?.email}
                </Text>
              </VStack>

              {userData?.about && (
                <Box
                  p={3}
                  borderRadius="12px"
                  bg={isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC"}
                  border="1px solid"
                  borderColor={isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0"}
                  w="100%"
                  textAlign="center"
                >
                  <Text fontSize="xs" fontWeight="600" color={isDark ? "#94A3B8" : "#64748B"} mb={0.5}>
                    About
                  </Text>
                  <Text fontSize="sm" color={isDark ? "#E2E8F0" : "#334155"}>
                    {userData.about}
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center" pt={0}>
            <Button
              borderRadius="12px"
              px={6}
              onClick={onClose}
              bg="linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)"
              color="white"
              _hover={{ bg: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;

