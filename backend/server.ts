import path from "path";
import http from "http";
import express, { type Request, type Response } from "express";
import "colors";
import dotenv from "dotenv";
import { Server, type Socket } from "socket.io";
import ConnectDb from "./config/db";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import inviteRoutes from "./routes/inviteRoutes";
import { NotFound, errorhandler } from "./middleware/errorMiddleware";
import { verifyEmailConfig } from "./config/emailService";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());

ConnectDb();

// Static route for uploaded images, videos, audio notes, and files
const __dirname1 = path.resolve();
app.use(
  "/uploads",
  express.static(path.join(__dirname1, "backend", "uploads"), {
    acceptRanges: true,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (/\.(webm|ogg|mp3|m4a|aac|wav|mp4|mov)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "private, no-cache, must-revalidate");
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
      if (/^Voice-Note-.*\.webm$/i.test(path.basename(filePath))) {
        res.setHeader("Content-Type", "audio/webm");
      }
    },
  })
);

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/invite", inviteRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Talk-A-Tive API is running...");
});

app.use(NotFound);
app.use(errorhandler);

const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log(`App is listening at port ${port}`.yellow.bold);
  verifyEmailConfig().catch((err: any) => {
    console.warn("[Email Service] Startup verification check:", err.message);
  });
});

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080"],
    credentials: true,
  },
});

interface GroupCallParticipant {
  socketId: string;
  user: {
    _id: string;
    name?: string;
    pic?: string;
    email?: string;
  };
  isMuted?: boolean;
}

interface ActiveGroupCall {
  callId: string;
  chatId: string;
  chatName: string;
  initiator: {
    _id: string;
    name?: string;
    pic?: string;
  };
  participants: GroupCallParticipant[];
  startedAt: string;
}

const activeGroupCalls = new Map<string, ActiveGroupCall>();

