import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { customAlphabet } from "nanoid";
import { analyzeCandidate } from "./ml/analyzer.js";
import { problems } from "./problems.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
const dbPath = join(dataDir, "db.json");
const roomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const defaultRoomDurationMinutes = 120;

const seed = {
  rooms: [],
  submissions: [],
  codeSnapshots: {}
};

function load() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, JSON.stringify(seed, null, 2));
    return structuredClone(seed);
  }
  return JSON.parse(readFileSync(dbPath, "utf8"));
}

let db = load();

function save() {
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function getExpiresAt(room) {
  if (room.expiresAt) return room.expiresAt;
  const created = new Date(room.createdAt || Date.now()).getTime();
  const duration = room.durationMinutes || defaultRoomDurationMinutes;
  return new Date(created + duration * 60 * 1000).toISOString();
}

function isRoomLive(room) {
  return new Date(getExpiresAt(room)).getTime() > Date.now();
}

function decorateRoom(room) {
  const expiresAt = getExpiresAt(room);
  return {
    ...room,
    durationMinutes: room.durationMinutes || defaultRoomDurationMinutes,
    expiresAt,
    status: isRoomLive(room) ? "live" : "closed",
    problem: problems.find((problem) => problem.id === room.problemId)
  };
}

export function listRooms() {
  return db.rooms.map(decorateRoom);
}

export function createRoom({ name, problemId, teacherName, durationHours }) {
  const problem = problems.find((item) => item.id === problemId) || problems[0];
  const durationMinutes = Math.max(15, Math.min(24 * 60, Number(durationHours || 2) * 60));
  const createdAt = new Date().toISOString();
  const room = {
    id: roomCode(),
    name,
    problemId: problem.id,
    teacherName,
    status: "live",
    durationMinutes,
    expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
    students: [],
    createdAt
  };
  db.rooms.unshift(room);
  save();
  return decorateRoom(room);
}

export function getRoom(id) {
  const room = db.rooms.find((item) => item.id === id);
  if (!room) return null;
  return {
    ...decorateRoom(room),
    submissions: db.submissions
      .filter((submission) => submission.roomId === id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  };
}

export function joinRoom({ roomId, studentName }) {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return null;
  if (!isRoomLive(room)) return getRoom(roomId);
  let student = room.students.find((item) => item.name === studentName);
  if (!student) {
    student = {
      id: roomCode(),
      name: studentName,
      status: "joined",
      passed: 0,
      total: problems.find((problem) => problem.id === room.problemId)?.tests.length || 0,
      lastSeen: new Date().toISOString()
    };
    room.students.push(student);
  } else {
    student.lastSeen = new Date().toISOString();
  }
  save();
  return getRoom(roomId);
}

export function saveCodeSnapshot({ roomId, studentName, language, code }) {
  const key = `${roomId}:${studentName}`;
  db.codeSnapshots[key] = {
    roomId,
    studentName,
    language,
    code,
    updatedAt: new Date().toISOString()
  };
  save();
  return db.codeSnapshots[key];
}

export function getCodeSnapshot(roomId, studentName) {
  return db.codeSnapshots[`${roomId}:${studentName}`] || null;
}

export function addSubmission({ roomId, studentName, language, code, result }) {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return null;
  if (!isRoomLive(room)) return null;
  const total = result.tests.length;
  const passed = result.tests.filter((test) => test.passed).length;
  const accepted = total > 0 && passed === total;
  let student = room.students.find((item) => item.name === studentName);
  if (!student) {
    student = {
      id: roomCode(),
      name: studentName,
      status: "joined",
      passed: 0,
      total,
      lastSeen: new Date().toISOString()
    };
    room.students.push(student);
  }
  if (student) {
    student.status = accepted ? "passed" : "failed";
    student.passed = passed;
    student.total = total;
    student.lastSeen = new Date().toISOString();
  }
  const submission = {
    id: roomCode(),
    roomId,
    problemId: room.problemId,
    studentName,
    language,
    code,
    passed,
    total,
    status: accepted ? "accepted" : "failed",
    createdAt: new Date().toISOString(),
    result
  };
  db.submissions.unshift(submission);
  saveCodeSnapshot({ roomId, studentName, language, code });
  db.submissions[0] = submission;
  save();
  return submission;
}

export function deleteRoom({ roomId, teacherName }) {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return { deleted: false, reason: "not-found" };
  if (room.teacherName !== teacherName) return { deleted: false, reason: "forbidden" };
  db.rooms = db.rooms.filter((item) => item.id !== roomId);
  db.submissions = db.submissions.filter((submission) => submission.roomId !== roomId);
  for (const key of Object.keys(db.codeSnapshots)) {
    if (key.startsWith(`${roomId}:`)) delete db.codeSnapshots[key];
  }
  save();
  return { deleted: true };
}

export function addPracticeSubmission({ problemId, studentName, language, code, result }) {
  const total = result.tests.length;
  const passed = result.tests.filter((test) => test.passed).length;
  const submission = {
    id: roomCode(),
    roomId: null,
    problemId,
    studentName,
    language,
    code,
    passed,
    total,
    status: total > 0 && passed === total ? "accepted" : "failed",
    createdAt: new Date().toISOString(),
    result
  };
  db.submissions.unshift(submission);
  save();
  return submission;
}

export function getCandidateAnalytics(studentName) {
  return analyzeCandidate({
    studentName,
    submissions: db.submissions,
    problems
  });
}

export function allProblems() {
  return problems;
}
