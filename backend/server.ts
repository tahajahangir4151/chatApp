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

  socket.on("disconnect", () => {
    console.log("User disconnected from socket");
  });
});

