import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Code2,
  DoorOpen,
  Eye,
  Home,
  ListChecks,
  LogOut,
  Play,
  Plus,
  Search,
  Send,
  Target,
  Trash2,
  TrendingUp,
  UserCircle,
  UserX,
  Users,
  Video,
  VideoOff,
  AlertTriangle,
  Settings
} from "lucide-react";
import { api, makeSocket } from "./api";

const languages = [
  { id: "python", label: "Python 3" },
  { id: "javascript", label: "JavaScript" },
  { id: "java", label: "Java" }
];

function readProblemStatuses() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("coderrooms.problem-statuses") || "{}") || {};
  } catch {
    return {};
  }
}

function writeProblemStatus(problemId, status) {
  if (typeof window === "undefined") return;
  const nextStatuses = readProblemStatuses();
  nextStatuses[problemId] = { status, updatedAt: new Date().toISOString() };
  localStorage.setItem("coderrooms.problem-statuses", JSON.stringify(nextStatuses));
  window.dispatchEvent(new Event("coderrooms:problem-status-update"));
  window.dispatchEvent(new Event("coderrooms:analytics-updated"));
}

function useProblemStatuses() {
  const [statuses, setStatuses] = useState(() => readProblemStatuses());

  useEffect(() => {
    function handleStatusChange() {
      setStatuses(readProblemStatuses());
    }

    window.addEventListener("coderrooms:problem-status-update", handleStatusChange);
    window.addEventListener("storage", handleStatusChange);
    return () => {
      window.removeEventListener("coderrooms:problem-status-update", handleStatusChange);
      window.removeEventListener("storage", handleStatusChange);
    };
  }, []);

  return statuses;
}

function useAuth() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("coderrooms.token")) return setLoading(false);
    api.get("/auth/me").then(({ data }) => setProfile(data)).catch(() => localStorage.removeItem("coderrooms.token")).finally(() => setLoading(false));
  }, []);

  function saveSession({ token, user }) {
    localStorage.setItem("coderrooms.token", token);
    setProfile(user);
  }

  function logout() {
    localStorage.removeItem("coderrooms.token");
    setProfile(null);
  }

  return { profile, setProfile, loading, saveSession, logout };
}

function Shell({ profile, logout, children }) {
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
          <Link to="/profile" className="profile-link"><UserCircle size={16} /> {profile.name}{profile.verified && <span title="Verified profile">✓</span>}</Link>
          <button className="icon-button" title="Log out" onClick={logout}><LogOut size={16} /></button>
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
    function loadAnalytics() {
      api
        .get("/analytics/me")
        .then(({ data }) => setAnalytics(data));
    }

    loadAnalytics();
    window.addEventListener("coderrooms:analytics-updated", loadAnalytics);
    return () => window.removeEventListener("coderrooms:analytics-updated", loadAnalytics);
  }, [profile.name]);

  async function joinRoom() {
    if (!joinCode.trim()) return;
    const id = joinCode.trim().toUpperCase();
    await api.post(`/rooms/${id}/join`);
    navigate(`/rooms/${id}/solve`);
  }

  async function deleteRoom(roomId) {
    await api.delete(`/rooms/${roomId}`);
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
        <ProblemLibrary problems={problems} />
      </section>
    </div>
  );
}

function RoomRow({ room, profile, onDelete }) {
  const isCreator = room.teacherId ? room.teacherId === profile.id : room.teacherName === profile.name;
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
  const statuses = useProblemStatuses();
  const status = statuses[problem.id]?.status;
  const statusLabel = status === "submitted" ? "Submitted" : status === "attempted" ? "Attempted" : "";

  return (
    <Link className="problem-card" to={`/problems/${problem.id}`}>
      <div className="problem-card-head">
        <Difficulty value={problem.difficulty} />
        <span className="tests">{problem.tests.length} tests</span>
      </div>
      <h2>{problem.title}</h2>
      <p>{problem.prompt}</p>
      <div className="problem-card-footer">
        <span className="problem-topics">{problem.topics?.slice(0, 2).join(" • ")}</span>
        {statusLabel && <span className={`problem-status ${status}`}>{statusLabel}</span>}
      </div>
    </Link>
  );
}

