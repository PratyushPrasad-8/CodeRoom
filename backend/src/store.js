import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { rename, unlink, writeFile } from "node:fs/promises";
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
  users: [],
  rooms: [],
  submissions: [],
  codeSnapshots: {},
  proctorAlerts: []
};

function load() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, JSON.stringify(seed, null, 2));
    return structuredClone(seed);
  }
  return { ...seed, ...JSON.parse(readFileSync(dbPath, "utf8")) };
}

let db = load();
let persistPending = false;
let persistRunning = false;
let writeSequence = 0;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function persist() {
  if (persistRunning) return;
  persistRunning = true;

  while (persistPending) {
    persistPending = false;
    const contents = JSON.stringify(db, null, 2);
    const temporaryPath = `${dbPath}.${process.pid}.${++writeSequence}.tmp`;
    let saved = false;

    // Windows can briefly lock a file while it is indexed, scanned, or opened by
    // another process. Write a complete replacement file, then swap it in.
    for (let attempt = 0; attempt < 5 && !saved; attempt += 1) {
      try {
        await writeFile(temporaryPath, contents, "utf8");
        await rename(temporaryPath, dbPath);
        saved = true;
      } catch (error) {
        await unlink(temporaryPath).catch(() => {});
        if (attempt < 4) await delay(80 * (attempt + 1));
        else console.error("Could not persist CoderRooms data; the next update will retry.", error);
      }
    }
  }

  persistRunning = false;
  // Covers an update that arrived after the loop checked persistPending.
  if (persistPending) void persist();
}

function save() {
  persistPending = true;
  void persist();
}

export function findUserByEmail(email) {
  return db.users.find((user) => user.email === String(email).trim().toLowerCase()) || null;
}

export function getUserById(id) {
  return db.users.find((user) => user.id === id) || null;
}

export function createUser({ id, name, email, passwordHash }) {
  const user = { id, name: name.trim(), email: email.trim().toLowerCase(), passwordHash, bio: "", verified: false, createdAt: new Date().toISOString() };
  db.users.push(user);
  save();
  return user;
}

export function updateUser(id, { name, bio }) {
  const user = getUserById(id);
  if (!user) return null;
  if (name !== undefined) user.name = String(name).trim();
  if (bio !== undefined) user.bio = String(bio).trim().slice(0, 280);
  save();
  return user;
}

export function verifyUserForDemo(id) {
  const user = getUserById(id);
  if (!user) return null;
  user.verified = true;
  user.verifiedAt = new Date().toISOString();
  user.verificationMethod = "aadhar-demo";
  save();
  return user;
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
  const problemIds = room.problemIds?.length ? room.problemIds : [room.problemId];
  const roomProblems = problemIds.map((id) => problems.find((problem) => problem.id === id)).filter(Boolean);
  return {
    ...room,
    problemIds: roomProblems.map((problem) => problem.id),
    durationMinutes: room.durationMinutes || defaultRoomDurationMinutes,
    expiresAt,
    status: isRoomLive(room) ? "live" : "closed",
    problem: roomProblems[0],
    problems: roomProblems
  };
}

export function listRooms() {
  return db.rooms.map(decorateRoom);
}

