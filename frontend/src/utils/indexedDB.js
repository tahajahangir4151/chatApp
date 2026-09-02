/**
 * IndexedDB Utility for Offline Chat & Outbox Message Storage
 * Provides persistent offline queuing and chat caching.
 */

const DB_NAME = "TalkATiveDB";
const DB_VERSION = 1;
const OUTBOX_STORE = "outbox";
const CACHE_STORE = "messages_cache";

/**
 * Open and initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export const openDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Outbox store for messages queued while offline
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outboxStore = db.createObjectStore(OUTBOX_STORE, {
          keyPath: "tempId",
        });
        outboxStore.createIndex("chatId", "chatId", { unique: false });
        outboxStore.createIndex("createdAt", "createdAt", { unique: false });
        outboxStore.createIndex("status", "status", { unique: false });
      }

      // 2. Cache store for already fetched messages per chat
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "chatId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
};

/**
 * Save a message into the offline outbox
 * @param {Object} message - The message object with tempId
 * @returns {Promise<void>}
 */
export const savePendingMessage = async (message) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([OUTBOX_STORE], "readwrite");
      const store = tx.objectStore(OUTBOX_STORE);

      const record = {
        ...message,
        tempId: message.tempId || message._id,
        chatId:
          typeof message.chat === "string"
            ? message.chat
            : message.chat?._id || message.chatId,
        status: "pending",
        isPending: true,
        createdAt: message.createdAt || new Date().toISOString(),
      };

      const req = store.put(record);

      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[IndexedDB] Error saving pending message:", err);
    throw err;
  }
};

/**
 * Get all pending messages from outbox, optionally filtered by chatId
 * @param {string} [chatId]
 * @returns {Promise<Array>} Sorted by createdAt ascending
 */
export const getPendingMessages = async (chatId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([OUTBOX_STORE], "readonly");
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        let results = req.result || [];
        if (chatId) {
          results = results.filter((m) => m.chatId === chatId);
        }
        // FIFO order: oldest first
        results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        resolve(results);
      };

      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[IndexedDB] Error reading pending messages:", err);
    return [];
  }
};

/**
 * Delete a message from outbox once successfully sent to server
 * @param {string} tempId
 * @returns {Promise<void>}
 */
export const deletePendingMessage = async (tempId) => {
  if (!tempId) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([OUTBOX_STORE], "readwrite");
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.delete(tempId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[IndexedDB] Error deleting pending message:", err);
  }
};

/**
 * Cache fetched messages for a specific chat for offline viewing
 * @param {string} chatId
 * @param {Array} messages
 * @returns {Promise<void>}
 */
export const cacheChatMessages = async (chatId, messages) => {
  if (!chatId || !Array.isArray(messages)) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CACHE_STORE], "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      // Keep confirmed messages (omit temp pending ones to avoid duplication)
      const confirmedMessages = messages.filter(
        (m) =>
          m.status !== "pending" &&
          !m.isPending &&
          !(typeof m._id === "string" && m._id.startsWith("temp_"))
      );

      const record = {
        chatId,
        messages: confirmedMessages,
        updatedAt: Date.now(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[IndexedDB] Error caching messages:", err);
  }
};

/**
 * Retrieve cached messages for a chat when offline or loading
 * @param {string} chatId
 * @returns {Promise<Array>}
 */
export const getCachedChatMessages = async (chatId) => {
  if (!chatId) return [];
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CACHE_STORE], "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(chatId);

      req.onsuccess = () => {
        const record = req.result;
        resolve(record && Array.isArray(record.messages) ? record.messages : []);
      };

      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[IndexedDB] Error getting cached messages:", err);
    return [];
  }
};

/**
 * Get count of pending messages waiting to be sent
 * @returns {Promise<number>}
 */
export const getPendingCount = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([OUTBOX_STORE], "readonly");
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.count();

      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    return 0;
  }
};