function ProblemLibrary({ problems }) {
  const [openSection, setOpenSection] = useState("easy");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const statuses = useProblemStatuses();

  const filteredProblems = problems.filter((problem) => {
    const matchesQuery = !query || `${problem.title} ${problem.prompt} ${problem.topics?.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesDifficulty = difficulty === "all" || problem.difficulty === difficulty;
    const problemStatus = statuses[problem.id]?.status;
    const matchesStatus = statusFilter === "all" || problemStatus === statusFilter;
    return matchesQuery && matchesDifficulty && matchesStatus;
  });

  const groupedProblems = ["easy", "medium", "hard"].map((level) => ({
    level,
    items: filteredProblems.filter((problem) => problem.difficulty === level)
  }));

  return (
    <div className="problem-library">
      <div className="library-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problems" />
        </div>
        <div className="filter-group">
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="all">All levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All status</option>
            <option value="submitted">Submitted</option>
            <option value="attempted">Attempted</option>
            <option value="not-attempted">Not attempted</option>
          </select>
        </div>
      </div>

      {groupedProblems.map((group) => {
        const isOpen = openSection === group.level || group.items.length > 0 && openSection === "all";
        return (
          <section className="problem-group" key={group.level}>
            <button className="group-toggle" onClick={() => setOpenSection(openSection === group.level ? "" : group.level)}>
              {openSection === group.level ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>{group.level.charAt(0).toUpperCase() + group.level.slice(1)}</span>
              <em>{group.items.length} problems</em>
            </button>
            {isOpen && (
              <div className="problem-grid">
                {group.items.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}
              </div>
            )}
          </section>
        );
      })}
    </div>
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
      <ProblemLibrary problems={problems} />
    </div>
  );
}

function ProblemSelector({ problems, selectedIds, onChange }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");

  const filteredProblems = problems.filter((problem) => {
    const matchesQuery = !query || `${problem.title} ${problem.prompt} ${problem.topics?.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesDifficulty = difficulty === "all" || problem.difficulty === difficulty;
    return matchesQuery && matchesDifficulty;
  });

  function toggle(id) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  return (
    <div className="problem-selector-panel">
      <div className="problem-selector-toolbar">
        <div className="search-box compact">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problems" />
        </div>
        <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
          <option value="all">All levels</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div className="problem-selector">
        {filteredProblems.map((problem) => (
          <label key={problem.id}>
            <input type="checkbox" checked={selectedIds.includes(problem.id)} onChange={() => toggle(problem.id)} />
            <span><strong>{problem.title}</strong><em>{problem.difficulty}</em></span>
          </label>
        ))}
      </div>
    </div>
  );
}

function NewRoom() {
  const [problems, setProblems] = useState([]);
  const [problemIds, setProblemIds] = useState([]);
  const [name, setName] = useState("Show your skills");
  const [durationHours, setDurationHours] = useState("2");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/problems").then(({ data }) => {
      setProblems(data);
      setProblemIds(data[0] ? [data[0].id] : []);
    });
  }, []);

  async function create() {
    const { data } = await api.post("/rooms", {
      name,
      problemIds,
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
        <label>Competition problems</label>
        <ProblemSelector problems={problems} selectedIds={problemIds} onChange={setProblemIds} />
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
  const statuses = useProblemStatuses();
  const status = statuses[problem.id]?.status;
  const statusLabel = status === "submitted" ? "Submitted" : status === "attempted" ? "Attempted" : "";

  return (
    <aside className="statement">
      <div className="statement-head">
        <Difficulty value={problem.difficulty} />
        <div className="statement-meta">
          <span>{visibleTests.length} visible tests</span>
          {statusLabel && <span className={`problem-status ${status}`}>{statusLabel}</span>}
        </div>
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

function ProctorPanel({ roomId }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const stoppingRef = useRef(false);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("Camera and microphone are off.");

  useEffect(() => {
    const socket = makeSocket();
    socketRef.current = socket;
    return () => {
      stoppingRef.current = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      socket.disconnect();
    };
  }, []);

  function raiseAlert(type, text) {
    setMessage(text);
    socketRef.current?.emit("proctor:alert", { roomId, type, message: text });
  }

  useEffect(() => {
    if (!active) return;
    const onVisibility = () => {
      if (document.hidden) raiseAlert("tab-hidden", "Candidate moved away from the competition tab.");
    };
    const onBlur = () => raiseAlert("window-blur", "Candidate moved focus away from the competition window.");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [active, roomId]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stoppingRef.current = false;
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      stream.getVideoTracks().forEach((track) => track.addEventListener("ended", () => !stoppingRef.current && raiseAlert("camera-stopped", "Candidate camera was turned off or became unavailable.")));
      stream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => !stoppingRef.current && raiseAlert("microphone-stopped", "Candidate microphone was turned off or became unavailable.")));
      setActive(true);
      setMessage("Proctoring active. Your camera and microphone stay on this device only.");
    } catch {
      raiseAlert("media-permission", "Candidate could not enable the required camera and microphone.");
      setMessage("Camera or microphone permission was not granted.");
    }
  }

  function stop() {
    stoppingRef.current = true;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
    raiseAlert("proctoring-stopped", "Candidate manually stopped camera and microphone proctoring.");
  }

  return <aside className="proctor-panel">
    <div><h3><Video size={16} /> Proctoring</h3><span className={active ? "accepted" : "failed"}>{active ? "Active" : "Required"}</span></div>
    <video ref={videoRef} autoPlay muted playsInline className={active ? "proctor-video" : "proctor-video hidden"} />
    <p>{message}</p>
    <button className={active ? "plain" : "primary small"} onClick={active ? stop : start}>{active ? <><VideoOff size={15} /> Stop camera & mic</> : <><Video size={15} /> Start camera & mic</>}</button>
  </aside>;
}

function handleEditorMount(editor) {
  editor?.focus?.();
}

function CodingPage({ profile, practice = false }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [problem, setProblem] = useState(null);
  const [room, setRoom] = useState(null);
  const [roomProblems, setRoomProblems] = useState([]);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const activitySocketRef = useRef(null);
  const problemStatuses = useProblemStatuses();

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
        const assigned = data.problems?.length ? data.problems : [data.problem];
        setRoomProblems(assigned);
        setProblem(assigned[0]);
        setCode(assigned[0].starter.python);
        await api.post(`/rooms/${params.id}/join`);
      }
    }
    load();
  }, [params.id, params.problemId, practice, profile.name]);

  function selectRoomProblem(problemId) {
    const selected = roomProblems.find((item) => item.id === problemId);
    if (!selected) return;
    setProblem(selected);
    setCode(selected.starter[language] || "");
    setResult(null);
  }

  useEffect(() => {
    if (!problem) return;
    setCode(problem.starter[language] || "");
  }, [language]);

  useEffect(() => {
    if (practice || !room) return;
    const socket = makeSocket();
    activitySocketRef.current = socket;
    socket.emit("room:join", { roomId: room.id });
    const timer = setInterval(() => {
      socket.emit("code:update", { roomId: room.id, language, code });
    }, 900);
    return () => {
      clearInterval(timer);
      socket.disconnect();
      activitySocketRef.current = null;
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
        language,
        code
      };
      const { data } = await api.post(endpoint, payload);
      setResult(data);
      const nextStatus = visibleOnly ? "attempted" : "submitted";
      if (nextStatus === "submitted" || problemStatuses[problem.id]?.status !== "submitted") {
        writeProblemStatus(problem.id, nextStatus);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!problem) return <div className="page">Loading...</div>;

  const submissionAccepted = result ? result.passed === result.total : false;

  return (
    <div className="coding-layout">
      <ProblemStatement problem={problem} />
      <section className="editor-side">
        <div className="editor-toolbar">
          {!practice && roomProblems.length > 1 && <select value={problem.id} onChange={(event) => selectRoomProblem(event.target.value)} aria-label="Competition problem">{roomProblems.map((item, index) => <option value={item.id} key={item.id}>Q{index + 1}: {item.title}</option>)}</select>}
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
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            fontFamily: "JetBrains Mono, Consolas, monospace",
            lineNumbersMinChars: 3,
            scrollBeyondLastLine: false
          }}
        />
        {result && (
          <div className={`result-strip ${submissionAccepted ? "success" : "error"}`}>
            <div className="result-summary">
              <strong className={submissionAccepted ? "accepted" : "failed"}>
                {submissionAccepted ? "Accepted" : "Wrong answer"}
              </strong>
              <span>{result.passed}/{result.total} passed</span>
            </div>
            {result.tests.map((test, index) => (
              <span className={test.passed ? "accepted" : "failed"} key={index}>
                Case {index + 1}: {test.passed ? "passed" : test.stderr || `got ${test.actual || "empty"}`}
              </span>
            ))}
          </div>
        )}
        {!practice && room && <ProctorPanel roomId={room.id} />}
      </section>
    </div>
  );
}

