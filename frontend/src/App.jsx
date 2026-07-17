import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  BookOpen,
  Brain,
  Clipboard,
  Code2,
  DoorOpen,
  Eye,
  Home,
  ListChecks,
  LogOut,
  Play,
  Plus,
  Send,
  Target,
  Trash2,
  TrendingUp,
  Users
} from "lucide-react";
import { api, makeSocket } from "./api";

const languages = [
  { id: "python", label: "Python 3" },
  { id: "javascript", label: "JavaScript" },
  { id: "java", label: "Java" }
];

function useProfile() {
  const [profile, setProfile] = useState(() => {
    const stored = localStorage.getItem("coderrooms.profile");
    return stored ? JSON.parse(stored) : { name: "Pratyush Prasad", role: "teacher" };
  });

  useEffect(() => {
    localStorage.setItem("coderrooms.profile", JSON.stringify(profile));
  }, [profile]);

  return [profile, setProfile];
}

function Shell({ profile, setProfile, children }) {
  return (
    <>
      <nav className="topbar">
        <Link className="brand" to="/">
          <Code2 size={22} />
          <span>CODE<span>ROOMS</span></span>
        </Link>
        <div className="navlinks">
          <Link to="/"><Home size={15} /> Dashboard</Link>
          <Link to="/problems"><BookOpen size={15} /> Problems</Link>
          <Link to="/submissions"><ListChecks size={15} /> Submissions</Link>
          <Link className="primary small" to="/rooms/new"><Plus size={15} /> New Room</Link>
          <select
            value={profile.role}
            onChange={(event) => setProfile({ ...profile, role: event.target.value })}
            aria-label="Role"
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          <input
            className="name-input"
            value={profile.name}
            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            aria-label="Name"
          />
          <LogOut size={16} className="muted-icon" />
        </div>
      </nav>
      <main>{children}</main>
    </>
  );
}

function Difficulty({ value }) {
  return <span className={`difficulty ${value}`}>{value}</span>;
}