io.on("connection", (socket: Socket) => {
  console.log("Connected to socket.io");

  socket.on("setup", (userData: any) => {
    if (!userData?._id) return;
    socket.join(userData._id);
    console.log(`User joined setup room: ${userData._id}`);
    socket.emit("connected");
  });

  socket.on("join chat", (room: string) => {
    socket.join(room);
    console.log(`User Joined room: ${room}`);
  });

  socket.on("typing", (room: string) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room: string) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved: any) => {
    const chat = newMessageRecieved.chat;

    if (!chat || !chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user: any) => {
      if (user._id === newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.on("message reaction", (reactionData: any) => {
    if (reactionData?.chatId) {
      socket.in(reactionData.chatId).emit("message reaction updated", reactionData);
    }
  });

  socket.on("mark seen", (seenData: any) => {
    if (seenData?.chatId) {
      socket.in(seenData.chatId).emit("messages seen", seenData);
    }
  });

  socket.on("message delivered", (deliveredData: any) => {
    if (deliveredData?.senderId) {
      socket.in(deliveredData.senderId).emit("message delivered", deliveredData);
    }
  });

  socket.on("delete message", (deleteData: any) => {
    if (deleteData?.chatId) {
      socket.in(deleteData.chatId).emit("message deleted", deleteData);
    }
  });

  socket.on("clear chat", (clearData: any) => {
    if (clearData?.chatId) {
      socket.in(clearData.chatId).emit("chat cleared", clearData);
    }
  });

  socket.on("delete chat", (deleteChatData: any) => {
    if (deleteChatData?.chatId) {
      socket.in(deleteChatData.chatId).emit("chat deleted", deleteChatData);
    }
  });

  // Audio / Video Call signaling
  socket.on("call:user", (data: { to: string; caller: any; callType: string; offer: any; callId: string }) => {
    if (data?.to) {
      console.log(`Call initiated from ${data.caller?._id || data.caller?.name} to ${data.to}`);
      io.to(data.to).emit("call:incoming", {
        caller: data.caller,
        callType: data.callType || "voice",
        offer: data.offer,
        callId: data.callId,
      });
    }
  });

  socket.on("call:answer", (data: { to: string; answer: any; callId: string }) => {
    if (data?.to) {
      console.log(`Call answered for callId ${data.callId} to ${data.to}`);
      io.to(data.to).emit("call:accepted", {
        answer: data.answer,
        callId: data.callId,
      });
    }
  });

  socket.on("call:ice-candidate", (data: { to: string; candidate: any; callId: string }) => {
    if (data?.to) {
      io.to(data.to).emit("call:ice-candidate", {
        candidate: data.candidate,
        callId: data.callId,
      });
    }
  });

  socket.on("call:reject", (data: { to: string; reason?: string; callId: string }) => {
    if (data?.to) {
      console.log(`Call rejected for callId ${data.callId} to ${data.to}`);
      io.to(data.to).emit("call:rejected", {
        reason: data.reason || "declined",
        callId: data.callId,
      });
    }
  });

  socket.on("call:end", (data: { to: string; reason?: string; callId: string }) => {
    if (data?.to) {
      console.log(`Call ended for callId ${data.callId} to ${data.to}`);
      io.to(data.to).emit("call:ended", {
        reason: data.reason || "ended",
        callId: data.callId,
      });
    }
  });

  // Group Call signaling
  socket.on("group-call:start", (data: {
    chatId: string;
    chatName: string;
    initiator: any;
    users: any[];
  }) => {
    if (!data?.chatId) return;

    let call = activeGroupCalls.get(data.chatId);
    if (!call) {
      call = {
        callId: `group_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        chatId: data.chatId,
        chatName: data.chatName,
        initiator: data.initiator,
        participants: [
          {
            socketId: socket.id,
            user: data.initiator,
            isMuted: false,
          },
        ],
        startedAt: new Date().toISOString(),
      };
      activeGroupCalls.set(data.chatId, call);
    } else {
      const exists = call.participants.find(
        (p) => p.socketId === socket.id || p.user._id === data.initiator._id
      );
      if (!exists) {
        call.participants.push({
          socketId: socket.id,
          user: data.initiator,
          isMuted: false,
        });
      }
    }

    socket.join(`group-call:${data.chatId}`);
    socket.emit("group-call:joined", {
      call,
      existingParticipants: [],
    });

    // Notify other group members via their personal rooms
    if (Array.isArray(data.users)) {
      data.users.forEach((u: any) => {
        const uid = u._id || u;
        if (uid && uid.toString() !== data.initiator._id.toString()) {
          io.to(uid.toString()).emit("group-call:incoming", {
            chatId: data.chatId,
            chatName: data.chatName,
            initiator: data.initiator,
            callId: call.callId,
            participantsCount: call.participants.length,
          });
        }
      });
    }

    io.to(data.chatId).emit("group-call:status-update", {
      chatId: data.chatId,
      call,
    });
  });

  socket.on("group-call:join", (data: {
    chatId: string;
    user: any;
  }) => {
    if (!data?.chatId || !data?.user?._id) return;

    const call = activeGroupCalls.get(data.chatId);
    if (!call) {
      socket.emit("group-call:error", { message: "No active group call found for this chat" });
      return;
    }

    const existingParticipants = [
      ...call.participants.filter((p) => p.user._id !== data.user._id),
    ];
    const currentParticipantIndex = call.participants.findIndex(
      (p) => p.user._id === data.user._id
    );

    const newParticipant: GroupCallParticipant = {
      socketId: socket.id,
      user: data.user,
      isMuted: false,
    };

    if (currentParticipantIndex >= 0) {
      call.participants[currentParticipantIndex] = newParticipant;
    } else {
      call.participants.push(newParticipant);
    }

    socket.join(`group-call:${data.chatId}`);

    // Send existing peers to joining user
    socket.emit("group-call:joined", {
      call,
      existingParticipants,
    });

    // Notify other peers in this group call
    socket.to(`group-call:${data.chatId}`).emit("group-call:user-joined", {
      participant: newParticipant,
      callId: call.callId,
    });

    io.to(data.chatId).emit("group-call:status-update", {
      chatId: data.chatId,
      call,
    });
  });

  socket.on("group-call:signal", (data: {
    toSocketId: string;
    signal: any;
    type: "offer" | "answer" | "candidate";
    callId: string;
  }) => {
    if (data?.toSocketId) {
      io.to(data.toSocketId).emit("group-call:signal", {
        fromSocketId: socket.id,
        signal: data.signal,
        type: data.type,
        callId: data.callId,
      });
    }
  });

  socket.on("group-call:mute-toggle", (data: {
    chatId: string;
    isMuted: boolean;
  }) => {
    if (!data?.chatId) return;
    const call = activeGroupCalls.get(data.chatId);
    if (call) {
      const participant = call.participants.find((p) => p.socketId === socket.id);
      if (participant) {
        participant.isMuted = data.isMuted;
        io.to(`group-call:${data.chatId}`).emit("group-call:participant-mute", {
          socketId: socket.id,
          userId: participant.user._id,
          isMuted: data.isMuted,
        });
      }
    }
  });

  socket.on("group-call:leave", (data: { chatId: string }) => {
    if (!data?.chatId) return;
    const call = activeGroupCalls.get(data.chatId);
    if (call) {
      call.participants = call.participants.filter((p) => p.socketId !== socket.id);
      socket.leave(`group-call:${data.chatId}`);

      if (call.participants.length === 0) {
        activeGroupCalls.delete(data.chatId);
        io.to(data.chatId).emit("group-call:ended", { chatId: data.chatId });
      } else {
        socket.to(`group-call:${data.chatId}`).emit("group-call:user-left", {
          socketId: socket.id,
        });
        io.to(data.chatId).emit("group-call:status-update", {
          chatId: data.chatId,
          call,
        });
      }
    }
  });

  socket.on("group-call:get-status", (data: { chatId: string }) => {
    if (data?.chatId) {
      const call = activeGroupCalls.get(data.chatId);
      socket.emit("group-call:status-update", {
        chatId: data.chatId,
        call: call || null,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from socket");

    // Clean up any group calls this socket was part of
    activeGroupCalls.forEach((call, chatId) => {
      const wasInCall = call.participants.some((p) => p.socketId === socket.id);
      if (wasInCall) {
        call.participants = call.participants.filter((p) => p.socketId !== socket.id);
        if (call.participants.length === 0) {
          activeGroupCalls.delete(chatId);
          io.to(chatId).emit("group-call:ended", { chatId });
        } else {
          socket.to(`group-call:${chatId}`).emit("group-call:user-left", {
            socketId: socket.id,
          });
          io.to(chatId).emit("group-call:status-update", {
            chatId,
            call,
          });
        }
      }
    });
  });
});

