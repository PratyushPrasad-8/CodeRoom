import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import {
  addPracticeSubmission,
  addProctorAlert,
  addSubmission,
  allProblems,
  createRoom,
  deleteRoom,
  getCandidateAnalytics,
  getCodeSnapshot,
  getRoom,
  isCandidateKicked,
  joinRoom,
  kickCandidate,
  listRooms,
  findUserByEmail,
  getUserById,
  createUser,
  updateUser,
  updateRoom,
  verifyUserForDemo,
  saveCodeSnapshot
} from "./store.js";
import { judge } from "./judge.js";
import { createSession, hashPassword, publicUser, verifyPassword, verifySession } from "./auth.js";
import { findSimilarSubmission } from "./integrity/analyzer.js";

// 1. INITIALIZE EXPRESS AND HTTP SERVER AT THE TOP
const app = express();
const httpServer = createServer(app);

// 2. FORCE ALLOW ALL LOCAL DEVELOPMENT PORTS REGARDLESS OF ENV FILES
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174"
];

// If you have a production frontend URL, add it to the list dynamically
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim().replace(/\/$/, ""));
}

const corsOptions = {
  origin(origin, callback) {
    // Automatically allow server-to-server requests or matching local origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes(origin + "/")) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true
};

// 3. APPLY EXPRESS CORS MIDDLEWARE IMMEDIATELY
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// 4. INSTANTIATE SOCKET SERVER USING THE ALREADY CLEANED ARRAYS
const io = new Server(httpServer, {
  cors: {
    origin: [...allowedOrigins],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket authentication and event handlers
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");
    if (token) {
      const session = verifySession(token);
      socket.user = session ? getUserById(session.sub) : null;
    } else {
      socket.user = null;
    }
  } catch (err) {
    socket.user = null;
  }
  next();
});

io.on("connection", (socket) => {
  console.log("socket connected", { id: socket.id, user: socket.user?.id || null });
  // Join a socket to a room so the server can emit room-scoped events
  socket.on("room:join", ({ roomId } = {}) => {
    if (!roomId) return;
    const rid = String(roomId).toUpperCase();
    try { socket.join(rid); console.log("socket joined room", { socket: socket.id, room: rid, user: socket.user?.id || null }); } catch (err) { console.error("room join error", err); }
  });

  // Receive periodic code snapshots from candidates and broadcast to the room
  socket.on("code:update", (payload = {}) => {
    const { roomId, language, code } = payload;
    if (!roomId) return;
    const studentName = socket.user?.name || payload.studentName || null;
    try {
      const rid = String(roomId).toUpperCase();
      saveCodeSnapshot({ roomId: rid, studentName, language, code });
      console.log("code:update from", { room: rid, studentName, socket: socket.id });
    } catch (err) {
      // ignore save failures for live updates
    }
    io.to(String(roomId).toUpperCase()).emit("code:updated", { roomId: String(roomId).toUpperCase(), studentName, language, code });
  });

  // Proctoring / integrity alerts from clients
  socket.on("proctor:alert", (payload = {}) => {
    const { roomId, type, message } = payload;
    if (!roomId) return;
    const studentName = socket.user?.name || payload.studentName || null;
    try {
      const rid = String(roomId).toUpperCase();
      const alert = addProctorAlert({ roomId: rid, studentName, type, message });
      console.log("proctor alert saved", { room: rid, studentName, type, message, alertId: alert.id });
      io.to(rid).emit("proctor:alert", alert);
    } catch (err) {
      console.error("proctor alert error", err);
    }
  });
});

function readToken(req) {
  return req.headers.authorization?.replace(/^Bearer\s+/i, "");
}

function requireAuth(req, res, next) {
  const session = verifySession(readToken(req));
  const user = session && getUserById(session.sub);
  if (!user) return res.status(401).json({ message: "Authentication required" });
  req.user = user;
  next();
}

function isHost(room, user) {
  return room.teacherId ? room.teacherId === user.id : room.teacherName === user.name;
}

app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: "Name, email and password are required" });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address" });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
  if (findUserByEmail(email)) return res.status(409).json({ message: "An account already exists for this email" });
  const user = createUser({ id: customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16)(), name, email, passwordHash: hashPassword(password) });
  res.status(201).json({ token: createSession(user), user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const user = findUserByEmail(req.body.email);
  if (!user || !verifyPassword(req.body.password || "", user.passwordHash)) return res.status(401).json({ message: "Invalid email or password" });
  res.json({ token: createSession(user), user: publicUser(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => res.json(publicUser(req.user)));
app.patch("/api/auth/me", requireAuth, (req, res) => {
  if (req.body.name !== undefined && !String(req.body.name).trim()) return res.status(400).json({ message: "Name cannot be empty" });
  res.json(publicUser(updateUser(req.user.id, req.body)));
});
app.post("/api/auth/me/verify-aadhaar", requireAuth, (req, res) => {
  // This project intentionally does not collect Aadhaar numbers or biometric data.
  // Production verification must be delegated to an authorized UIDAI/KUA provider.
  if (req.body.consent !== true || req.body.demoConfirmation !== true) {
    return res.status(400).json({ message: "Consent is required to complete the demo verification" });
  }
  res.json(publicUser(verifyUserForDemo(req.user.id)));
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "CoderRooms API" });
});

app.get("/api/problems", (_req, res) => {
  res.json(allProblems());
});

app.get("/api/analytics/me", requireAuth, (req, res) => {
  res.json(getCandidateAnalytics(req.user.name));
});

app.get("/api/rooms", (_req, res) => {
  res.json(listRooms());
});

app.post("/api/rooms", requireAuth, (req, res) => {
  const { name, problemIds, durationHours } = req.body;
  if (!name || !Array.isArray(problemIds) || problemIds.length === 0) {
    return res.status(400).json({ message: "name and at least one problem are required" });
  }
  const room = createRoom({ name, problemIds, teacherName: req.user.name, teacherId: req.user.id, durationHours });
  io.emit("rooms:updated", listRooms());
  res.status(201).json(room);
});

app.patch("/api/rooms/:id", requireAuth, (req, res) => {
  const result = updateRoom({ roomId: req.params.id.toUpperCase(), teacherId: req.user.id, teacherName: req.user.name, ...req.body });
  if (result.reason === "not-found") return res.status(404).json({ message: "Room not found" });
  if (result.reason === "forbidden") return res.status(403).json({ message: "Only the room host can edit this room" });
  io.emit("rooms:updated", listRooms());
  io.to(result.room.id).emit("room:updated", result.room);
  res.json(result.room);
});

app.get("/api/rooms/:id", (req, res) => {
  const room = getRoom(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ message: "Room not found" });
  res.json(room);
});

app.delete("/api/rooms/:id", requireAuth, (req, res) => {
  const result = deleteRoom({
    roomId: req.params.id.toUpperCase(),
    teacherId: req.user.id,
    teacherName: req.user.name
  });
  if (result.reason === "not-found") return res.status(404).json({ message: "Room not found" });
  if (result.reason === "forbidden") {
    return res.status(403).json({ message: "Only the room creator can delete this room" });
  }
  io.emit("rooms:updated", listRooms());
  res.json({ ok: true });
});

app.post("/api/rooms/:id/join", requireAuth, (req, res) => {
  if (isCandidateKicked(req.params.id.toUpperCase(), req.user.id, req.user.name)) return res.status(403).json({ message: "You have been removed from this room" });
  const room = joinRoom({
    roomId: req.params.id.toUpperCase(),
    studentName: req.user.name,
    studentId: req.user.id
  });
  if (!room) return res.status(404).json({ message: "Room not found" });
  io.to(room.id).emit("room:updated", room);
  res.json(room);
});

app.post("/api/rooms/:id/kick", requireAuth, (req, res) => {
  const result = kickCandidate({ roomId: req.params.id.toUpperCase(), teacherId: req.user.id, teacherName: req.user.name, studentId: req.body.studentId, studentName: req.body.studentName });
  if (result.reason === "not-found") return res.status(404).json({ message: "Room not found" });
  if (result.reason === "forbidden") return res.status(403).json({ message: "Only the room host can remove candidates" });
  if (result.reason === "student-not-found") return res.status(404).json({ message: "Candidate not found" });
  io.to(result.room.id).emit("room:updated", result.room);
  io.emit("rooms:updated", listRooms());
  res.json(result.room);
});

app.get("/api/rooms/:id/code/:studentName", requireAuth, (req, res) => {
  const room = getRoom(req.params.id.toUpperCase());
  if (!room || !isHost(room, req.user)) return res.status(403).json({ message: "Only the room host can view student code" });
  res.json(getCodeSnapshot(req.params.id.toUpperCase(), req.params.studentName) || {});
});

async function runSubmission(req, res, visibleOnly) {
  const { problemId, language, code, roomId } = req.body;
  const problems = allProblems();
  const problem = problems.find((p) => p.id === problemId);
  if (!problem) return res.status(404).json({ message: "Problem not found" });

  try {
    const output = await judge(problem, language, code, visibleOnly);

    if (!visibleOnly) {
      if (roomId) {
        addSubmission({
          roomId,
          problemId,
          studentId: req.user.id,
          studentName: req.user.name,
          language,
          code,
          result: output
        });
      } else {
        addPracticeSubmission({
          problemId,
          studentName: req.user.name,
          language,
          code,
          result: output
        });
      }
    }

    res.json(output);
  } catch (error) {
    res.status(500).json({ message: "Execution error", error: error.message });
  }
}

app.post("/api/run", requireAuth, async (req, res) => {
  await runSubmission(req, res, true);
});

app.post("/api/submit", requireAuth, async (req, res) => {
  await runSubmission(req, res, false);
});

// Start the HTTP Server instance instead of just 'app' so WebSockets work
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`CoderRooms API listening on http://localhost:${PORT}`);
});
