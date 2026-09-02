import React, { useState } from "react";
import ScrollableFeed from "react-scrollable-feed";
import {
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Button,
} from "@chakra-ui/react";
import { IoDownloadOutline } from "react-icons/io5";
import MessageBubble from "./chat/MessageBubble";
import { useChatState } from "../context/chatProvider";
import "./styles.css";

const ScrollableChats = ({
  messages = [],
  handleReaction,
  onReply,
  onStarMessage,
  onDeleteMessage,
}) => {
  const { user, selectedChat } = useChatState();
  const currentUserId = user?.data?._id;

  const [lightboxImage, setLightboxImage] = useState(null);

  // Jump to quoted message
  const handleJumpToMessage = (messageId) => {
    if (!messageId) return;
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "background-color 0.4s ease";
      el.style.backgroundColor = "rgba(37, 99, 235, 0.12)";
      setTimeout(() => {
        el.style.backgroundColor = "transparent";
      }, 1400);
    }
  };

  return (
    <>
      <ScrollableFeed>
        <Box
          px={{ base: 3, md: 5 }}
          pt={7}
          pb={3}
          w="100%"
          maxW="100%"
          overflowX="hidden"
          boxSizing="border-box"
        >
          {messages &&
            messages.map((m) => (
              <MessageBubble
                key={m._id}
                message={m}
                currentUserId={currentUserId}
                isGroupChat={selectedChat?.isGroupChat}
                onReact={handleReaction}
                onReply={onReply}
                onStar={onStarMessage}
                onDelete={onDeleteMessage}
                onImageClick={(img) => setLightboxImage(img)}
                onJumpToMessage={handleJumpToMessage}
              />
            ))}
        </Box>
      </ScrollableFeed>

      {/* Lightbox Modal for Fullscreen Image Zoom */}
      {lightboxImage && (
        <Modal
          isOpen={Boolean(lightboxImage)}
          onClose={() => setLightboxImage(null)}
          size="2xl"
          isCentered
        >
          <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(6px)" />
          <ModalContent bg="transparent" boxShadow="none">
            <ModalCloseButton color="white" zIndex={10} />
            <ModalBody p={0} textAlign="center">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name || "Preview"}
                style={{
                  maxHeight: "80vh",
                  maxWidth: "100%",
                  margin: "auto",
                  borderRadius: "14px",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
                }}
              />
              <Box mt={3}>
                <a
                  href={lightboxImage.url}
                  download={lightboxImage.name || "image.jpg"}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    leftIcon={<IoDownloadOutline size={18} />}
                    colorScheme="teal"
                    size="sm"
                    borderRadius="10px"
                  >
                    Download Image
                  </Button>
                </a>
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default ScrollableChats;
