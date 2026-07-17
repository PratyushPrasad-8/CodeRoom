import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  addPracticeSubmission,
  addSubmission,
  allProblems,
  createRoom,
  deleteRoom,
  getCandidateAnalytics,
  getCodeSnapshot,
  getRoom,
  joinRoom,
  listRooms,
  saveCodeSnapshot
} from "./store.js";
import { judge } from "./judge.js";

const app = express();
const httpServer = createServer(app);
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = new Set([allowedOrigin, "http://127.0.0.1:5173"]);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  }
};
const io = new Server(httpServer, {
  cors: { origin: [...allowedOrigins], methods: ["GET", "POST"] }
});

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "CoderRooms API" });
});

app.get("/api/problems", (_req, res) => {
  res.json(allProblems());
});

app.get("/api/analytics/:studentName", (req, res) => {
  res.json(getCandidateAnalytics(req.params.studentName));
});

app.get("/api/rooms", (_req, res) => {
  res.json(listRooms());
});

app.post("/api/rooms", (req, res) => {
  const { name, problemId, teacherName, durationHours } = req.body;
  if (!name || !problemId || !teacherName) {
    return res.status(400).json({ message: "name, problemId and teacherName are required" });
  }
  const room = createRoom({ name, problemId, teacherName, durationHours });
  io.emit("rooms:updated", listRooms());
  res.status(201).json(room);
});

app.get("/api/rooms/:id", (req, res) => {
  const room = getRoom(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ message: "Room not found" });
  res.json(room);
});

app.delete("/api/rooms/:id", (req, res) => {
  const result = deleteRoom({
    roomId: req.params.id.toUpperCase(),
    teacherName: req.body.teacherName
  });
  if (result.reason === "not-found") return res.status(404).json({ message: "Room not found" });
  if (result.reason === "forbidden") {
    return res.status(403).json({ message: "Only the room creator can delete this room" });
  }
  io.emit("rooms:updated", listRooms());
  res.json({ ok: true });
});

app.post("/api/rooms/:id/join", (req, res) => {
  const room = joinRoom({
    roomId: req.params.id.toUpperCase(),
    studentName: req.body.studentName
  });
  if (!room) return res.status(404).json({ message: "Room not found" });
  io.to(room.id).emit("room:updated", room);
  res.json(room);
});

app.get("/api/rooms/:id/code/:studentName", (req, res) => {
  res.json(getCodeSnapshot(req.params.id.toUpperCase(), req.params.studentName) || {});
});

app.post("/api/run", async (req, res) => {
  const { problemId, language, code } = req.body;
  const problem = allProblems().find((item) => item.id === problemId);
  if (!problem) return res.status(404).json({ message: "Problem not found" });
  const result = await judge(problem, language, code, true);
  res.json(result);
});

app.post("/api/submit", async (req, res) => {
  const { roomId, problemId, studentName, language, code } = req.body;
  const problem = allProblems().find((item) => item.id === problemId);
  if (!problem) return res.status(404).json({ message: "Problem not found" });
  const result = await judge(problem, language, code, false);
  const submission = roomId
    ? addSubmission({ roomId: roomId.toUpperCase(), studentName, language, code, result })
    : addPracticeSubmission({
        problemId,
        studentName: studentName || "Practice user",
        language,
        code,
        result
      });
  if (roomId && !submission) {
    return res.status(410).json({ message: "Room is closed" });
  }
  if (roomId) {
    const room = getRoom(roomId.toUpperCase());
    io.to(room.id).emit("room:updated", room);
    io.to(room.id).emit("submission:new", submission);
  }
  res.json(submission);
});

io.on("connection", (socket) => {
  socket.on("room:join", ({ roomId, name, role }) => {
    const id = roomId?.toUpperCase();
    if (!id) return;
    socket.join(id);
    if (role === "student" && name) {
      const room = joinRoom({ roomId: id, studentName: name });
      if (room) io.to(id).emit("room:updated", room);
    }
  });

  socket.on("code:update", (snapshot) => {
    const roomId = snapshot.roomId?.toUpperCase();
    if (!roomId || !snapshot.studentName) return;
    const saved = saveCodeSnapshot({ ...snapshot, roomId });
    socket.to(roomId).emit("code:updated", saved);
  });
});

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, () => {
  console.log(`CoderRooms API listening on http://localhost:${port}`);
});
