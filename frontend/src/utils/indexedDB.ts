import { IMessage } from "@/types/chat";

/**
 * IndexedDB Utility for Offline Chat & Outbox Message Storage
 * Provides persistent offline queuing and chat caching.
 */

const DB_NAME = "TalkATiveDB";
const DB_VERSION = 1;
const OUTBOX_STORE = "outbox";
const CACHE_STORE = "messages_cache";

export interface OutboxRecord extends Partial<IMessage> {
  tempId: string;
  chatId: string;
  status: "pending";
  isPending: boolean;
  createdAt: string;
}

export interface CacheRecord {
  chatId: string;
  messages: IMessage[];
  updatedAt: number;
}

/**
 * Open and initialize the IndexedDB database
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

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
 */
export const savePendingMessage = async (message: any): Promise<OutboxRecord> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([OUTBOX_STORE], "readwrite");
      const store = tx.objectStore(OUTBOX_STORE);

      const record: OutboxRecord = {
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
 */
export const getPendingMessages = async (chatId?: string): Promise<OutboxRecord[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([OUTBOX_STORE], "readonly");
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        let results: OutboxRecord[] = req.result || [];
        if (chatId) {
          results = results.filter((m) => m.chatId === chatId);
        }
        // FIFO order: oldest first
        results.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
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
 */
export const deletePendingMessage = async (tempId?: string): Promise<void> => {
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
 */
export const cacheChatMessages = async (
  chatId: string,
  messages: any[]
): Promise<void> => {
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

      const record: CacheRecord = {
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
 */
export const getCachedChatMessages = async (chatId: string): Promise<IMessage[]> => {
  if (!chatId) return [];
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CACHE_STORE], "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(chatId);

      req.onsuccess = () => {
        const record = req.result as CacheRecord | undefined;
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
 * Remove cached messages for a chat from IndexedDB
 */
export const clearCachedMessages = async (chatId: string): Promise<void> => {
  if (!chatId) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CACHE_STORE], "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      const req = store.delete(chatId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[IndexedDB] Error clearing cached messages:", err);
  }
};

/**
 * Get count of pending messages waiting to be sent
 */
export const getPendingCount = async (): Promise<number> => {
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