export function createRoom({ name, problemIds, teacherName, teacherId, durationHours }) {
  const selectedProblemIds = [...new Set(problemIds || [])].filter((id) => problems.some((problem) => problem.id === id));
  const problem = problems.find((item) => item.id === selectedProblemIds[0]) || problems[0];
  const durationMinutes = Math.max(15, Math.min(24 * 60, Number(durationHours || 2) * 60));
  const createdAt = new Date().toISOString();
  const room = {
    id: roomCode(),
    name,
    problemId: problem.id,
    problemIds: selectedProblemIds.length ? selectedProblemIds : [problem.id],
    teacherName,
    teacherId,
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

export function updateRoom({ roomId, teacherId, teacherName, name, durationHours, problemIds }) {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return { room: null, reason: "not-found" };
  const host = room.teacherId ? room.teacherId === teacherId : room.teacherName === teacherName;
  if (!host) return { room: null, reason: "forbidden" };
  if (name !== undefined) room.name = String(name).trim();
  if (durationHours !== undefined) {
    room.durationMinutes = Math.max(15, Math.min(24 * 60, Number(durationHours) * 60));
    room.expiresAt = new Date(Date.now() + room.durationMinutes * 60 * 1000).toISOString();
  }
  if (problemIds !== undefined) {
    const validIds = [...new Set(problemIds)].filter((id) => problems.some((problem) => problem.id === id));
    if (validIds.length) {
      room.problemIds = validIds;
      room.problemId = validIds[0];
    }
  }
  save();
  return { room: getRoom(roomId) };
}

export function getRoom(id) {
  const room = db.rooms.find((item) => item.id === id);
  if (!room) return null;
  const submissions = db.submissions
    .filter((submission) => submission.roomId === id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const acceptedByCandidate = new Map();
  for (const submission of submissions) {
    if (submission.status !== "accepted") continue;
    const candidateKey = submission.studentId || submission.studentName;
    const current = acceptedByCandidate.get(candidateKey) || { studentId: submission.studentId || null, studentName: submission.studentName, solved: new Map() };
    const existing = current.solved.get(submission.problemId);
    if (!existing || new Date(submission.createdAt) < new Date(existing.createdAt)) current.solved.set(submission.problemId, submission);
    acceptedByCandidate.set(candidateKey, current);
  }
  const leaderboard = [...acceptedByCandidate.values()]
    .map((candidate) => {
      const acceptedSubmissions = [...candidate.solved.values()];
      const lastAcceptedAt = acceptedSubmissions.map((item) => item.createdAt).sort().at(-1);
      return { studentId: candidate.studentId, studentName: candidate.studentName, solved: acceptedSubmissions.length, acceptedAt: lastAcceptedAt };
    })
    .sort((first, second) => second.solved - first.solved || new Date(first.acceptedAt) - new Date(second.acceptedAt))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  return {
    ...decorateRoom(room),
    submissions,
    leaderboard,
    proctorAlerts: db.proctorAlerts
      .filter((alert) => alert.roomId === id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  };
}

export function joinRoom({ roomId, studentName, studentId }) {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return null;
  if (room.kickedStudentIds?.includes(studentId) || room.kickedStudents?.includes(studentName)) return null;
  if (!isRoomLive(room)) return getRoom(roomId);
  let student = room.students.find((item) => item.userId === studentId || item.name === studentName);
  if (!student) {
    student = {
      id: roomCode(),
      userId: studentId,
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

export function isCandidateKicked(roomId, studentId, studentName) {
  const room = db.rooms.find((item) => item.id === roomId);
  return Boolean(room?.kickedStudentIds?.includes(studentId) || room?.kickedStudents?.includes(studentName));
}

export function kickCandidate({ roomId, teacherId, teacherName, studentId, studentName }) {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return { room: null, reason: "not-found" };
  const host = room.teacherId ? room.teacherId === teacherId : room.teacherName === teacherName;
  if (!host) return { room: null, reason: "forbidden" };
  const candidate = room.students.find((student) => student.userId === studentId || student.name === studentName);
  if (!candidate) return { room: null, reason: "student-not-found" };
  room.students = room.students.filter((student) => student !== candidate);
  room.kickedStudents = [...new Set([...(room.kickedStudents || []), studentName])];
  room.kickedStudentIds = [...new Set([...(room.kickedStudentIds || []), candidate.userId].filter(Boolean))];
  save();
  return { room: getRoom(roomId) };
}

export function addProctorAlert({ roomId, studentName, type, message }) {
  const alert = {
    id: roomCode(),
    roomId,
    studentName,
    type,
    message,
    createdAt: new Date().toISOString()
  };
  db.proctorAlerts.unshift(alert);
  save();
  return alert;
}

export function addSubmission({ roomId, problemId, studentId, studentName, language, code, result }) {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return null;
  if (!isRoomLive(room)) return null;
  const total = result.tests.length;
  const passed = result.tests.filter((test) => test.passed).length;
  const accepted = total > 0 && passed === total;
  let student = room.students.find((item) => item.userId === studentId || item.name === studentName);
  if (!student) {
    student = {
      id: roomCode(),
      userId: studentId,
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
    problemId,
    studentId,
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

export function deleteRoom({ roomId, teacherId, teacherName }) {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) return { deleted: false, reason: "not-found" };
  if ((room.teacherId && room.teacherId !== teacherId) || (!room.teacherId && room.teacherName !== teacherName)) return { deleted: false, reason: "forbidden" };
  db.rooms = db.rooms.filter((item) => item.id !== roomId);
  db.submissions = db.submissions.filter((submission) => submission.roomId !== roomId);
  db.proctorAlerts = db.proctorAlerts.filter((alert) => alert.roomId !== roomId);
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
