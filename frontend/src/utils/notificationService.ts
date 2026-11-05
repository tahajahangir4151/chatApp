/**
 * WhatsApp-Style Realtime Notification Service
 * Handles System Desktop Notifications, Audio Chimes, Window Focus Detection & Tab Badges
 */

export const isNotificationSupported = (): boolean => {
  return typeof window !== "undefined" && "Notification" in window;
};

export const getNotificationPermission = (): NotificationPermission | "unsupported" => {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) return "denied";
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setDesktopNotifsEnabled(true);
    }
    return permission;
  } catch (err) {
    return "denied";
  }
};

export const isWindowActive = (): boolean => {
  if (typeof document === "undefined") return false;
  return !document.hidden && document.hasFocus();
};

export const isSoundEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("talkative_sound_enabled") !== "false";
};

export const setSoundEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("talkative_sound_enabled", enabled ? "true" : "false");
};

export const isDesktopNotifsEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("talkative_desktop_notifs") !== "false";
};

export const setDesktopNotifsEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("talkative_desktop_notifs", enabled ? "true" : "false");
};

/**
 * Synthesizes a clean, pleasant two-tone WhatsApp-style chime via Web Audio API.
 * Requires 0 external files, 100% offline-ready, no network latency.
 */
export const playNotificationChime = (): void => {
  if (!isSoundEnabled() || typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => { });
    }

    const now = ctx.currentTime;

    // First Tone: High E6 (1318.5 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1318.51, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Second Tone: Higher B6 (1975.5 Hz) slightly delayed for vibrant chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1975.53, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.26, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.42);
  } catch (err) {
    // Audio context was blocked by user agent
  }
};

/**
 * Formats a message into a clean readable preview snippet like WhatsApp
 */
export const getMessageSnippet = (message: any): string => {
  if (!message) return "New message";

  const { mediaType, content, fileName } = message;

  if (mediaType === "image") {
    return content ? `📷 Photo: ${content}` : "📷 Photo";
  }
  if (mediaType === "audio") {
    return "🎵 Voice Message";
  }
  if (mediaType === "video") {
    return content ? `🎥 Video: ${content}` : "🎥 Video";
  }
  if (mediaType === "file") {
    return `📄 Document: ${fileName || "File attachment"}`;
  }

  return content || "New message received";
};

export interface ShowNotificationParams {
  title: string;
  body: string;
  icon?: string;
  chatId?: string;
  onClick?: () => void;
}

/**
 * Triggers a native system desktop notification banner at the OS level (Windows/Mac/Linux/Android)
 */
export const showSystemNotification = async ({
  title,
  body,
  icon,
  chatId,
  onClick,
}: ShowNotificationParams): Promise<Notification | void | null> => {
  if (!isNotificationSupported()) return null;
  if (!isDesktopNotifsEnabled()) return null;

  if (Notification.permission !== "granted") {
    return null;
  }

  const notificationOptions: any = {
    body,
    icon: icon || "/talkative-logo.png",
    badge: "/talkative-logo.png",
    tag: chatId ? `chat-${chatId}` : undefined,
    renotify: true,
    silent: false,
    data: { chatId },
  };

  // Try service worker registration if available
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === "function") {
        await registration.showNotification(title, notificationOptions);
        return;
      }
    } catch (e) {
      // Fallback to standard window Notification
    }
  }

  try {
    const notification = new Notification(title, notificationOptions);

    notification.onclick = (event) => {
      event.preventDefault();
      try {
        window.focus();
      } catch (e) { }

      if (onClick) {
        onClick();
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.warn("[NotificationService] Notification display error:", err);
    return null;
  }
};

let originalTitle = "Talk-A-Tive - Realtime Chat";
let titleInterval: any = null;

export const updateDocumentTitle = (unreadCount: number, latestSender?: string): void => {
  if (typeof document === "undefined") return;

  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }

  if (unreadCount <= 0) {
    document.title = originalTitle;
    return;
  }

  // Flash between unread count and latest sender like WhatsApp Web
  let isFlashing = false;
  const countText = `(${unreadCount}) Talk-A-Tive`;
  const senderText = latestSender ? `🔔 New message from ${latestSender}` : countText;

  document.title = countText;

  titleInterval = setInterval(() => {
    if (isWindowActive()) {
      document.title = originalTitle;
      clearInterval(titleInterval);
      titleInterval = null;
      return;
    }
    document.title = isFlashing ? countText : senderText;
    isFlashing = !isFlashing;
  }, 1600);
};

export const resetDocumentTitle = (): void => {
  if (typeof document === "undefined") return;
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
  document.title = originalTitle;
};
