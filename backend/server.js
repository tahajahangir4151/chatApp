import path from "path";
import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import ConnectDb from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";
import { NotFound, errorhandler } from "./middleware/errorMiddleware.js";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());

ConnectDb();

// Static route for uploaded images and videos
const __dirname1 = path.resolve();
app.use("/uploads", express.static(path.join(__dirname1, "backend", "uploads")));

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/invite", inviteRoutes);

// --------------------------deployment------------------------------

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

app.use(NotFound);
app.use(errorhandler);

const port = process.env.PORT || 8080;

server.listen(
  port,
  console.log(`App is listening at port ${port}`.yellow.bold)
);

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  socket.on("setup", (userData) => {
    if (!userData?._id) return;
    socket.join(userData._id);
    console.log(`User joined setup room: ${userData._id}`);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(`User Joined room: ${room}`);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat || !chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id === newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  // Reaction updated event
  socket.on("message reaction", (reactionData) => {
    if (reactionData?.chatId) {
      socket.in(reactionData.chatId).emit("message reaction updated", reactionData);
    }
  });

  // Seen / Read event
  socket.on("mark seen", (seenData) => {
    if (seenData?.chatId) {
      socket.in(seenData.chatId).emit("messages seen", seenData);
    }
  });

  // Message delivered event
  socket.on("message delivered", (deliveredData) => {
    if (deliveredData?.senderId) {
      socket.in(deliveredData.senderId).emit("message delivered", deliveredData);
    }
  });

  // Message deleted event
  socket.on("delete message", (deleteData) => {
    if (deleteData?.chatId) {
      socket.in(deleteData.chatId).emit("message deleted", deleteData);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from socket");
  });
});