function TeacherRoom() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [selected, setSelected] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [durationHours, setDurationHours] = useState("2");
  const [problemIds, setProblemIds] = useState([]);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [expandedSection, setExpandedSection] = useState("settings");

  function applyRoom(data) {
    setRoom(data);
    setRoomName(data.name);
    setDurationHours(String(data.durationMinutes / 60));
    setProblemIds(data.problemIds || [data.problemId]);
  }

  useEffect(() => {
    api.get(`/rooms/${id}`).then(({ data }) => { applyRoom(data); setAlerts(data.proctorAlerts || []); });
    api.get("/problems").then(({ data }) => setAllProblems(data));
    const socket = makeSocket();
    socket.emit("room:join", { roomId: id });
    socket.on("room:updated", applyRoom);
    socket.on("code:updated", (next) => {
      if (next.studentName === selected?.name) setSnapshot(next);
    });
    socket.on("proctor:alert", (alert) => setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)]));
    return () => socket.disconnect();
  }, [id, selected?.name]);

  async function selectStudent(student) {
    setSelected(student);
    const { data } = await api.get(`/rooms/${id}/code/${encodeURIComponent(student.name)}`);
    setSnapshot(data);
  }

  async function saveSettings(event) {
    event.preventDefault();
    const { data } = await api.patch(`/rooms/${id}`, { name: roomName, durationHours, problemIds });
    applyRoom(data);
    setSettingsMessage("Room settings saved. The timer has been reset.");
  }

  async function kickStudent(student) {
    const { data } = await api.post(`/rooms/${id}/kick`, { studentId: student.userId, studentName: student.name });
    applyRoom(data);
    if (selected?.id === student.id) { setSelected(null); setSnapshot(null); }
  }

  const copyCode = () => navigator.clipboard?.writeText(room?.id || "");
  const submissions = room?.submissions || [];
  const leaderboard = room?.leaderboard || [];

  if (!room) return <div className="page">Loading room...</div>;

  return (
    <div className="page room-page">
      <section className="room-meta">
        <div><span>Room</span><strong>{room.name}</strong></div>
        <div><span>Problems</span><strong>{room.problems?.length || 1} assigned</strong></div>
        <div><span>Join Code</span><strong className="join-code">{room.id}<button title="Copy join code" onClick={copyCode}><Clipboard size={15} /></button></strong></div>
        <div><span>Status</span><strong><i /> Live · {room.students.length} students</strong></div>
      </section>

      <section className="teacher-grid">
        <div>
          <h3><Users size={16} /> Students</h3>
          <div className="student-grid">
            {room.students.map((student) => (
              <div className="student-card" key={student.id}>
                <button className="student-select" onClick={() => selectStudent(student)}><span className={`dot ${student.status}`} /><strong>{student.name}</strong><em>{student.status === "passed" ? "passed" : `${student.passed}/${student.total}`}</em></button>
                <button className="kick-button" title={`Remove ${student.name}`} onClick={() => kickStudent(student)}><UserX size={15} /> Remove</button>
              </div>
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

      <section className="room-card">
        <button className="room-card-toggle" onClick={() => setExpandedSection(expandedSection === "settings" ? "" : "settings")}>
          <span><Settings size={16} /> Host Controls</span>
          {expandedSection === "settings" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {expandedSection === "settings" && (
          <div className="room-card-body">
            <form className="form-panel" onSubmit={saveSettings}>
              <label>Room name</label><input value={roomName} onChange={(event) => setRoomName(event.target.value)} required />
              <label>Timer (resets when saved)</label><select value={durationHours} onChange={(event) => setDurationHours(event.target.value)}><option value="1">1 hour</option><option value="2">2 hours</option><option value="4">4 hours</option><option value="8">8 hours</option><option value="24">24 hours</option></select>
              <label>Assigned problems</label><ProblemSelector problems={allProblems} selectedIds={problemIds} onChange={setProblemIds} />
              {settingsMessage && <p className="success-message">{settingsMessage}</p>}<button className="primary" disabled={!problemIds.length}>Save room settings</button>
            </form>
          </div>
        )}
      </section>

      <section className="room-card">
        <button className="room-card-toggle" onClick={() => setExpandedSection(expandedSection === "submissions" ? "" : "submissions")}>
          <span><ListChecks size={16} /> Live Submissions</span>
          {expandedSection === "submissions" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {expandedSection === "submissions" && (
          <div className="room-card-body">
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
            <div className="submissions leaderboard">
              <h3>Leaderboard</h3>
              {leaderboard.length === 0 ? <p className="empty">Accepted submissions will appear here.</p> : <table><thead><tr><th>Rank</th><th>Candidate</th><th>Solved</th><th>Last Accepted</th></tr></thead><tbody>{leaderboard.map((entry) => <tr key={entry.studentId || entry.studentName}><td>#{entry.rank}</td><td>{entry.studentName}</td><td>{entry.solved}/{room.problemIds.length}</td><td>{new Date(entry.acceptedAt).toLocaleTimeString()}</td></tr>)}</tbody></table>}
            </div>
          </div>
        )}
      </section>
      <section className="room-card">
        <button className="room-card-toggle" onClick={() => setExpandedSection(expandedSection === "alerts" ? "" : "alerts")}>
          <span><AlertTriangle size={16} /> Integrity & Proctoring Alerts</span>
          {expandedSection === "alerts" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {expandedSection === "alerts" && (
          <div className="room-card-body">
            {alerts.length === 0 ? <p className="empty">No integrity or proctoring alerts in this room.</p> : alerts.map((alert) => <article className="proctor-alert" key={alert.id}><strong>{alert.studentName}</strong><span>{alert.message}</span><em>{new Date(alert.createdAt).toLocaleTimeString()}</em></article>)}
          </div>
        )}
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

function AuthPage({ saveSession }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const { data } = await api.post(`/auth/${mode === "login" ? "login" : "register"}`, mode === "login" ? { email, password } : { name, email, password });
      saveSession(data); navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to continue. Please try again.");
    } finally { setBusy(false); }
  }

  return <div className="auth-page"><form className="panel auth-panel" onSubmit={submit}>
    <Code2 size={32} className="auth-logo" /><p className="eyebrow">// CoderRooms account</p><h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
    {mode === "register" && <><label>Full name</label><input value={name} onChange={(event) => setName(event.target.value)} required /></>}
    <label>Email address</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
    <label>Password</label><input type="password" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required />
    {error && <p className="form-error">{error}</p>}
    <button className="primary" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Log in" : "Register"}</button>
    <button type="button" className="plain" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Need an account? Register" : "Already registered? Log in"}</button>
  </form></div>;
}

function ProfilePage({ profile, setProfile }) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio || "");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  async function save(event) {
    event.preventDefault();
    const { data } = await api.patch("/auth/me", { name, bio });
    setProfile(data); setMessage("Profile updated.");
  }
  async function verifyAadhaarDemo() {
    setVerificationMessage("");
    try {
      const { data } = await api.post("/auth/me/verify-aadhaar", { consent, demoConfirmation: true });
      setProfile(data);
      setVerificationMessage("Demo Aadhaar verification complete. Your verified badge is now visible.");
    } catch (err) {
      setVerificationMessage(err.response?.data?.message || "Verification could not be completed.");
    }
  }
  return <div className="page form-page"><p className="eyebrow">// Account settings</p><h1>My Profile</h1><form className="panel form-panel" onSubmit={save}>
    <div className={`verification-status ${profile.verified ? "is-verified" : ""}`}><UserCircle size={22} /><strong>{profile.verified ? "Aadhaar verified" : "Profile not verified"}</strong><span>{profile.verified ? `Verified ${new Date(profile.verifiedAt).toLocaleDateString()} (${profile.verificationMethod === "aadhar-demo" ? "demo" : "provider"}).` : "Complete the safe demo flow below. No Aadhaar number, document, video, or biometric data is collected."}</span></div>
    {!profile.verified && <section className="aadhaar-demo"><strong>Aadhaar verification — project demo</strong><p>This creates a demonstration verified badge only. A production version must use an authorized UIDAI/KUA service and explicit user consent.</p><label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I understand this is a demo and no Aadhaar information is being submitted.</label><button type="button" className="primary small" disabled={!consent} onClick={verifyAadhaarDemo}>Complete demo verification</button>{verificationMessage && <p className="success-message">{verificationMessage}</p>}</section>}
    <label>Display name</label><input value={name} onChange={(event) => setName(event.target.value)} required />
    <label>About</label><textarea value={bio} maxLength="280" onChange={(event) => setBio(event.target.value)} placeholder="Tell other contestants a little about yourself" />
    {message && <p className="success-message">{message}</p>}<button className="primary">Save profile</button>
  </form></div>;
}

export default function App() {
  const { profile, setProfile, loading, saveSession, logout } = useAuth();
  if (loading) return <div className="page">Loading account...</div>;
  if (!profile) return <Routes><Route path="*" element={<AuthPage saveSession={saveSession} />} /></Routes>;
  return (
    <Shell profile={profile} logout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard profile={profile} />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/problems/:problemId" element={<CodingPage profile={profile} practice />} />
        <Route path="/rooms/new" element={<NewRoom profile={profile} />} />
        <Route path="/rooms/:id/teacher" element={<TeacherRoom />} />
        <Route path="/rooms/:id/solve" element={<CodingPage profile={profile} />} />
        <Route path="/submissions" element={<Submissions />} />
        <Route path="/profile" element={<ProfilePage profile={profile} setProfile={setProfile} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
