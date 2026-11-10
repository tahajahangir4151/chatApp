import io, { Socket } from "socket.io-client";

export const ENDPOINT =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
    ? "http://localhost:8080"
    : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:8080");

let socketInstance: Socket | null = null;

export const getSocket = (user?: any): Socket => {
  if (!socketInstance && typeof window !== "undefined") {
    socketInstance = io(ENDPOINT, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }

  if (socketInstance && user) {
    const userData = user?.data || user;
    if (userData?._id) {
      socketInstance.emit("setup", userData);
    }
  }

  return socketInstance!;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
