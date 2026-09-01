import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  useToast,
  Box,
} from "@chakra-ui/react";
import axios from "axios";
import { useChatState } from "../../context/chatProvider";
import UserAvatar from "../common/UserAvatar";

const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useChatState();
  const userData = user?.data || user || {};

  const [name, setName] = useState(userData.name || "");
  const [about, setAbout] = useState(
    userData.about || "Hey there! I am using Talk-A-Tive."
  );
  const [status, setStatus] = useState(userData.status || "online");
  const [pic, setPic] = useState(userData.pic || "");
  const [loading, setLoading] = useState(false);

  const toast = useToast();

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast({
        title: "Name is required",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
      };

      const { data } = await axios.put(
        "/api/user/profile",
        { name, about, status, pic },
        config
      );

      // Preserve existing token
      const updatedUserInfo = {
        ...user,
        data: {
          ...userData,
          ...data,
          token: userData.token,
        },
      };

      localStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));
      setUser(updatedUserInfo);

      toast({
        title: "Profile Updated!",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      setLoading(false);
      onClose();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || "Could not update profile",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent borderRadius="16px">
        <ModalHeader pb={1}>Edit Profile</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="center">
            <Box my={2}>
              <UserAvatar
                name={name || userData.name}
                src={pic || userData.pic}
                size="xl"
                status={status}
              />
            </Box>

            <FormControl isRequired>
              <FormLabel fontSize="sm">Display Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                borderRadius="10px"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">About / Bio</FormLabel>
              <Input
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Hey there! I am using Talk-A-Tive."
                borderRadius="10px"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Status</FormLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                borderRadius="10px"
              >
                <option value="online">🟢 Online</option>
                <option value="away">🟡 Away</option>
                <option value="offline">⚪ Offline</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Avatar Image URL</FormLabel>
              <Input
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                placeholder="https://..."
                borderRadius="10px"
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleUpdate}
            isLoading={loading}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditProfileModal;