function Dashboard({ profile }) {
  const [problems, setProblems] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/problems").then(({ data }) => setProblems(data));
    api.get("/rooms").then(({ data }) => setRooms(data));
    const socket = makeSocket();
    socket.on("rooms:updated", setRooms);
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!profile.name.trim()) return;
    api
      .get(`/analytics/${encodeURIComponent(profile.name)}`)
      .then(({ data }) => setAnalytics(data));
  }, [profile.name]);

  async function joinRoom() {
    if (!joinCode.trim()) return;
    const id = joinCode.trim().toUpperCase();
    await api.post(`/rooms/${id}/join`, { studentName: profile.name });
    navigate(`/rooms/${id}/solve`);
  }

  async function deleteRoom(roomId) {
    await api.delete(`/rooms/${roomId}`, { data: { teacherName: profile.name } });
    setRooms((current) => current.filter((room) => room.id !== roomId));
  }

  const liveRooms = rooms.filter((room) => room.status === "live");
  const pastRooms = rooms.filter((room) => room.status !== "live");

  return (
    <div className="page narrow">
      <p className="eyebrow">// Welcome back</p>
      <h1>{profile.name.split(" ")[0]}</h1>

      <section className="dashboard-grid">
        <div className="panel join-panel">
          <h3><DoorOpen size={16} /> Join Room</h3>
          <input
            className="room-code"
            placeholder="ROOM CODE"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            maxLength={6}
          />
          <button className="primary" onClick={joinRoom}>Join</button>
          <div className="rule" />
          <Link className="ghost-button" to="/rooms/new"><Plus size={16} /> Create a Room</Link>
        </div>
        <div className="panel rooms-panel">
          <div className="section-title">
            <h3><ListChecks size={16} /> Live Rooms</h3>
            <span>{liveRooms.length} live</span>
          </div>
          {liveRooms.length === 0 && <p className="empty">No live rooms yet.</p>}
          {liveRooms.map((room) => (
            <RoomRow
              key={room.id}
              room={room}
              profile={profile}
              onDelete={deleteRoom}
            />
          ))}
          <div className="past-room-block">
            <div className="section-title">
              <h3>Past Rooms</h3>
              <span>{pastRooms.length} closed</span>
            </div>
            {pastRooms.length === 0 && <p className="empty">No past rooms yet.</p>}
            {pastRooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                profile={profile}
                onDelete={deleteRoom}
              />
            ))}
          </div>
        </div>
      </section>

      {analytics && <AnalyticsPanel analytics={analytics} />}

      <section className="library">
        <div className="section-title">
          <h3><BookOpen size={16} /> Problem Library</h3>
          <Link to="/problems">View all →</Link>
        </div>
        <div className="problem-grid">
          {problems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RoomRow({ room, profile, onDelete }) {
  const isCreator = room.teacherName === profile.name;
  const hasJoined = room.students?.some((student) => student.name === profile.name);
  const isLive = room.status === "live";
  const destination = isCreator ? `/rooms/${room.id}/teacher` : `/rooms/${room.id}/solve`;
  const dotClass = isLive && (isCreator || hasJoined) ? "green-dot" : "gray-dot";

  return (
    <div className={`room-row-wrap ${isLive ? "live" : "closed"}`}>
      <Link className="room-row" to={destination}>
        <span className="room-status-slot">
          {isLive && <i className={dotClass} />}
        </span>
        <div>
          <strong>{room.name}</strong>
          <span>{room.problem?.title}</span>
        </div>
        <div className="room-code-mini">
          {room.id}
          <span>{isLive ? "live" : "closed"}</span>
        </div>
      </Link>
      {isCreator && (
        <button
          className="icon-button danger"
          title="Delete room"
          onClick={() => onDelete(room.id)}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

function AnalyticsPanel({ analytics }) {
  return (
    <section className="analytics-panel">
      <div className="section-title">
        <h3><Brain size={16} /> AI Analytics</h3>
        <span>{analytics.score}% skill score</span>
      </div>
      <div className="analytics-grid">
        <div className="analytics-score">
          <strong>{analytics.score}</strong>
          <span>test accuracy</span>
          <p>{analytics.summary}</p>
        </div>
        <div className="analytics-list">
          {analytics.weakZones.map((zone) => (
            <article className={`zone ${zone.severity}`} key={`${zone.label}-${zone.evidence}`}>
              <div>
                <Target size={15} />
                <strong>{zone.label}</strong>
                <span>{zone.severity}</span>
              </div>
              <p>{zone.evidence}</p>
              <em>{zone.recommendation}</em>
            </article>
          ))}
        </div>
        <div className="recommendations">
          <h3><TrendingUp size={16} /> Practice Next</h3>
          {analytics.recommendedProblems.length === 0 && <p className="empty">All current problems attempted.</p>}
          {analytics.recommendedProblems.map((problem) => (
            <Link to={`/problems/${problem.id}`} key={problem.id}>
              <strong>{problem.title}</strong>
              <span>{problem.reason}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemCard({ problem }) {
  return (
    <Link className="problem-card" to={`/problems/${problem.id}`}>
      <div>
        <Difficulty value={problem.difficulty} />
        <span className="tests">{problem.tests.length} tests</span>
      </div>
      <h2>{problem.title}</h2>
      <p>{problem.prompt}</p>
    </Link>
  );
}

function Problems() {
  const [problems, setProblems] = useState([]);
  useEffect(() => {
    api.get("/problems").then(({ data }) => setProblems(data));
  }, []);
  return (
    <div className="page narrow">
      <div className="section-title">
        <h1>Problems</h1>
        <span>{problems.length} available</span>
      </div>
      <div className="problem-grid">
        {problems.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}
      </div>
    </div>
  );
}

function NewRoom({ profile }) {
  const [problems, setProblems] = useState([]);
  const [problemId, setProblemId] = useState("");
  const [name, setName] = useState("Show your skills");
  const [durationHours, setDurationHours] = useState("2");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/problems").then(({ data }) => {
      setProblems(data);
      setProblemId(data[0]?.id || "");
    });
  }, []);

  async function create() {
    const { data } = await api.post("/rooms", {
      name,
      problemId,
      teacherName: profile.name,
      durationHours
    });
    navigate(`/rooms/${data.id}/teacher`);
  }

  return (
    <div className="page form-page">
      <p className="eyebrow">// Teacher console</p>
      <h1>Create Room</h1>
      <div className="panel form-panel">
        <label>Room name</label>
        <input value={name} onChange={(event) => setName(event.target.value)} />
        <label>Problem</label>
        <select value={problemId} onChange={(event) => setProblemId(event.target.value)}>
          {problems.map((problem) => (
            <option key={problem.id} value={problem.id}>{problem.title}</option>
          ))}
        </select>
        <label>Room duration</label>
        <select value={durationHours} onChange={(event) => setDurationHours(event.target.value)}>
          <option value="1">1 hour</option>
          <option value="2">2 hours</option>
          <option value="4">4 hours</option>
          <option value="8">8 hours</option>
          <option value="24">24 hours</option>
        </select>
        <button className="primary" onClick={create}><Plus size={16} /> Create Room</button>
      </div>
    </div>
  );
}

function ProblemStatement({ problem }) {
  const visibleTests = problem.tests.filter((test) => test.visible);
  return (
    <aside className="statement">
      <div className="statement-head">
        <Difficulty value={problem.difficulty} />
        <span>{visibleTests.length} visible tests</span>
      </div>
      <h1>{problem.title}</h1>
      <p>{problem.prompt}</p>
      <h4>Input</h4>
      <p>{problem.input}</p>
      <h4>Output</h4>
      <p>{problem.output}</p>
      <h4>Example</h4>
      <pre>{problem.example}</pre>
      <div className="rule" />
      <h3>Sample Test Cases</h3>
      {visibleTests.map((test, index) => (
        <div className="case" key={`${test.input}-${index}`}>
          <div>Case {index + 1}</div>
          <section>
            <span>stdin</span>
            <pre>{test.input}</pre>
          </section>
          <section>
            <span>expected</span>
            <pre className="green">{test.expected}</pre>
          </section>
        </div>
      ))}
    </aside>
  );
}

function CodingPage({ profile, practice = false }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [problem, setProblem] = useState(null);
  const [room, setRoom] = useState(null);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      if (practice) {
        const { data } = await api.get("/problems");
        const selected = data.find((item) => item.id === params.problemId) || data[0];
        setProblem(selected);
        setCode(selected.starter.python);
      } else {
        const { data } = await api.get(`/rooms/${params.id}`);
        setRoom(data);
        setProblem(data.problem);
        setCode(data.problem.starter.python);
        await api.post(`/rooms/${params.id}/join`, { studentName: profile.name });
      }
    }
    load();
  }, [params.id, params.problemId, practice, profile.name]);

  useEffect(() => {
    if (!problem) return;
    setCode(problem.starter[language] || "");
  }, [language]);

  useEffect(() => {
    if (practice || !room) return;
    const socket = makeSocket();
    socket.emit("room:join", { roomId: room.id, name: profile.name, role: "student" });
    const timer = setInterval(() => {
      socket.emit("code:update", { roomId: room.id, studentName: profile.name, language, code });
    }, 900);
    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [practice, room, profile.name, language, code]);

  async function run(visibleOnly = true) {
    setBusy(true);
    setResult(null);
    try {
      const endpoint = visibleOnly ? "/run" : "/submit";
      const payload = {
        roomId: room?.id || searchParams.get("room"),
        problemId: problem.id,
        studentName: profile.name,
        language,
        code
      };
      const { data } = await api.post(endpoint, payload);
      setResult(visibleOnly ? data : data.result);
    } finally {
      setBusy(false);
    }
  }

  if (!problem) return <div className="page">Loading...</div>;

  return (
    <div className="coding-layout">
      <ProblemStatement problem={problem} />
      <section className="editor-side">
        <div className="editor-toolbar">
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {languages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <button className="plain" onClick={() => run(true)} disabled={busy}><Play size={15} /> Run</button>
          <button className="primary small" onClick={() => run(false)} disabled={busy}><Send size={15} /> Submit</button>
        </div>
        <Editor
          height="calc(100vh - 150px)"
          theme="vs-dark"
          language={language === "javascript" ? "javascript" : language}
          value={code}
          onChange={(value) => setCode(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            fontFamily: "JetBrains Mono, Consolas, monospace",
            lineNumbersMinChars: 3,
            scrollBeyondLastLine: false
          }}
        />
        {result && (
          <div className="result-strip">
            <strong>{result.passed}/{result.total} passed</strong>
            {result.tests.map((test, index) => (
              <span className={test.passed ? "accepted" : "failed"} key={index}>
                Case {index + 1}: {test.passed ? "passed" : test.stderr || `got ${test.actual || "empty"}`}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TeacherRoom() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [selected, setSelected] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    api.get(`/rooms/${id}`).then(({ data }) => setRoom(data));
    const socket = makeSocket();
    socket.emit("room:join", { roomId: id, role: "teacher" });
    socket.on("room:updated", setRoom);
    socket.on("code:updated", (next) => {
      if (next.studentName === selected?.name) setSnapshot(next);
    });
    return () => socket.disconnect();
  }, [id, selected?.name]);

  async function selectStudent(student) {
    setSelected(student);
    const { data } = await api.get(`/rooms/${id}/code/${encodeURIComponent(student.name)}`);
    setSnapshot(data);
  }

  const copyCode = () => navigator.clipboard?.writeText(room?.id || "");
  const submissions = room?.submissions || [];

  if (!room) return <div className="page">Loading room...</div>;

  return (
    <div className="page room-page">
      <section className="room-meta">
        <div><span>Room</span><strong>{room.name}</strong></div>
        <div><span>Problem</span><strong>{room.problem.title}</strong></div>
        <div><span>Join Code</span><strong className="join-code">{room.id}<button title="Copy join code" onClick={copyCode}><Clipboard size={15} /></button></strong></div>
        <div><span>Status</span><strong><i /> Live · {room.students.length} students</strong></div>
      </section>

      <section className="teacher-grid">
        <div>
          <h3><Users size={16} /> Students</h3>
          <div className="student-grid">
            {room.students.map((student) => (
              <button className="student-card" onClick={() => selectStudent(student)} key={student.id}>
                <span className={`dot ${student.status}`} />
                <strong>{student.name}</strong>
                <em>{student.status === "passed" ? "passed" : `${student.passed}/${student.total}`}</em>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3><Eye size={16} /> {selected ? selected.name : "Select a student"}</h3>
          <Editor
            height="400px"
            theme="vs-dark"
            language={snapshot?.language || "python"}
            value={snapshot?.code || "// click a student card to view their code"}
            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>
      </section>

      <section className="submissions">
        <h3>Live Submissions</h3>
        <table>
          <thead>
            <tr><th>Student</th><th>Lang</th><th>Tests</th><th>Status</th><th>Time</th></tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id}>
                <td>{submission.studentName}</td>
                <td>{submission.language}</td>
                <td>{submission.passed}/{submission.total}</td>
                <td><span className={submission.status}>{submission.status}</span></td>
                <td>{new Date(submission.createdAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Submissions() {
  return (
    <div className="page narrow">
      <h1>Submissions</h1>
      <p className="empty">Open a teacher room to see its live submission table.</p>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useProfile();
  return (
    <Shell profile={profile} setProfile={setProfile}>
      <Routes>
        <Route path="/" element={<Dashboard profile={profile} />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/problems/:problemId" element={<CodingPage profile={profile} practice />} />
        <Route path="/rooms/new" element={<NewRoom profile={profile} />} />
        <Route path="/rooms/:id/teacher" element={<TeacherRoom />} />
        <Route path="/rooms/:id/solve" element={<CodingPage profile={profile} />} />
        <Route path="/submissions" element={<Submissions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
