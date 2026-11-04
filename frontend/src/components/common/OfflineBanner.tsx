import React, { useState, useEffect } from "react";
import { Flex, Text, HStack, Spinner, Button, Collapse } from "@chakra-ui/react";
import {
  IoCloudOfflineOutline,
  IoCheckmarkCircleOutline,
  IoSyncOutline,
} from "react-icons/io5";
import { getPendingCount } from "../../utils/indexedDB";
import { syncPendingMessages } from "../../utils/offlineSync";

interface OfflineBannerProps {
  token?: string;
  socket?: any;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ token, socket }) => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Refresh pending count
  const refreshCount = async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (e) { }
  };

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      setIsOnline(navigator.onLine);
    }
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      refreshCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowSuccess(false);
      refreshCount();
    };

    const handleSyncStatus = (e: any) => {
      const detail = e.detail || {};
      setIsSyncing(detail.isSyncing || false);
      if (typeof detail.pendingCount === "number") {
        setPendingCount(detail.pendingCount);
      }
      if (detail.justSyncedCount > 0) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3500);
      }
    };

    const handleMessageSynced = () => {
      refreshCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sync-status-changed", handleSyncStatus);
    window.addEventListener("message-synced", handleMessageSynced);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("sync-status-changed", handleSyncStatus);
      window.removeEventListener("message-synced", handleMessageSynced);
    };
  }, []);

  const handleManualSync = () => {
    syncPendingMessages(token, socket);
  };

  if (!mounted) {
    return null;
  }

  const isVisible = !isOnline || isSyncing || showSuccess || pendingCount > 0;

  let bg = "#FEF3C7"; // Amber / yellow for offline
  let textColor = "#92400E";
  let borderColor = "#FDE68A";

  if (showSuccess) {
    bg = "#DCFCE7"; // Green for sync success
    textColor = "#15803D";
    borderColor = "#BBF7D0";
  } else if (isSyncing) {
    bg = "#DBEAFE"; // Blue for syncing
    textColor = "#1E40AF";
    borderColor = "#BFDBFE";
  }

  return (
    <Collapse in={isVisible} animateOpacity>
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={2}
        bg={bg}
        color={textColor}
        borderBottom={`1px solid ${borderColor}`}
        transition="background-color 0.3s ease"
        fontSize="xs"
        fontWeight="500"
        zIndex={20}
      >
        <HStack spacing={2}>
          {!isOnline ? (
            <>
              <IoCloudOfflineOutline size={17} />
              <Text>
                You are offline. Messages will be stored locally in IndexedDB
                and sent automatically when connection is restored.
                {pendingCount > 0 && ` (${pendingCount} queued)`}
              </Text>
            </>
          ) : isSyncing ? (
            <>
              <Spinner size="xs" thickness="2px" speed="0.7s" />
              <Text>
                Connected! Sending {pendingCount > 0 ? pendingCount : ""}{" "}
                pending offline message{pendingCount !== 1 ? "s" : ""}...
              </Text>
            </>
          ) : showSuccess ? (
            <>
              <IoCheckmarkCircleOutline size={17} />
              <Text>All offline messages have been sent successfully!</Text>
            </>
          ) : pendingCount > 0 ? (
            <>
              <IoSyncOutline size={16} />
              <Text>{pendingCount} message(s) waiting to sync.</Text>
            </>
          ) : null}
        </HStack>

        {isOnline && pendingCount > 0 && !isSyncing && (
          <Button
            size="xs"
            colorScheme="blue"
            variant="solid"
            borderRadius="md"
            onClick={handleManualSync}
            leftIcon={<IoSyncOutline size={13} />}
          >
            Send Now
          </Button>
        )}
      </Flex>
    </Collapse>
  );
};

export default OfflineBanner;

