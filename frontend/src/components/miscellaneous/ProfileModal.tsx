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
  useDisclosure,
} from "@chakra-ui/react";
import { IUser } from "@/types/chat";
import UserAvatar, { cleanAvatarUrl } from "../common/UserAvatar";

interface ProfileModalProps {
  user: any;
  children?: React.ReactNode;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
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
      <Modal isOpen={isOpen} onClose={onClose} size={"lg"} isCentered>
        <ModalOverlay />
        <ModalContent height={"410px"}>
          <ModalHeader
            fontSize="40px"
            fontFamily="Work sans"
            display={"flex"}
            justifyContent={"center"}
          >
            {userData?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody
            display={"flex"}
            flexDirection={"column"}
            alignItems={"center"}
            justifyContent={"space-between"}
          >
            {cleanAvatarUrl(userData?.pic) ? (
              <Image
                borderRadius={"full"}
                boxSize={"150px"}
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
            <Text
              fontSize={{ base: "28px", md: "30px" }}
              fontFamily={"Work sans"}
            >
              Email: {userData?.email}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;

