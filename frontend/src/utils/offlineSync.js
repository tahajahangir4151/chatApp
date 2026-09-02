import axios from "axios";
import {
  getPendingMessages,
  deletePendingMessage,
  getPendingCount,
} from "./indexedDB";

let isSyncing = false;

/**
 * Synchronize all pending messages stored in IndexedDB with the backend
 * @param {string} token - User's authorization token
 * @param {Object} [socket] - Socket.io instance for emitting to peers
 * @returns {Promise<{ synced: number, remaining: number }>}
 */
export const syncPendingMessages = async (token, socket) => {
  if (typeof window === "undefined") return { synced: 0, remaining: 0 };
  if (!navigator.onLine) {
    return { synced: 0, remaining: await getPendingCount() };
  }

  if (isSyncing) {
    return { synced: 0, remaining: await getPendingCount() };
  }

  const authToken =
    token ||
    (() => {
      try {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        return userInfo?.data?.token || userInfo?.token;
      } catch (e) {
        return null;
      }
    })();

  if (!authToken) return { synced: 0, remaining: 0 };

  const pendingList = await getPendingMessages();
  if (!pendingList || pendingList.length === 0) {
    return { synced: 0, remaining: 0 };
  }

  isSyncing = true;
  window.dispatchEvent(
    new CustomEvent("sync-status-changed", {
      detail: { isSyncing: true, pendingCount: pendingList.length },
    })
  );

  let syncedCount = 0;

  try {
    for (const msg of pendingList) {
      // If network dropped mid-sync, halt
      if (!navigator.onLine) {
        break;
      }

      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        };

        const payload = {
          content: msg.content || "",
          chatId: msg.chatId,
          replyTo: msg.replyTo?._id || (typeof msg.replyTo === "string" ? msg.replyTo : null),
          mediaType: msg.mediaType || "text",
          fileUrl: msg.fileUrl || "",
          fileName: msg.fileName || "",
          fileSize: msg.fileSize || 0,
        };

        const { data } = await axios.post("/api/message", payload, config);

        // Successfully created on server: remove from IndexedDB outbox
        await deletePendingMessage(msg.tempId);

        // Emit via socket if available
        if (socket && typeof socket.emit === "function") {
          socket.emit("new message", data);
        }

        // Notify active chat views to replace temp message with real message
        window.dispatchEvent(
          new CustomEvent("message-synced", {
            detail: {
              tempId: msg.tempId,
              message: data,
              chatId: msg.chatId,
            },
          })
        );

        syncedCount++;
      } catch (err) {
        console.warn(`[Sync] Failed sending message ${msg.tempId}:`, err.message);

        // If it's a network error, stop the loop and wait for next reconnection
        if (
          !err.response ||
          err.code === "ERR_NETWORK" ||
          err.message.includes("Network Error") ||
          err.message.includes("network")
        ) {
          console.log("[Sync] Network unavailable. Halting sync queue.");
          break;
        }

        // If it's a client error (e.g. chat was deleted, 400 or 404), remove from outbox to prevent blocking
        if (err.response && (err.response.status === 400 || err.response.status === 404)) {
          console.warn("[Sync] Unrecoverable error, dropping pending message:", msg.tempId);
          await deletePendingMessage(msg.tempId);
        }
      }
    }
  } finally {
    isSyncing = false;
    const remaining = await getPendingCount();

    window.dispatchEvent(
      new CustomEvent("sync-status-changed", {
        detail: {
          isSyncing: false,
          pendingCount: remaining,
          justSyncedCount: syncedCount,
        },
      })
    );
  }

  return { synced: syncedCount, remaining: await getPendingCount() };
};

/**
 * Hook up window network listeners for automatic synchronization
 * @param {Function} getToken
 * @param {Function} getSocket
 * @returns {Function} cleanup function
 */
export const setupAutoSync = (getToken, getSocket) => {
  const trigger = () => {
    if (navigator.onLine) {
      const token = getToken ? getToken() : null;
      const socket = getSocket ? getSocket() : null;
      syncPendingMessages(token, socket);
    }
  };

  window.addEventListener("online", trigger);

  // Periodic heartbeat sync check in case online event didn't trigger
  const intervalId = setInterval(() => {
    if (navigator.onLine) {
      trigger();
    }
  }, 25000);

  // Run once immediately if online
  if (navigator.onLine) {
    setTimeout(trigger, 1000);
  }

  return () => {
    window.removeEventListener("online", trigger);
    clearInterval(intervalId);
  };
};
