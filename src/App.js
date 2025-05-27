import React, { useState, useEffect, useRef, Suspense } from "react";
import {
  MantineProvider,
  Button,
  ActionIcon,
  Tooltip as MantineTooltip,
  Modal,
  TextInput,
  MultiSelect,
  Divider,
  Group,
  Text
} from "@mantine/core";
import {
  IconCode,
  IconFileCode,
  IconSailboat,
  IconWand,
  IconNotebook,
  IconMapRoute,
  IconCompass,
  IconArrowUpRightCircle,
  IconArrowUpRight,
  IconRocket,
  IconEyeSearch,
  IconMap2,
  IconStar,
  IconDownload,
  IconMessageDots,
  IconUsers,
  IconEdit,
  IconLink,
  IconPin,
  IconTestPipe,
  IconPalette,
  IconFileText,
  IconLock,
  IconLockOpen
} from "@tabler/icons-react";
import { Tooltip } from "react-tooltip";
import { Toaster, toast } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Rnd } from "react-rnd";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useHotkeys } from "react-hotkeys-hook";
import { useWindowSize } from "react-use";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import mateyLottie from "./matey_lottie.json";
import confettiJson from "./lottie_confetti.json";
const MonacoEditor = React.lazy(() => import("@monaco-editor/react"));
const Lottie = React.lazy(() => import("lottie-react"));

// NeonGlowRing: Neon gradient ring for icons (conic style, customizable)
function NeonGlowRing({
  icon,
  size = 64,
  colorA = "#ae47fa",
  colorB = "#47e0fa",
  percent = 100,
  ringWidth = 9,
  glow = false, // new: agentIsActive
  borderColor,  // new: override border
}) {
  const radius = (size / 2) - (ringWidth / 2);
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - percent / 100);
  // Minimal boxShadow for glow (reduced for subtlety)
  let boxShadow = "none";
  if (glow) {
    boxShadow = "0 0 4px 1.5px #FFD70044";
  } else {
    boxShadow = "0 0 1px 0.5px #222a3240";
  }
  // Border color
  let border = "2px solid #212442";
  if (glow) {
    border = `2.5px solid ${borderColor || "#FFD700"}`;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(30,33,58,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow,
        border,
        position: "relative",
        transition: "box-shadow 0.18s, border 0.18s",
        overflow: "visible", // ensure ring glow is never clipped
      }}
    >
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="neon-conic" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colorA} />
            <stop offset="95%" stopColor={colorB} />
          </linearGradient>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#neon-conic)"
          strokeWidth={ringWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          filter="url(#neon-glow)"
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(.4,2,.6,1)",
            opacity: 1,
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          color: "#fff",
          fontSize: size * 0.52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "drop-shadow(0 0 6px #fff) drop-shadow(0 0 16px #fff8)",
        }}
      >
        {icon}
      </div>
    </div>
  );
}

// Base URL for backend FastAPI server
const API = process.env.REACT_APP_API_URL || "http://localhost:8000";


// ───────────────────────── Agent Setup ─────────────────────────


// ───────────────────────── Main App Component ─────────────────────────
export default function App() {
  const MAX_INPUT_HEIGHT = 120;
  const [zMax, setZMax] = useState(5);

  // Chat rooms state: one-on-one and group chats
  const [chatRooms, setChatRooms] = useState([
    {
      id: 'coder',
      name: 'Coder',
      participants: ['coder'],
      log: [],
      open: true,
      x: 120,
      y: 80,
      width: 480,
      height: 380,
      z: zMax + 1
    }
  ]);
  // Modal + form state for creating groups
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAgents, setNewGroupAgents] = useState([]);
  // Dark‑mode toggle (light ↔ dark)
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return prefersDark;
    const saved = window.localStorage.getItem("theme");
    return saved ? saved === "dark" : prefersDark;
  });

  /**
   * callAgentAPI: Send a prompt to the specified agent and return its response.
   */
  async function callAgentAPI(agentId, text) {
    try {
      const resp = await fetch(`${API}/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text })
      });
      const data = await resp.json();
      return data.result || data.reply || data.message || "";
    } catch (err) {
      console.error("callAgentAPI error:", err);
      return `⚠️ Error contacting ${agentId}`;
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.theme = dark ? "dark" : "light";
  }, [dark]);
  // ───────────────────────────────────
  // Windows and UI state
  const [openWindows, setOpenWindows] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("aw_open_windows") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [minimized, setMinimized] = useState([]); // { id, icon, color }
  const [lockedWindows, setLockedWindows] = useState({});
  const toggleLock = id => {
    setLockedWindows(l => ({ ...l, [id]: !l[id] }));
  };
  const [showProfile, setShowProfile] = useState(false);

  // Coder
  const [coderLog, setCoderLog] = useState([
    { id: 0, sender: "system", text: "Welcome to Anchorwork — Coder online.", time: new Date().toLocaleTimeString() }
  ]);
  const [confetti, setConfetti] = useState(false);
  const makeEntry = (sender, text) => ({
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now() + Math.random(),
    sender,
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  const [coderPrompt, setCoderPrompt] = useState("");
  const [coderThinking, setCoderThinking] = useState(false);
  const [code, setCode] = useState("// Start coding here!\n");
  // Live status pushed from SSE (now on-demand only)
  const [coderStatus, setCoderStatus] = useState({ phase: "idle", step: 0, timings: {} });
  // Download button pressed state (for coder‑code window)
  const [downloadPressed, setDownloadPressed] = useState(false);
  // Send button pressed state (for Coder chat)
  const [sendPressed, setSendPressed] = useState(false);

  // Track thinking state per agent id  e.g., { coder: false, firstmatey: false, … }
  const [agentThinking, setAgentThinking] = useState({});
  const startThinking = id => setAgentThinking(t => ({ ...t, [id]: true }));
  const stopThinking  = id => setAgentThinking(t => ({ ...t, [id]: false }));

  // ───────────────── Chat scroll handling ─────────────────
  const chatScrollRef = useRef(null);
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [coderLog]);

// Agents: Anchorwork Crew (updated icons and roles)
const agents = [
  { id: "coder", name: "Coder", icon: IconCode, color: "#1AF5D6" },
  { id: "firstmatey", name: "First Matey", icon: IconSailboat, color: "#ae47fa" },
  { id: "alchemist", name: "Alchemist", icon: IconWand, color: "#FFC100" },
  { id: "cartographer", name: "Cartographer", icon: IconNotebook, color: "#00FF5A" },
  { id: "compass", name: "Compass", icon: IconCompass, color: "#FF0000" },
  { id: "watcher", name: "Watcher", icon: IconEyeSearch, color: "#2977f5" }
];
  // Modern Dashboard State (multi-column, agent/user cards)
  // Per-agent chat state
  const [agentPrompts, setAgentPrompts] = useState({});  // { agentId: promptText }
  const [agentLogs, setAgentLogs]       = useState({});  // { agentId: [{id,text,sender,time}, ...] }

  // Helper to make a chat entry
  const makeAgentEntry = (agentId, sender, text) => ({
    id: `${agentId}-${Date.now()}`,
    sender,
    text,
    time: new Date().toLocaleTimeString()
  });
  const [dashboard, setDashboard] = useState([
    { id: "current", title: "Current Tasks", cards: [] },
    { id: "todo", title: "To Do", cards: [] },
    { id: "dream", title: "Dream Vision", cards: [] },
    { id: "ideas", title: "Ideas", cards: [] },
    { id: "suggestions", title: "Agent Suggestions", cards: [] }
  ]);
  // For demo: populate with a few cards on mount
  useEffect(() => {
    setDashboard(d => d.map(col => {
      if (col.id === "current") return { ...col, cards: [
        { id: (crypto.randomUUID ? crypto.randomUUID() : "c1"), text: "Upgrade patch logic", source: "user" }
      ] };
      if (col.id === "todo") return { ...col, cards: [
        { id: (crypto.randomUUID ? crypto.randomUUID() : "c2"), text: "Try APA export", source: "user" }
      ] };
      if (col.id === "dream") return { ...col, cards: [
        { id: (crypto.randomUUID ? crypto.randomUUID() : "c3"), text: "Design Vessel Quiz", source: "user" }
      ] };
      if (col.id === "ideas") return { ...col, cards: [
        { id: (crypto.randomUUID ? crypto.randomUUID() : "c4"), text: "Add Monaco editor", source: "user" }
      ] };
      if (col.id === "suggestions") return { ...col, cards: [
        { id: (crypto.randomUUID ? crypto.randomUUID() : "a1"), text: "Automate daily summary", source: "agent", agentId: "firstmatey" }
      ] };
      return col;
    }));
  // eslint-disable-next-line
  }, []);


  // ⌘ / Ctrl + K focuses Coder chat
  useHotkeys(
    "meta+k,ctrl+k",
    () => {
      openAgentWindow("coder");
      setTimeout(() => {
        const ta = document.querySelector(
          'textarea[placeholder="Type to Coder..."]'
        );
        ta?.focus();
      }, 80);
    },
    [openWindows]
  );

  // Persist window layout
  const { width: winW } = useWindowSize();
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "aw_open_windows",
        JSON.stringify(openWindows)
      );
    }
  }, [openWindows]);

  const isMobile = winW < 700;

  // Helper to get window type and agent
  function parseWindowId(id) {
    if (id === "coder-chat" || id === "coder-code") return { agentId: "coder" };
    return { agentId: id };
  }

  // Window stack helpers
  function bringToFront(id) {
    setOpenWindows(ws => {
      const maxZ = Math.max(...ws.map(w => w.z || 1), zMax);
      return ws.map(w => w.id === id ? { ...w, z: maxZ + 1 } : w);
    });
    setZMax(z => z + 1);
  }

  // Open agent window (with stacking, and minimize restore)
  function openAgentWindow(id) {
    // Proportional cascade offsets: 8% of width/height
    // Compute proportional offsets (10% of window dimensions)
    const baseWidth  = id === "coder-chat" ? 480 : id === "coder-code" ? 560 : 460;
    const baseHeight = id === "coder-chat" ? 380 : id === "coder-code" ? 390 : 350;
    const offsetX    = Math.round(baseWidth  * 0.10);
    const offsetY    = Math.round(baseHeight * 0.10);
    // If minimized, restore instead
    const minIdx = minimized.findIndex(m => m.id === id);
    if (minIdx !== -1) {
      setMinimized(mins => mins.filter((m, i) => i !== minIdx));
      setOpenWindows(ws => {
        const maxZ = Math.max(...ws.map(w => w.z || 1), zMax);
        return [
          ...ws,
          // For coder-chat, use correct window config
          id === "coder-chat"
            ? { id: "coder-chat", width: 480, height: 380, x: 120 + ws.length * offsetX, y: 80 + ws.length * offsetY, z: maxZ + 1 }
            : { id, width: 460, height: 350, x: 120 + ws.length * offsetX, y: 80 + ws.length * offsetY, z: maxZ + 1 }
        ];
      });
      setZMax(z => z + 1);
      return;
    }
    // If id is "coder-chat", open only coder-chat window
    if (id === "coder-chat") {
      let nextZ = zMax + 1;
      setOpenWindows(ws => {
        const chatIdx = ws.findIndex(w => w.id === "coder-chat");
        let newWs = ws;
        if (chatIdx === -1) {
          newWs = [
            ...ws,
            {
              id: "coder-chat",
              width: 480,
              height: 380,
              x: 120 + ws.length * offsetX,
              y: 80 + ws.length * offsetY,
              z: nextZ
            }
          ];
        } else {
          newWs = newWs.map((w, i) => w.id === "coder-chat" ? { ...w, z: nextZ } : w);
        }
        return newWs;
      });
      setZMax(z => z + 1);
      return;
    }
    // If id is "coder", open only coder-chat window (never code editor)
    if (id === "coder") {
      let nextZ = zMax + 1;
      setOpenWindows(ws => {
        const chatIdx = ws.findIndex(w => w.id === "coder-chat");
        let newWs = ws;
        if (chatIdx === -1) {
          newWs = [
            ...ws,
            { id: "coder-chat", width: 480, height: 380, x: 120 + ws.length * offsetX, y: 80 + ws.length * offsetY, z: nextZ }
          ];
        } else {
          newWs = newWs.map((w, i) => w.id === "coder-chat" ? { ...w, z: nextZ } : w);
        }
        return newWs;
      });
      setZMax(z => z + 1);
      return;
    }
    // Otherwise, open only the agent's own window (never coder-code or coder-chat)
    const idx = openWindows.findIndex(w => w.id === id);
    if (idx !== -1) {
      setOpenWindows(ws =>
        ws.map((w, i) => (i === idx ? { ...w, z: zMax + 1 } : w))
      );
      setZMax(z => z + 1);
    } else {
      setOpenWindows(ws => [
        ...ws,
        { id, width: 460, height: 350, x: 120 + ws.length * offsetX, y: 80 + ws.length * offsetY, z: zMax + 1 }
      ]);
      setZMax(z => z + 1);
    }
  }

  function openCoderCodeWindow() {
    // Only open code editor window for coder
    let nextZ = zMax + 1;
    setOpenWindows(ws => {
      const codeIdx = ws.findIndex(w => w.id === "coder-code");
      let newWs = ws;
      if (codeIdx === -1) {
        newWs = [...ws, { id: "coder-code", width: 560, height: 390, x: 420, y: 130, z: nextZ }];
      } else {
        newWs = newWs.map((w, i) => w.id === "coder-code" ? { ...w, z: nextZ } : w);
      }
      return newWs;
    });
    setZMax(z => z + 1);
  }

  function closeAgentWindow(id) {
    setOpenWindows(ws => ws.filter(w => w.id !== id));
  }

  function minimizeWindow(id) {
    setOpenWindows(ws => ws.filter(w => w.id !== id));
  }

  // Coder chat/send
  // ───────── Coder pre‑flight: verifies ping + GPT + status in one click ─────────
  async function runCoderPreflight() {
    try {
      // ① Basic reachability
      const pingResp = await fetch(`${API}/coder/ping`);
      const pingData = await pingResp.json();
      if (!pingData.ok) throw new Error("Ping failed");

      // ② GPT connectivity
      const smokeResp = await fetch(`${API}/coder/gpt_smoke_test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Write a random one‑line ship log confirming all Anchorwork systems are nominal."
        })
      });
      const smokeData = await smokeResp.json();
      if (!smokeData.ok) throw new Error(smokeData.error || "GPT failed");

      // ③ Current boot status (optional)
      const statusResp = await fetch(`${API}/coder/boot_status`);
      const statusData = await statusResp.json();

      // Build success toast and add to coder chat log
      const snippet = (smokeData.reply || smokeData.result || smokeData.message || "").toString().slice(0, 60);
      setCoderLog(lg => [
        ...lg,
        makeEntry("system", `✅ Preflight: GPT OK • phase=${statusData.phase || "idle"} • ${snippet}`)
      ]);
      toast.success(
        `✅ Ping OK • GPT OK • phase=${statusData.phase || "idle"} • ${snippet}`
      );
    } catch (err) {
      console.error(err);
      toast.error("Preflight failed: " + err.message);
    }
  }
  const sendToCoder = async () => {
    if (!coderPrompt.trim()) return;
    const promptText = coderPrompt;           // capture before we clear
    setCoderPrompt("");
    // Log the user message
    setCoderLog(lg => [...lg, makeEntry("user", promptText)]);
    setCoderThinking(true);
    // Open SSE *only* for this request
    const es = new EventSource(`${API}/coder/stream_thoughts`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setCoderStatus(data);
        // Auto‑close when Coder reports idle
        if (data.phase === "idle" || data.phase === null) {
          es.close();
        }
      } catch {
        console.warn("Bad SSE payload", ev.data);
      }
    };
    es.onerror = () => es.close();
    try {
      const res = await fetch(`${API}/coder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText })
      });
      const data = await res.json();
      // Accept whatever key the backend returns
      const reply =
        data.result  ||
        data.reply   ||   // coder backend often uses this
        data.message ||   // fallback if backend sends {message:"…"}
        data.error   ||
        "⚠️ No response";
      setCoderLog(lg => [...lg, makeEntry("coder", reply)]);
    } catch (err) {
      setCoderLog(lg => [...lg, makeEntry("coder", "⚠️ Error contacting backend")]);
      console.error(err);
    } finally {
      if (es && typeof es.close === "function") es.close();   // ensure stream is closed after response
      setCoderThinking(false);
    }
  };

  const saveCode = () => {
    setCoderLog(lg => [...lg, makeEntry("system", "Code saved to /output/my_script.py (simulation).")]);
  };

  // Dashboard drag/drop logic
  function onDashboardDragEnd(result) {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    setDashboard(cols => {
      const colFromIdx = cols.findIndex(c => c.id === source.droppableId);
      const colToIdx = cols.findIndex(c => c.id === destination.droppableId);
      const card = cols[colFromIdx].cards[source.index];
      let newCols = cols.map((c, idx) => {
        if (idx === colFromIdx) {
          let newCards = [...c.cards];
          newCards.splice(source.index, 1);
          return { ...c, cards: newCards };
        }
        if (idx === colToIdx) {
          let newCards = [...c.cards];
          newCards.splice(destination.index, 0, card);
          return { ...c, cards: newCards };
        }
        return c;
      });
      return newCols;
    });
  }
  // Add card to column (prompt for user input)
  function addDashboardCard(colId) {
    const text = prompt("New card text?");
    if (text && text.trim()) {
      setDashboard(cols =>
        cols.map(col =>
          col.id === colId
            ? {
                ...col,
                cards: [
                  ...col.cards,
                  {
                    id:
                      typeof crypto !== "undefined" && crypto.randomUUID
                        ? crypto.randomUUID()
                        : Date.now() + Math.random(),
                    text,
                    source: "user"
                  }
                ]
              }
            : col
        )
      );
    }
  }
  // Add agent suggestion (simulate agent, random agent for demo)
  function addAgentSuggestion() {
    const suggestion = prompt("Agent suggestion text?");
    if (!suggestion) return;
    // Pick random agent for demo
    const agent = agents[Math.floor(Math.random() * agents.length)];
    setDashboard(cols =>
      cols.map(col =>
        col.id === "suggestions"
          ? {
              ...col,
              cards: [
                ...col.cards,
                {
                  id:
                    typeof crypto !== "undefined" && crypto.randomUUID
                      ? crypto.randomUUID()
                      : Date.now() + Math.random(),
                  text: suggestion,
                  source: "agent",
                  agentId: agent.id
                }
              ]
            }
          : col
      )
    );
    // Toast notification
    toast.custom(
      t => (
        <div style={{
          background: "rgba(30,33,58,0.93)",
          border: "1.3px solid rgba(255,215,0,0.17)",
          borderRadius: 11,
          color: "#FFD700",
          fontWeight: 600,
          fontSize: 15,
          padding: "13px 21px",
          boxShadow: "0 1.5px 6px #FFD70013",
          minWidth: 200,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <span style={{ display: "flex", alignItems: "center" }}>{agent.icon}</span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span>
              <span style={{ color: agent.color, fontWeight: 900 }}>{agent.name}</span>
            </span>
            <span style={{ fontWeight: 500, color: "#FFD700" }}>{suggestion}</span>
          </span>
        </div>
      ),
      { duration: 3200 }
    );
  }

  // Celestial background particles config
  const particlesInit = async (main) => {
    await loadFull(main);
  };
  const particlesOptions = {
    fullScreen: false,
    background: { color: { value: "#111a2b00" } },
    fpsLimit: 60,
    particles: {
      color: { value: "#fff" },
      number: { value: 120, density: { enable: true, area: 900 } },
      size: { value: 1.2, random: { enable: true, minimumValue: 0.7 } },
      opacity: { value: 0.7, random: { enable: true, minimumValue: 0.2 } },
      move: { enable: true, speed: 0.2, direction: "none", outModes: "out" }
    },
    detectRetina: true
  };

  // Tooltip helper
  const tooltipId = "main-tooltip";

  // ──────────────── Chat Rooms / Group Chat Helper Functions ────────────────
  const [groupChatsPanelOpen, setGroupChatsPanelOpen] = useState(false);
  // Example usage: toggleRoom(roomId), handleSend(roomId, text), createGroup(name, agentIds)
  function toggleRoom(roomId) {
    setChatRooms(rs => rs.map(r =>
      r.id === roomId ? { ...r, open: !r.open } : r
    ));
  }

  function handleSend(roomId, text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatRooms(rs => rs.map(r => {
      if (r.id !== roomId) return r;
      const userEntry = { id: `${roomId}-${Date.now()}`, sender: 'user', text, time };
      // Append user message first
      const updatedLog = [...r.log, userEntry];
      // Fan out to each agent asynchronously
      r.participants.forEach(async agentId => {
        const res = await callAgentAPI(agentId, text);
        const agentEntry = { id: `${agentId}-${Date.now()}`, sender: agentId, text: res, time };
        setChatRooms(rs2 => rs2.map(r2 =>
          r2.id === roomId ? { ...r2, log: [...r2.log, agentEntry] } : r2
        ));
      });
      return { ...r, log: updatedLog };
    }));
  }

  function createGroup(name, agentIds) {
    const roomId = `group-${Date.now()}`;
    setChatRooms(rs => [
      ...rs,
      {
        id: roomId,
        name,
        participants: agentIds,
        log: [],
        open: true,
        x: 150,
        y: 120,
        width: 480,
        height: 380,
        z: zMax + 1
      }
    ]);
    setZMax(z => z + 1);
  }

  // Main render
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={{ colorScheme: dark ? "dark" : "light" }}>
      {/* Group Chats Panel Modal */}
      <Modal
        opened={groupChatsPanelOpen}
        onClose={() => setGroupChatsPanelOpen(false)}
        title="Group Chats"
      >
        {chatRooms.filter(r => r.participants.length > 1).length === 0 && (
          <div style={{ color: "#FFD700", fontWeight: 500, marginBottom: 12 }}>No group chats yet. Create one below!</div>
        )}
        {chatRooms.filter(r => r.participants.length > 1).map(room => (
          <Group key={room.id} position="apart" style={{ marginBottom: 10 }}>
            <div>
              <strong style={{ color: "#FFD700" }}>{room.name}</strong>
              <div style={{ fontSize: 12, marginTop: 3 }}>
                {room.participants.map(id => {
                  const agent = agents.find(a => a.id === id);
                  if (!agent) return null;
                  return (
                    <span key={id} style={{ color: agent.color, marginRight: 8, display: "inline-flex", alignItems: "center" }}>
                      <agent.icon size={15} style={{ marginRight: 2 }} /> {agent.name}
                    </span>
                  );
                })}
              </div>
            </div>
            <Button
              size="xs"
              variant="outline"
              style={{ borderColor: "#FFD700", color: "#FFD700" }}
              onClick={() => {
                setChatRooms(rs => rs.map(r => r.id === room.id ? { ...r, open: true } : r));
                setGroupChatsPanelOpen(false);
              }}
            >
              Open
            </Button>
          </Group>
        ))}
        <Button
          fullWidth
          variant="outline"
          mt="sm"
          style={{ borderColor: "#FFD700", color: "#FFD700" }}
          onClick={() => {
            setGroupChatsPanelOpen(false);
            setGroupModalOpen(true);
          }}
        >
          + New Group Chat
        </Button>
      </Modal>
      {/* Create Group Modal */}
      <Modal
        opened={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title="Create Group Chat"
      >
        <TextInput
          label="Group Name"
          placeholder="e.g. Dev Workshop"
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
        />
        <MultiSelect
          data={agents.map(a => ({ value: a.id, label: a.name }))}
          label="Select Agents"
          placeholder="Pick one or more agents"
          value={newGroupAgents}
          onChange={setNewGroupAgents}
          searchable
          clearable
        />
        <Group position="right" mt="md">
          <Button
            onClick={() => {
              if (!newGroupName || newGroupAgents.length === 0) return;
              createGroup(newGroupName, newGroupAgents);
              setGroupModalOpen(false);
              setNewGroupName('');
              setNewGroupAgents([]);
            }}
          >
            Create
          </Button>
        </Group>
      </Modal>
      <style>{`
        .chat-scroll::-webkit-scrollbar { width: 8px; }
        .chat-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 4px; }
        .chat-scroll *::selection { background: rgba(255,215,0,0.3); }
        .monaco-editor ::selection { background: rgba(255,255,255,0.3) !important; }
        .map-card { position: relative; }
        .map-card .card-actions {
          position: absolute;
          top: 6px;
          right: 6px;
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.15s;
          pointer-events: none;
        }
        .map-card:hover .card-actions {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
      <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg, #191f2b 60%, #232a41 100%)",
      color: "#fff",
      fontFamily: "'Libre Franklin', 'Inter', sans-serif",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Celestial background */}
      <Particles
        id="star-bg"
        init={particlesInit}
        options={particlesOptions}
        style={{
          position: "fixed",
          zIndex: 0,
          left: 0, top: 0, width: "100vw", height: "100vh",
          pointerEvents: "none"
        }}
      />
      {/* Confetti surprise */}
      <AnimatePresence>
        {confetti && (
          <motion.div
            style={{
              position: "fixed",
              left: 0, top: 0, width: "100vw", height: "100vh",
              pointerEvents: "none", zIndex: 300
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Suspense fallback={null}>
              <Lottie animationData={confettiJson} style={{ width: "100vw", height: "100vh" }} loop={false} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR - stylized, modular, modern neon */}
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: isMobile ? 62 : 90,
          zIndex: 50,
          background: "rgba(16,18,29,0.29)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: isMobile ? 12 : 24,
          boxShadow: "2px 0 32px #00eaff18",
          borderRight: "2.5px solid #00eaff15",
          backdropFilter: "blur(11px) saturate(1.12)",
          gap: 0,
          pointerEvents: "auto",
          overflow: "visible",
        }}
        aria-label="Agent Sidebar"
      >
        <nav
          aria-label="Agents"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            gap: isMobile ? 4 : 10,
            marginBottom: 0,
            pointerEvents: "auto",
          }}
        >
          {agents.map((agent) => {
            // Determine if this agent is "active" (window open or selected)
            const agentIsActive =
              (() => {
                if (agent.id === "coder") {
                  // Only coder-chat marks agent as active
                  return openWindows.some(w => w.id === "coder-chat");
                }
                return openWindows.some(w => w.id === agent.id);
              })();
            // Sidebar agent icon toggles only its own window
            const handleAgentClick = () => {
              if (agent.id === "coder") {
                // Toggle only coder-chat window
                const coderChatOpen = openWindows.some(w => w.id === "coder-chat");
                if (coderChatOpen) {
                  setOpenWindows(ws => ws.filter(w => w.id !== "coder-chat"));
                } else {
                  // Open only coder-chat
                  let nextZ = zMax + 1;
                  setOpenWindows(ws => {
                    const chatIdx = ws.findIndex(w => w.id === "coder-chat");
                    let newWs = ws;
                    if (chatIdx === -1) {
                      newWs = [
                        ...ws,
                        { id: "coder-chat", width: 480, height: 380, x: 120 + ws.length * 50, y: 80 + ws.length * 50, z: nextZ }
                      ];
                    } else {
                      newWs = newWs.map((w, i) => w.id === "coder-chat" ? { ...w, z: nextZ } : w);
                    }
                    return newWs;
                  });
                  setZMax(z => z + 1);
                  bringToFront("coder-chat");
                }
              } else {
                // For other agents: toggle only their window
                const isOpen = openWindows.some(w => w.id === agent.id);
                if (isOpen) {
                  setOpenWindows(ws => ws.filter(w => w.id !== agent.id));
                } else {
                  openAgentWindow(agent.id);
                  bringToFront(agent.id);
                }
              }
            };
            // Render with Mantine ActionIcon and Tabler icon, with tooltip, no label below
            const IconComponent = agent.icon;
            // Styles for active/inactive agent sidebar ActionIcon
            const actionIconStyle = {
              margin: 0,
              marginBottom: 4,
              // Remove background, border, and boxShadow
              // Add opacity and subtle background for inactive
              opacity: agentIsActive ? 1 : 0.56,
              background: agentIsActive ? "none" : "rgba(30,34,48,0.18)",
              backdropFilter: agentIsActive ? "none" : "blur(2.5px)",
              border: "none",
              boxShadow: "none",
              padding: 0,
              transition: "transform 0.16s cubic-bezier(.42,1.6,.58,1), filter 0.18s, opacity 0.18s, background 0.18s, backdrop-filter 0.18s",
              transform: agentIsActive ? "scale(1.12)" : "scale(1)",
              // Optionally, you could add outline for accessibility.
            };
            const iconComponentStyle = {
              color: agentIsActive ? agent.color : "#fff8",
              filter: agentIsActive ? "drop-shadow(0 0 14px " + agent.color + "EE)" : "none",
              transition: "transform 0.19s cubic-bezier(.45,1.6,.55,1), filter 0.24s cubic-bezier(.42,1.4,.44,1.1)",
              willChange: "transform, filter",
              transform: agentIsActive ? "scale(1.15) rotate(-3deg)" : "scale(1)",
            };
            return (
              <div key={agent.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <MantineTooltip
                  label={agent.name}
                  position="right"
                  withArrow
                  openDelay={200}
                  closeDelay={0}
                  withinPortal={true}
                  zIndex={9999}
                >
                  <ActionIcon
                    onClick={handleAgentClick}
                    size="xl"
                    radius="xl"
                    variant="default"
                    style={actionIconStyle}
                    aria-label={agent.name}
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") handleAgentClick();
                    }}
                  >
                    <IconComponent
                      size={28}
                      style={iconComponentStyle}
                    />
                  </ActionIcon>
                </MantineTooltip>
                <div
                  style={{
                    fontSize: 11,
                    color: "#c9d3ea99",
                    fontWeight: 400,
                    textAlign: "center",
                    // Set marginTop to 0 for all agent labels
                    marginTop: 0,
                    letterSpacing: "0.06em",
                    opacity: 0.62,
                    userSelect: "none",
                    width: "100%",
                    padding: 0,
                    marginBottom: 0,
                  }}
                >
                  {agent.name}
                </div>
              </div>
            );
          })}
        </nav>
        {/* Chat Rooms Section */}
        <Divider my="sm" />
        <Text size="xs" color="gray">Chats</Text>
        <ActionIcon
          size="xl"
          onClick={() => {
            console.log("Sidebar Group Chats icon clicked");
            setGroupChatsPanelOpen(true);
          }}
          aria-label="Group Chats"
        >
          <IconUsers size={28} />
        </ActionIcon>
        <Text size="xs" color="gray">Group Chats</Text>
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        {/* — Future Tools Navigation — */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 10 }}>
          {/* Testing Center */}
          <MantineTooltip label="Testing Center" position="right" withArrow>
            <ActionIcon size="lg" radius="xl" variant="default" style={{
              background: "rgba(30,34,48,0.18)",
              backdropFilter: "blur(2.5px)",
              border: "none",
              boxShadow: "none",
              padding: 0,
              marginBottom: 6,
              color: "#fff8"
            }}>
              <IconTestPipe size={24} />
            </ActionIcon>
          </MantineTooltip>
          <div style={{ fontSize: 10, color: "#c9d3ea80", marginBottom: 10 }}>Testing Center</div>

          {/* Creative Studio */}
          <MantineTooltip label="Creative Studio" position="right" withArrow>
            <ActionIcon size="lg" radius="xl" variant="default" style={{
              background: "rgba(30,34,48,0.18)",
              backdropFilter: "blur(2.5px)",
              border: "none",
              boxShadow: "none",
              padding: 0,
              marginBottom: 6,
              color: "#fff8"
            }}>
              <IconPalette size={24} />
            </ActionIcon>
          </MantineTooltip>
          <div style={{ fontSize: 10, color: "#c9d3ea80", marginBottom: 10 }}>Creative Studio</div>

          {/* Writing Lab */}
          <MantineTooltip label="Writing Lab" position="right" withArrow>
            <ActionIcon size="lg" radius="xl" variant="default" style={{
              background: "rgba(30,34,48,0.18)",
              backdropFilter: "blur(2.5px)",
              border: "none",
              boxShadow: "none",
              padding: 0,
              marginBottom: 4,
              color: "#fff8"
            }}>
              <IconFileText size={24} />
            </ActionIcon>
          </MantineTooltip>
          <div style={{ fontSize: 10, color: "#c9d3ea80" }}>Writing Lab</div>
        </div>
        {/* Code editor icon-only ActionIcon moved below spacer */}
        {/*
          // Determine if Code Editor window is open
        */}
        {(() => {
          // Determine if Code Editor window is open
          const codeOpen = openWindows.some(w => w.id === "coder-code");
          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 10 }}>
              <MantineTooltip
                label="Code Editor"
                position="right"
                withArrow
                openDelay={200}
                closeDelay={0}
                withinPortal={true}
                zIndex={9999}
              >
                <ActionIcon
                  onClick={() => {
                    if (codeOpen) {
                      setOpenWindows(ws => ws.filter(w => w.id !== "coder-code"));
                    } else {
                      let nextZ = zMax + 1;
                      setOpenWindows(ws => {
                        const codeIdx = ws.findIndex(w => w.id === "coder-code");
                        let newWs = ws;
                        if (codeIdx === -1) {
                          newWs = [...ws, { id: "coder-code", width: 560, height: 390, x: 420, y: 130, z: nextZ }];
                        } else {
                          newWs = newWs.map((w, i) => w.id === "coder-code" ? { ...w, z: nextZ } : w);
                        }
                        return newWs;
                      });
                      setZMax(z => z + 1);
                      bringToFront("coder-code");
                    }
                  }}
                  size="lg"
                  radius="xl"
                  variant="default"
                  aria-label="Code Editor"
                  tabIndex={0}
                  style={{
                    margin: 0,
                    marginBottom: 4,
                    opacity: codeOpen ? 1 : 0.56,
                    background: codeOpen ? "none" : "rgba(30,34,48,0.18)",
                    backdropFilter: codeOpen ? "none" : "blur(2.5px)",
                    border: "none",
                    boxShadow: "none",
                    padding: 0,
                    transform: codeOpen ? "scale(1.12)" : "scale(1)",
                    transition: "transform 0.16s cubic-bezier(.42,1.6,.58,1), filter 0.18s, opacity 0.18s, background 0.18s, backdrop-filter 0.18s"
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (codeOpen) {
                        setOpenWindows(ws => ws.filter(w => w.id !== "coder-code"));
                      } else {
                        let nextZ = zMax + 1;
                        setOpenWindows(ws => {
                          const codeIdx = ws.findIndex(w => w.id === "coder-code");
                          let newWs = ws;
                          if (codeIdx === -1) {
                            newWs = [...ws, { id: "coder-code", width: 560, height: 390, x: 420, y: 130, z: nextZ }];
                          } else {
                            newWs = newWs.map((w, i) => w.id === "coder-code" ? { ...w, z: nextZ } : w);
                          }
                          return newWs;
                        });
                        setZMax(z => z + 1);
                      }
                    }
                  }}
                >
                  <IconFileCode
                    size={24}
                    style={{
                      color: codeOpen ? "#FAF9F6" : "#fff8",
                      filter: codeOpen ? "drop-shadow(0 0 14px #FAF9F6EE)" : "none",
                      transform: codeOpen ? "scale(1.15) rotate(-3deg)" : "scale(1)",
                      transition: "transform 0.19s cubic-bezier(.45,1.6,.55,1), filter 0.24s cubic-bezier(.42,1.4,.44,1.1)"
                    }}
                  />
                </ActionIcon>
              </MantineTooltip>
              <div
                style={{
                  fontSize: 10,
                  color: "#c9d3ea80",
                  marginBottom: 10
                }}
              >
                Code Editor
              </div>
            </div>
          );
        })()}
      </aside>


      {/* WINDOWS */}
      <div style={{ marginLeft: isMobile ? 72 : 105, paddingTop: 12, minHeight: "70vh" }}>
        {/* Group chat windows (dynamic, styled like agent chat) */}
        {chatRooms.filter(r => r.open && r.participants.length > 1).map(room => {
          const { id, name, participants, log, x, y, width, height, z } = room;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              style={{ position: "absolute", zIndex: z }}
              onMouseDown={() => bringToFront(id)}
            >
              <Rnd
                size={{ width, height }}
                position={{ x, y }}
                minWidth={340}
                minHeight={220}
                bounds="window"
                disableDragging={lockedWindows[id]}
                enableResizing={!lockedWindows[id]}
                style={{
                  zIndex: z,
                  background: "rgba(16,18,29,0.15)",
                  backdropFilter: "blur(12px) saturate(1.2)",
                  border: "1px solid #FFD700",
                  borderRadius: 14,
                  boxShadow: "0 0 7px #FFD70066",
                  overflow: "hidden",
                  position: "absolute",
                  color: "#fff"
                }}
                dragHandleClassName="drag-header"
                onDragStop={(e, d) => setChatRooms(rs =>
                  rs.map(r => r.id === id ? { ...r, x: d.x, y: d.y } : r)
                )}
                onResizeStop={(e, dir, ref, delta, pos) => setChatRooms(rs =>
                  rs.map(r => r.id === id
                    ? { ...r, width: parseInt(ref.style.width), height: parseInt(ref.style.height), x: pos.x, y: pos.y }
                    : r
                  )
                )}
              >
                {/* Window header with group name and agent icons */}
                <div
                  className="drag-header"
                  style={{
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 10px",
                    fontWeight: 600,
                    fontSize: 15,
                    color: "#FFD700",
                    background: "rgba(16,18,29,0.22)",
                    borderBottom: "1px solid rgba(255,215,0,0.12)",
                    borderRadius: "12px 12px 0 0",
                    boxShadow: "none",
                    position: "relative",
                    pointerEvents: "auto",
                    cursor: "grab"
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#FFD700" }}>{name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {participants.map(pid => {
                      const agent = agents.find(a => a.id === pid);
                      return agent ? (
                        <agent.icon key={pid} size={17} style={{
                          color: agent.color,
                          filter: `drop-shadow(0 0 4px ${agent.color}BB)`,
                          marginRight: 2
                        }} />
                      ) : null;
                    })}
                  </span>
                  <span style={{ flex: 1 }} />
                </div>
                {/* Chat bubbles */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div
                    className="chat-scroll"
                    style={{
                      flex: 1, overflowY: "auto", padding: "10px 12px 8px 12px",
                      display: "flex", flexDirection: "column", gap: 8
                    }}
                  >
                    {log.map((entry, idx) => {
                      const isUser = entry.sender === "user";
                      const agent = agents.find(a => a.id === entry.sender);
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: idx * 0.02 }}
                          style={{
                            display: "flex",
                            justifyContent: isUser ? "flex-end" : "flex-start",
                            margin: "3px 0"
                          }}
                        >
                          <div style={{
                            background: "rgba(16,18,29,0.4)",
                            borderRadius: 13,
                            border: `0.8px solid ${isUser ? "#FFD700" : agent?.color || "#FFF"}`,
                            color: isUser ? "#FFD700" : agent?.color || "#FFF",
                            padding: "10px 14px",
                            fontSize: 14,
                            fontWeight: 500,
                            boxShadow: "0 1px 5px #0002",
                            maxWidth: "80%",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "break-word",
                            maxHeight: "60vh",
                            overflowY: "auto",
                            position: "relative",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6
                          }}>
                            {!isUser && agent && (
                              <agent.icon
                                size={16}
                                style={{
                                  color: agent.color,
                                  marginRight: 6,
                                  background: "rgba(16,18,29,0.6)",
                                  borderRadius: "50%",
                                  padding: 2,
                                  filter: `drop-shadow(0 0 6px ${agent.color}88)`
                                }}
                              />
                            )}
                            <span style={{ paddingTop: !isUser ? 6 : 0 }}>
                              {entry.text}
                            </span>
                            <span style={{
                              position: "absolute",
                              bottom: -2,
                              right: 6,
                              fontSize: 11,
                              color: "#FFD700",
                              opacity: 0.5
                            }}>
                              {entry.time}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  {/* Input area, persistent draft per group */}
                  <div
                    style={{
                      background: "rgba(16,18,29,0.5)",
                      backdropFilter: "blur(10px) saturate(1.2)",
                      borderTop: "1px solid rgba(255,215,0,0.08)",
                      borderRadius: "0 0 14px 14px",
                      padding: "7px 11px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <textarea
                      style={{
                        flex: 1,
                        border: "none",
                        borderRadius: 10,
                        padding: "8px 10px",
                        fontSize: 15,
                        background: "rgba(16,18,29,0.6)",
                        backdropFilter: "blur(8px) saturate(1.1)",
                        color: "#fff",
                        resize: "none",
                        lineHeight: 1.4,
                        marginRight: 4,
                        boxShadow: "none",
                        outline: "none",
                        minHeight: 34,
                        height: "auto"
                      }}
                      rows={1}
                      placeholder="Type to group…"
                      value={room.prompt || ""}
                      onChange={e => {
                        const value = e.target.value;
                        setChatRooms(rs => rs.map(r => r.id === id ? { ...r, prompt: value } : r));
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          const promptText = room.prompt?.trim();
                          if (!promptText) return;
                          handleSend(id, promptText);
                          setChatRooms(rs => rs.map(r => r.id === id ? { ...r, prompt: "" } : r));
                        }
                      }}
                      onInput={e => {
                        const ta = e.target;
                        ta.style.height = 'auto';
                        ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
                        ta.style.overflowY = ta.scrollHeight > 120 ? 'auto' : 'hidden';
                      }}
                    />
                    <ActionIcon
                      onClick={() => {
                        const promptText = room.prompt?.trim();
                        if (!promptText) return;
                        handleSend(id, promptText);
                        setChatRooms(rs => rs.map(r => r.id === id ? { ...r, prompt: "" } : r));
                      }}
                      size="lg"
                      radius="xl"
                      variant="filled"
                      style={{
                        background: "#FFD700",
                        color: "#15192a",
                        border: "none",
                        boxShadow: "none",
                        marginLeft: 2,
                        opacity: 1,
                        transition: "opacity 0.15s, transform 0.16s cubic-bezier(.42,1.6,.58,1)"
                      }}
                      aria-label="Send"
                      tabIndex={0}
                    >
                      <IconArrowUpRight size={22} />
                    </ActionIcon>
                  </div>
                </div>
              </Rnd>
            </motion.div>
          );
        })}
        {/* Open windows */}
        <AnimatePresence>
          {openWindows.map((win, i) => {
            const { agentId } = parseWindowId(win.id);
            if (win.minimized) return null;
            const agent = agents.find(a => a.id === agentId);
            if (!agent) return null;
            // Coder chat window (modernized modular style)
            if (win.id === "coder-chat") {
              const backendThinking = coderStatus.phase !== "idle" && coderStatus.phase !== null;
              return (
                <motion.div
                  key={win.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  style={{ position: "absolute", zIndex: win.z }}
                  onMouseDown={() => bringToFront(win.id)}
                >
                  <Rnd
                    size={{ width: win.width, height: win.height }}
                    position={{ x: win.x, y: win.y }}
                    minWidth={340}
                    minHeight={220}
                    bounds="window"
                    disableDragging={lockedWindows[win.id]}
                    enableResizing={!lockedWindows[win.id]}
                    style={{
                      zIndex: win.z,
                      background: "rgba(16,18,29,0.15)",
                      backdropFilter: "blur(12px) saturate(1.2)",
                      border: "1px solid " + agent.color,
                      borderRadius: 14,
                      boxShadow: "0 0 7px " + agent.color + "66",
                      overflow: "hidden",
                      position: "absolute",
                      color: "#fff"
                    }}
                    dragHandleClassName="drag-header"
                    onDragStop={(e, d) => setOpenWindows(wins =>
                      wins.map(w => w.id === win.id ? { ...w, x: d.x, y: d.y } : w)
                    )}
                    onResizeStop={(e, dir, ref, delta, pos) => setOpenWindows(wins =>
                      wins.map(w => w.id === win.id
                        ? { ...w, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos }
                        : w
                      )
                    )}
                  >
                    {/* Minimal window header */}
                    <div
                      className="drag-header"
                      style={{
                        height: 38,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "0 10px",
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#FFD700",
                        background: "rgba(16,18,29,0.22)",
                        borderBottom: "1px solid rgba(255,215,0,0.12)",
                        borderRadius: "12px 12px 0 0",
                        boxShadow: "none",
                        position: "relative",
                        pointerEvents: "auto",
                        cursor: "grab"
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", marginRight: 2 }}>
                        <agent.icon
                          size={isMobile ? 24 : 28}
                          style={{
                            filter: `drop-shadow(0 0 7px ${agent.color}aa)`,
                            color: agent.color,
                            transition: "filter 0.17s, color 0.17s"
                          }}
                        />
                      </span>
                      <span style={{ flex: 1 }} />
                      {/* Preflight button moved after spacer */}
                      <MantineTooltip
                        label="Run Preflight Test"
                        position="top"
                        withArrow
                        openDelay={100}
                        zIndex={9999}
                      >
                        <ActionIcon
                          onClick={runCoderPreflight}
                          size="lg"
                          radius="xl"
                          variant="default"
                          style={{
                            background: "none",
                            border: "none",
                            boxShadow: "none",
                            padding: 0,
                            color: agent.color,
                            transition: "transform 0.16s cubic-bezier(.42,1.6,.58,1), filter 0.18s",
                            alignSelf: "center",
                            display: "flex",
                            alignItems: "center",
                            height: 38,
                          }}
                          aria-label="Run Preflight Test"
                          tabIndex={0}
                          onKeyDown={e => {
                            if (e.key === "Enter" || e.key === " ") runCoderPreflight();
                          }}
                        >
                          <IconRocket size={26} />
                        </ActionIcon>
                      </MantineTooltip>
                      {/* Lock toggle button */}
                      <MantineTooltip
                        label={lockedWindows[win.id] ? "Unlock Window" : "Lock Window"}
                        position="top" withArrow openDelay={100} zIndex={9999}
                      >
                        <ActionIcon
                          onClick={() => toggleLock(win.id)}
                          size="lg" radius="xl" variant="default"
                          style={{
                            background: "none",
                            border: "none",
                            boxShadow: "none",
                            padding: 0,
                            color: lockedWindows[win.id] ? "#FAF9F6" : agent.color
                          }}
                        >
                          {lockedWindows[win.id] ? <IconLock size={24} /> : <IconLockOpen size={24} />}
                        </ActionIcon>
                      </MantineTooltip>
                    </div>
                    {/* Chat area */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "calc(100% - 38px)",
                      background: "rgba(255,255,255,0.08)",
                      backdropFilter: "blur(10px) saturate(1.08)"
                    }}>
                      {/* Chat scroll area */}
                      <div
                        ref={chatScrollRef}
                        className="chat-scroll"
                        style={{
                          flex: 1,
                          overflowY: "auto",
                          padding: "10px 12px 8px 12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8
                        }}
                      >
                        {coderLog.map((entry, idx) => {
                          const isUser = entry.sender === "user";
                          // Glassy, minimal chat bubble style for both user and agent/system
                          return (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.19, delay: idx * 0.022 }}
                              style={{
                                display: "flex",
                                justifyContent: isUser ? "flex-end" : "flex-start",
                                margin: "3.5px 0",
                              }}
                            >
                          <div
                            style={{
                              background: "rgba(16,18,29,0.4)",
                              backdropFilter: "blur(10px) saturate(1.2)",
                              borderRadius: 13,
                              border: "0.8px solid " + agent.color,
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#fff",
                              padding: "10px 14px",
                              marginBottom: 7,
                              boxShadow: "0 1px 5px #0002",
                              maxWidth: '80%',
                              minWidth: 0,
                              wordBreak: "break-word",
                              position: "relative",
                              transition: "box-shadow 0.18s, background 0.16s",
                              overflow: "visible",
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'break-word',
                              maxHeight: '60vh',
                              overflowY: 'auto',
                            }}
                          >
                                {entry.text}
                                <span style={{
                                  position: "absolute",
                                  bottom: -2,
                                  right: 6,
                                  fontSize: 11,
                                  color: "#FFD700",
                                  opacity: 0.5,
                                  background: "transparent",
                                  padding: 0
                                }}>
                                  {entry.time}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                        {coderLog.length === 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.19 }}
                            style={{ display: "flex", justifyContent: "flex-start", margin: "3.5px 0" }}
                          >
                            <div style={{
                              background: "rgba(16,18,29,0.6)",
                              backdropFilter: "blur(10px) saturate(1.2)",
                              borderRadius: 13,
                              border: "0.8px solid " + agent.color,
                              padding: "10px 14px",
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#fff",
                              boxShadow: "0 1px 5px #0002",
                              maxWidth: '80%',
                              position: "relative",
                              overflow: "visible",
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'break-word',
                              maxHeight: '60vh',
                              overflowY: 'auto',
                            }}>
                              Thought of the day: “Consistency is the essence of command.”
                              <span style={{
                                position: "absolute",
                                bottom: -2,
                                right: 6,
                                fontSize: 11,
                                color: "#FFD700",
                                opacity: 0.5,
                                background: "transparent",
                                padding: 0
                              }}>
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </motion.div>
                        )}
                        {(coderThinking || backendThinking) && (
                          <div style={{
                            marginTop: 6,
                            fontStyle: "italic",
                            color: agent.color,
                            textAlign: "left"
                          }}>
                            <ThinkingDots color={agent.color} />
                          </div>
                        )}
                      </div>
                      {/* Input area */}
                      <div
                        style={{
                          background: "rgba(16,18,29,0.5)",
                          backdropFilter: "blur(10px) saturate(1.2)",
                          borderTop: "1px solid rgba(255,215,0,0.08)",
                          borderRadius: "0 0 14px 14px",
                          padding: "7px 11px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <textarea
                          style={{
                            flex: 1,
                            border: "none",
                            borderRadius: 10,
                            padding: "8px 10px",
                            fontSize: 15,
                            background: "rgba(16,18,29,0.6)",
                            backdropFilter: "blur(8px) saturate(1.1)",
                            color: "#fff",
                            resize: "none",
                            lineHeight: 1.4,
                            marginRight: 4,
                            boxShadow: "none",
                            outline: "none",
                            minHeight: 34,
                            height: "auto"
                          }}
                          rows={1}
                          placeholder="Type to Coder..."
                          value={coderPrompt}
                          onChange={e => setCoderPrompt(e.target.value)}
                          onInput={e => {
                            const ta = e.target;
                            ta.style.height = 'auto';
                            ta.style.height = `${Math.min(ta.scrollHeight, MAX_INPUT_HEIGHT)}px`;
                            ta.style.overflowY = ta.scrollHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendToCoder();
                            }
                          }}
                        />
                        <ActionIcon
                          onClick={sendToCoder}
                          onMouseDown={() => setSendPressed(true)}
                          onMouseUp={() => setSendPressed(false)}
                          onMouseLeave={() => setSendPressed(false)}
                          size="lg"
                          radius="xl"
                          variant="filled"
                          style={{
                            background: agent.color,
                            color: "#15192a",
                            border: "none",
                            boxShadow: "none",
                            marginLeft: 2,
                            opacity: sendPressed ? 0.45 : 1,
                            transition: "opacity 0.15s, transform 0.16s cubic-bezier(.42,1.6,.58,1)"
                          }}
                          aria-label="Send"
                          tabIndex={0}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') sendToCoder();
                          }}
                        >
                          <IconArrowUpRight size={22} />
                        </ActionIcon>
                      </div>
                      {/* Removed Open Code Editor button */}
                    </div>
                  </Rnd>
                </motion.div>
              );
            }
            // Coder code window (Monaco) - neon, draggable, dark
            if (win.id === "coder-code") {
              // Download handler
              const handleDownload = () => {
                setDownloadPressed(true);
                // Create a blob and trigger download
                const blob = new Blob([code], { type: "text/x-python" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "my_script.py";
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }, 200);
                setTimeout(() => setDownloadPressed(false), 400);
              };
              return (
                <motion.div
                  key={win.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  style={{ position: "absolute", zIndex: win.z }}
                  onMouseDown={() => bringToFront(win.id)}
                >
                  <Rnd
                    size={{ width: win.width, height: win.height }}
                    position={{ x: win.x, y: win.y }}
                    minWidth={isMobile ? 220 : 400}
                    minHeight={isMobile ? 120 : 220}
                    bounds="window"
                    disableDragging={lockedWindows[win.id]}
                    enableResizing={!lockedWindows[win.id]}
                    style={{
                      zIndex: win.z,
                      background: "linear-gradient(120deg, #1a1d2a 65%, #232a41 100%)",
                      border: `1px solid #FAF9F6`,
                      borderRadius: 14,
                      boxShadow: `0 0 7px #FAF9F666`,
                      overflow: "hidden",
                      position: "absolute",
                      color: "#fff"
                    }}
                    dragHandleClassName="drag-header"
                    onDragStop={(e, d) => setOpenWindows(wins =>
                      wins.map(w => w.id === win.id ? { ...w, x: d.x, y: d.y } : w)
                    )}
                    onResizeStop={(e, dir, ref, delta, pos) => setOpenWindows(wins =>
                      wins.map(w => w.id === win.id
                        ? { ...w, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos }
                        : w
                      )
                    )}
                  >
                    {/* Minimal window header */}
                    <div
                      className="drag-header"
                      style={{
                        height: 38,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "0 10px",
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#FAF9F6",
                        background: "rgba(16,18,29,0.22)",
                        borderBottom: "1px solid #FAF9F6",
                        borderRadius: "12px 12px 0 0",
                        boxShadow: "none",
                        position: "relative",
                        pointerEvents: "auto",
                        cursor: "grab"
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", marginRight: 2 }}>
                        <IconFileCode
                          size={isMobile ? 24 : 28}
                          style={{
                            filter: `drop-shadow(0 0 7px #FAF9F6aa)`,
                            color: "#FAF9F6",
                            transition: "filter 0.17s, color 0.17s"
                          }}
                        />
                      </span>
                      <span style={{ flex: 1 }} />
                      <MantineTooltip
                        label="Download code"
                        position="top"
                        withArrow
                        openDelay={100}
                        zIndex={9999}
                      >
                        <ActionIcon
                          onClick={handleDownload}
                          size={24}
                          radius="xl"
                          variant="default"
                          aria-label="Download code"
                          style={{
                            background: "none",
                            border: "none",
                            boxShadow: "none",
                            padding: 0,
                            color: "#FAF9F6",
                            opacity: downloadPressed ? 0.4 : 1,
                            filter: downloadPressed
                              ? "none"
                              : "drop-shadow(0 0 14px #FAF9F6EE)",
                            transition: "opacity 0.18s, filter 0.18s",
                            alignSelf: "center"
                          }}
                          tabIndex={0}
                          onKeyDown={e => {
                            if (e.key === "Enter" || e.key === " ") handleDownload();
                          }}
                        >
                          <IconDownload size={24} />
                        </ActionIcon>
                      </MantineTooltip>
                      {/* Lock toggle button */}
                      <MantineTooltip
                        label={lockedWindows[win.id] ? "Unlock Window" : "Lock Window"}
                        position="top" withArrow openDelay={100} zIndex={9999}
                      >
                        <ActionIcon
                          onClick={() => toggleLock(win.id)}
                          size="lg" radius="xl" variant="default"
                          style={{
                            background: "none",
                            border: "none",
                            boxShadow: "none",
                            padding: 0,
                            color: lockedWindows[win.id] ? "#FAF9F6" : "#FAF9F6"
                          }}
                        >
                          {lockedWindows[win.id] ? <IconLock size={24} /> : <IconLockOpen size={24} />}
                        </ActionIcon>
                      </MantineTooltip>
                    </div>
                    <div
                      style={{
                        padding: 0,
                        height: "calc(100% - 38px)",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                        minWidth: 0,
                      }}
                    >
                      <div style={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column"
                      }}>
                        <Suspense fallback={<div style={{color:"#09e2ff",textAlign:"center",paddingTop:24}}>Loading editor…</div>}>
                          <MonacoEditor
                            height="100%"
                            language="python"
                            theme="vs-dark"
                            value={code}
                            onChange={setCode}
                            options={{
                              automaticLayout: true,
                              fontSize: isMobile ? 12 : 15,
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              fontFamily: "JetBrains Mono, Fira Mono, monospace",
                              wordWrap: "on"
                            }}
                          />
                        </Suspense>
                      </div>
                    </div>
                  </Rnd>
                </motion.div>
              );
            }
            // All other agent chat windows: modernized neon card chat popup
            return (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                style={{ position: "absolute", zIndex: win.z }}
                onMouseDown={() => bringToFront(win.id)}
              >
                <Rnd
                  size={{ width: win.width, height: win.height }}
                  position={{ x: win.x, y: win.y }}
                  minWidth={340}
                  minHeight={220}
                  bounds="window"
                  disableDragging={lockedWindows[win.id]}
                  enableResizing={!lockedWindows[win.id]}
                  style={{
                    zIndex: win.z,
                    background: "rgba(16,18,29,0.15)",
                    backdropFilter: "blur(12px) saturate(1.2)",
                    border: "1px solid " + agent.color,
                    borderRadius: 14,
                    boxShadow: "0 0 7px " + agent.color + "66",
                    overflow: "hidden",
                    position: "absolute",
                    color: "#fff"
                  }}
                  dragHandleClassName="drag-header"
                  onDragStop={(e, d) => setOpenWindows(wins =>
                    wins.map(w => w.id === win.id ? { ...w, x: d.x, y: d.y } : w)
                  )}
                  onResizeStop={(e, dir, ref, delta, pos) => setOpenWindows(wins =>
                    wins.map(w => w.id === win.id
                      ? { ...w, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos }
                      : w
                    )
                  )}
                >
                  {/* Minimal window header */}
                  <div
                    className="drag-header"
                    style={{
                      height: 38,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "0 10px",
                      fontWeight: 600,
                      fontSize: 15,
                      color: agent.color || "#FFD700",
                      background: "rgba(16,18,29,0.22)",
                      borderBottom: `1px solid ${agent.color || "#FFD700"}1f`,
                      borderRadius: "12px 12px 0 0",
                      boxShadow: "none",
                      position: "relative",
                      pointerEvents: "auto",
                      cursor: "grab"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", marginRight: 2 }}>
                      <agent.icon
                        size={isMobile ? 24 : 28}
                        style={{
                          filter: `drop-shadow(0 0 7px ${agent.color}aa)`,
                          color: agent.color,
                          transition: "filter 0.17s, color 0.17s"
                        }}
                      />
                    </span>
                    <span style={{ flex: 1 }} />
                    <MantineTooltip
                      label={lockedWindows[win.id] ? "Unlock Window" : "Lock Window"}
                      position="top" withArrow openDelay={100} zIndex={9999}
                    >
                      <ActionIcon
                        onClick={() => toggleLock(win.id)}
                        size="lg" radius="xl" variant="default"
                        style={{
                          background: "none",
                          border: "none",
                          boxShadow: "none",
                          padding: 0,
                          color: lockedWindows[win.id] ? "#FAF9F6" : agent.color
                        }}
                      >
                        {lockedWindows[win.id] ? <IconLock size={24} /> : <IconLockOpen size={24} />}
                      </ActionIcon>
                    </MantineTooltip>
                  </div>
                  {/* Chat area */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "calc(100% - 38px)",
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(10px) saturate(1.08)"
                  }}>
                    {/* Chat scroll area */}
                    <div
                      className="chat-scroll"
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "10px 12px 8px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                      }}
                    >
                      { (agentLogs[agent.id] || []).map((entry, idx) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.19, delay: idx * 0.02 }}
                          style={{
                            display: "flex",
                            justifyContent: entry.sender === "user" ? "flex-end" : "flex-start",
                            margin: "3px 0"
                          }}
                        >
                          <div style={{
                            background: "rgba(16,18,29,0.6)",
                            backdropFilter: "blur(10px) saturate(1.2)",
                            borderRadius: 13,
                            border: "0.8px solid " + agent.color,
                            padding: "8px 14px",
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#fff",
                            boxShadow: "0 1px 5px #0002",
                            maxWidth: '80%',
                            position: "relative",
                            overflow: "visible",
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'break-word',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                          }}>
                            {entry.text}
                            <span style={{
                              position: "absolute",
                              bottom: -2,
                              right: 6,
                              fontSize: 11,
                              color: "#FFD700",
                              opacity: 0.5,
                              background: "transparent",
                              padding: 0
                            }}>
                              {entry.time}
                            </span>
                          </div>
                        </motion.div>
                      )) }
                      {(!agentLogs[agent.id] || agentLogs[agent.id].length === 0) && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.19 }}
                          style={{ display: "flex", justifyContent: "flex-start", margin: "3px 0" }}
                        >
                        <div style={{
                          background: "rgba(16,18,29,0.6)",
                          backdropFilter: "blur(10px) saturate(1.2)",
                          borderRadius: 13,
                          border: "0.8px solid " + agent.color,
                          padding: "8px 14px",
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#fff",
                          boxShadow: "0 1px 5px #0002",
                          maxWidth: '80%',
                          position: "relative",
                          overflow: "visible",
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'break-word',
                          maxHeight: '60vh',
                          overflowY: 'auto',
                        }}>
                            Thought of the day: “A good map begins with a single point.”
                            <span style={{
                              position: "absolute",
                              bottom: -2,
                              right: 6,
                              fontSize: 11,
                              color: "#FFD700",
                              opacity: 0.5,
                              background: "transparent",
                              padding: 0
                            }}>
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    {/* Agent thinking indicator */}
                    { agentThinking[agent.id] && (
                      <div style={{ fontStyle: "italic", color: agent.color, marginBottom: 6 }}>
                        <ThinkingDots color={agent.color} />
                      </div>
                    ) }
                    {/* Input area */}
                    <div
                      style={{
                        background: "rgba(16,18,29,0.5)",
                        backdropFilter: "blur(10px) saturate(1.2)",
                        borderTop: "1px solid rgba(255,215,0,0.08)",
                        borderRadius: "0 0 14px 14px",
                        padding: "7px 11px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <textarea
                        style={{
                          flex: 1,
                          border: "none",
                          borderRadius: 10,
                          padding: "8px 10px",
                          fontSize: 15,
                          background: "rgba(16,18,29,0.6)",
                          backdropFilter: "blur(8px) saturate(1.1)",
                          color: "#fff",
                          resize: "none",
                          lineHeight: 1.4,
                          marginRight: 4,
                          boxShadow: "none",
                          outline: "none",
                          minHeight: 34,
                          height: "auto"
                        }}
                        rows={1}
                        placeholder={`Type to ${agent.name}...`}
                        value={agentPrompts[agent.id] || ""}
                        onChange={e => setAgentPrompts(p => ({ ...p, [agent.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            const text = agentPrompts[agent.id]?.trim();
                            if (!text) return;
                            // log user entry
                            setAgentLogs(l => ({
                              ...l,
                              [agent.id]: [...(l[agent.id] || []), makeAgentEntry(agent.id, "user", text)]
                            }));
                            setAgentPrompts(p => ({ ...p, [agent.id]: "" }));
                            // simulate thinking
                            setAgentThinking(t => ({ ...t, [agent.id]: true }));
                            // TODO: call backend; for now auto-echo after delay
                            setTimeout(() => {
                              setAgentLogs(l => ({
                                ...l,
                                [agent.id]: [...(l[agent.id] || []), makeAgentEntry(agent.id, agent.name, "…response pending")]
                              }));
                              setAgentThinking(t => ({ ...t, [agent.id]: false }));
                            }, 800);
                          }
                        }}
                        onInput={e => {
                          const ta = e.target;
                          ta.style.height = 'auto';
                          ta.style.height = `${Math.min(ta.scrollHeight, MAX_INPUT_HEIGHT)}px`;
                          ta.style.overflowY = ta.scrollHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
                        }}
                      />
                      <ActionIcon
                        size="lg"
                        radius="xl"
                        variant="filled"
                        style={{
                          background: agent.color,
                          color: "#15192a",
                          border: "none",
                          boxShadow: "none",
                          marginLeft: 2,
                          opacity: 1,
                          transition: "transform 0.16s cubic-bezier(.42,1.6,.58,1), opacity 0.18s"
                        }}
                        aria-label="Send"
                        tabIndex={0}
                        // For now, send only on Enter in textarea; no click handler
                        data-tooltip-id={tooltipId}
                        data-tooltip-content="Send"
                      >
                        <IconArrowUpRight size={22} />
                      </ActionIcon>
                    </div>
                  </div>
                </Rnd>
              </motion.div>
            );
          })}
        </AnimatePresence>
      {/* Map window as draggable Rnd panel */}
      <AnimatePresence>
        {openWindows.some(w => w.id === "map") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{ position: "absolute", zIndex: openWindows.find(w => w.id === "map")?.z || 999 }}
            onMouseDown={() => bringToFront("map")}
          >
            <Rnd
              size={{
                width: openWindows.find(w => w.id === "map")?.width || 670,
                height: openWindows.find(w => w.id === "map")?.height || 390
              }}
              position={{
                x: openWindows.find(w => w.id === "map")?.x || (window.innerWidth - 740),
                y: openWindows.find(w => w.id === "map")?.y || (window.innerHeight - 470)
              }}
              minWidth={320}
              minHeight={180}
              bounds="window"
              style={{
                zIndex: openWindows.find(w => w.id === "map")?.z || 999,
                border: "1px solid rgba(255,116,0,0.4)",
                borderRadius: 14,
                boxShadow: "0 0 10px rgba(255,116,0,0.5)",
                background: "rgba(16,18,29,0.08)",
                backdropFilter: "blur(12px) saturate(1.2)",
                overflow: "hidden",
                position: "absolute",
                color: "#fff",
              }}
              dragHandleClassName="drag-header"
              onDragStop={(e, d) => setOpenWindows(wins =>
                wins.map(w => w.id === "map" ? { ...w, x: d.x, y: d.y } : w)
              )}
              onResizeStop={(e, dir, ref, delta, pos) => setOpenWindows(wins =>
                wins.map(w => w.id === "map"
                  ? { ...w, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos }
                  : w
                )
              )}
            >
              {/* Minimal window header */}
              <div
                className="drag-header"
                style={{
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 10px",
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#FF7400",
                  background: "rgba(16,18,29,0.22)",
                  borderBottom: "1px solid rgba(255,215,0,0.12)",
                  borderRadius: "12px 12px 0 0",
                  boxShadow: "none",
                  position: "relative",
                  pointerEvents: "auto",
                  cursor: "grab"
                }}
              >
                <IconMap2
                  size={24}
                  style={{
                    filter: "drop-shadow(0 0 7px #FF7400AA)",
                    color: "#FF7400",
                    transition: "filter 0.17s, color 0.17s"
                  }}
                />
                <span style={{ flex: 1 }} />
                <span>Map</span>
                <span style={{ flex: 1 }} />
              </div>
              {/* Map panel content */}
              <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                {/* Modernized Dashboard Layout with Neon Glow, Stylish Headers, and Modern Cards */}
                <DragDropContext onDragEnd={onDashboardDragEnd}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(168px, 1fr))",
                      gap: isMobile ? 8 : 18,
                      padding: isMobile ? 8 : 18,
                      width: "100%",
                      alignItems: "stretch",
                      background: "radial-gradient(circle at center, rgba(255,116,0,0.04), transparent 70%)",
                    }}
                  >
                    {dashboard.map((col, idx) => (
                      <Droppable droppableId={col.id} key={col.id}>
                        {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            background: "rgba(16,18,29,0.15)",
                            backdropFilter: "blur(8px) saturate(1.1)",
                            border: "1px solid rgba(255,116,0,0.4)",
                            borderRadius: 14,
                            boxShadow: "0 0 8px rgba(255,116,0,0.3)",
                            padding: "14px 18px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                            minWidth: 0,
                            minHeight: 120,
                            width: "100%",
                            position: "relative",
                          }}
                        >
                          {/* Modern column header */}
                          <div style={{
                            fontSize: 15,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            color: "#FF7400",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                          }}>
                            <span>{
                              col.id === "tasks"        ? "⚡ Sparks" :
                              col.id === "todo"         ? "🔥 Fuel" :
                              col.id === "build"        ? "🛠️ Build" :
                              col.id === "done"         ? "🚀 Launch" :
                              col.id === "suggestions"  ? "💡 Inspiration" :
                              col.title
                            }</span>
                            <span style={{ flex: 1 }} />
                            {(col.id !== "suggestions") && (
                              <button
                                style={{
                                  width: 32,
                                  height: 32,
                                  fontSize: 16,
                                  boxShadow: "0 1px 4px #FF740022",
                                  border: "none",
                                  borderRadius: 999,
                                  background: "linear-gradient(90deg,#FF7400 70%,#fffbe6 100%)",
                                  color: "#15192a",
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "absolute",
                                  top: 6,
                                  right: 8,
                                  zIndex: 3,
                                  cursor: "pointer",
                                  transition: "box-shadow 0.15s, background 0.15s",
                                  padding: 0,
                                }}
                                onClick={() => addDashboardCard(col.id)}
                                data-tooltip-id={tooltipId}
                                data-tooltip-content="Add Card"
                                aria-label="Add Card"
                              >+</button>
                            )}
                            {col.id === "suggestions" && (
                              <button
                                style={{
                                  width: 32,
                                  height: 32,
                                  fontSize: 16,
                                  boxShadow: "0 1px 4px #FF740022",
                                  border: "none",
                                  borderRadius: 999,
                                  background: "linear-gradient(90deg,#FF7400 70%,#fffbe6 100%)",
                                  color: "#15192a",
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "absolute",
                                  top: 6,
                                  right: 8,
                                  zIndex: 3,
                                  cursor: "pointer",
                                  transition: "box-shadow 0.15s, background 0.15s",
                                  padding: 0,
                                }}
                                onClick={addAgentSuggestion}
                                data-tooltip-id={tooltipId}
                                data-tooltip-content="Agent Suggestion"
                                aria-label="Agent Suggestion"
                              >
                                <IconStar style={{ color: "#FF7400" }} />
                              </button>
                            )}
                          </div>
                          {/* Card list */}
                          <div style={{
                            flex: 1,
                            overflowY: "auto",
                            minHeight: 0,
                            marginBottom: 0,
                            marginTop: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                          }}>
                            {col.cards.map((card, cidx) => (
                              <Draggable draggableId={card.id + ""} index={cidx} key={card.id}>
                                {(provided, snapshot) => {
                                  const agent = card.source === "agent"
                                    ? agents.find(a => a.id === card.agentId)
                                    : null;
                                  return (
                                    <motion.div
                                      className="map-card"
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      initial={false}
                                      animate={snapshot.isDragging ? { scale: 1.04 } : { scale: 1 }}
                                      transition={{ duration: 0.13 }}
                                      whileHover={{ scale: 1.03, boxShadow: "0 2px 12px rgba(255,116,0,0.4)" }}
                                      style={{
                                        background: "rgba(16,18,29,0.4)",
                                        backdropFilter: "blur(10px) saturate(1.2)",
                                        borderRadius: 13,
                                        border: "1px solid rgba(255,116,0,0.5)",
                                        padding: "14px 18px",
                                        boxShadow: "0 1px 6px rgba(255,116,0,0.2)",
                                        transition: "transform 0.1s, box-shadow 0.1s",
                                        color: "#fff",
                                        fontWeight: 500,
                                        fontSize: 14,
                                        marginBottom: 0,
                                        width: "100%",
                                        minWidth: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        ...provided.draggableProps.style
                                      }}
                                    >
                                      {card.source === "agent" && agent ? (
                                        <agent.icon
                                          size={isMobile ? 24 : 28}
                                          style={{
                                            filter: "drop-shadow(0 0 7px #FF7400AA)",
                                            color: "#FF7400",
                                            transition: "filter 0.17s, color 0.17s"
                                          }}
                                        />
                                      ) : (
                                        <GlowingProgressRing
                                          value={card.percent || 66}
                                          label={card.label || ""}
                                          size={isMobile ? 20 : 28}
                                        />
                                      )}
                                      <span style={{ flex: 1 }}>{card.text}</span>
                                      <div className="card-actions">
                                        <IconEdit size={16} color="#FF7400" />
                                        <IconLink size={16} color="#FF7400" />
                                        <IconPin size={16} color="#FF7400" />
                                      </div>
                                      <span style={{
                                        marginLeft: 12,
                                        padding: "2px 8px",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: "#15192a",
                                        background: "linear-gradient(120deg, #FF7400 0%, #FF9A3C 100%)",
                                        borderRadius: 12,
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
                                      }}>
                                        {card.source === "agent" ? agent?.name || "Agent" : "You"}
                                      </span>
                                    </motion.div>
                                  );
                                }}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                          {/* Stylish Latest Agent Suggestions feed */}
                          {col.id === "suggestions" && (
                            <div style={{
                              marginTop: isMobile ? 7 : 13,
                              paddingTop: isMobile ? 2 : 4,
                              borderTop: "1.5px dashed rgba(255,116,0,0.3)",
                              fontSize: isMobile ? 12 : 14,
                              color: "#232445aa"
                            }}>
                              <div style={{
                                fontSize: 15,
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                color: "#FF7400",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 3
                              }}>Latest Suggestions</div>
                              <div style={{
                                display: "flex", flexDirection: "column", gap: 3, maxHeight: 78, overflowY: "auto"
                              }}>
                                {col.cards.slice(-5).reverse().map((card, i) => {
                                  const agent = agents.find(a => a.id === card.agentId);
                                  return (
                                    <div key={card.id} style={{
                                      display: "flex", alignItems: "center", gap: 7,
                                      fontWeight: 500, color: "#232445cc"
                                    }}>
                                      <span style={{
                                        borderRadius: "50%",
                                        border: `2px solid ${agent?.color || "#FF7400"}`,
                                        width: 17, height: 17,
                                        aspectRatio: "1/1",
                                        overflow: "visible",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "#fff",
                                        fontSize: 13,
                                        marginRight: 0
                                      }}>
                                        <agent.icon
                                          size={15}
                                          style={{
                                            filter: "drop-shadow(0 0 7px #FF7400AA)",
                                            color: "#FF7400",
                                            transition: "filter 0.17s, color 0.17s"
                                          }}
                                        />
                                      </span>
                                      <span style={{ flex: 1, fontSize: 13 }}>{card.text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </DragDropContext>
              </div>
            </Rnd>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Map Button */}
      <ActionIcon
        onClick={() => {
          if (openWindows.some(w => w.id === "map")) {
            // If already open, close map window
            setOpenWindows(ws => ws.filter(w => w.id !== "map"));
          } else {
            // If closed, open map window
            openAgentWindow("map");
          }
        }}
        size="xl"
        radius="xl"
        variant="default"
        style={{
          position: "fixed",
          right: 32,
          bottom: 32,
          background: openWindows.some(w => w.id === "map")
            ? "rgba(255,255,255,0.09)"
            : "rgba(30,34,48,0.18)",
          color: openWindows.some(w => w.id === "map") ? "#FF7400" : "#FF7400",
          border: "none",
          boxShadow: "none",
          filter: "none",
          opacity: openWindows.some(w => w.id === "map") ? 1 : 0.56,
          zIndex: 400,
          transition: "box-shadow 0.15s, background 0.15s, transform 0.13s cubic-bezier(.42,1.6,.58,1), opacity 0.18s",
        }}
        aria-label={openWindows.some(w => w.id === "map") ? "Close Map" : "Open Map"}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            if (openWindows.some(w => w.id === "map")) {
              setOpenWindows(ws => ws.filter(w => w.id !== "map"));
            } else {
              openAgentWindow("map");
            }
          }
        }}
      >
        <IconMapRoute size={36} style={{ filter: "none" }} />
      </ActionIcon>

  {/* Close inner windows container */}
  </div>
  {/* Close outer page wrapper */}
  </div>
  <Toaster
    position="top-center"
    toastOptions={{
      style: {
        background: "rgba(30,33,58,0.92)",
        border: "1.2px solid rgba(255,215,0,0.11)",
        borderRadius: 11,
        boxShadow: "0 2px 9px #FFD70013",
        color: "#fff",
        fontWeight: 600,
        fontSize: 14,
        padding: "12px 22px"
      }
    }}
  />
  <Tooltip
    id={tooltipId}
    style={{
      zIndex: 9999,
      background: "rgba(34,38,58,0.92)",
      border: "1px solid rgba(255,215,0,0.18)",
      borderRadius: 8,
      color: "#FFD700",
      fontSize: 14,
      boxShadow: "0 1.5px 5px #FFD70013"
    }}
  />
  </MantineProvider>
);
}

// ───────────────────────── Helper Components ─────────────────────────

// Animated thinking dots for chat
function ThinkingDots({ color = "#FFD700" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, minHeight: 24 }}>
      <span style={{
        display: "inline-block",
        width: 8, height: 8,
        borderRadius: "50%",
        background: color,
        opacity: 0.7,
        animation: "thinkingDot 1.2s infinite"
      }} />
      <span style={{
        display: "inline-block",
        width: 8, height: 8,
        borderRadius: "50%",
        background: color,
        opacity: 0.7,
        animation: "thinkingDot 1.2s infinite 0.2s"
      }} />
      <span style={{
        display: "inline-block",
        width: 8, height: 8,
        borderRadius: "50%",
        background: color,
        opacity: 0.7,
        animation: "thinkingDot 1.2s infinite 0.4s"
      }} />
      <style>{`
        @keyframes thinkingDot {
          0%, 80%, 100% { transform: scale(1); opacity: 0.7; }
          40% { transform: scale(1.5); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

// Neon glowing progress ring using react-circular-progressbar
function GlowingProgressRing({ value = 68, label = "", size = 110 }) {
  return (
    <div style={{
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      filter: "drop-shadow(0 0 18px #8a42ff88) drop-shadow(0 0 44px #47e0fa55)"
    }}>
      <CircularProgressbar
        value={value}
        text={label || `${value}%`}
        styles={buildStyles({
          trailColor: "rgba(48,54,80,0.23)",
          pathColor: "url(#neon-gradient)",
          textColor: "#fff",
          strokeLinecap: "round"
        })}
      />
      <svg style={{ height: 0 }}>
        <defs>
          <linearGradient id="neon-gradient" gradientTransform="rotate(85)">
            <stop offset="0%" stopColor="#8a42ff" />
            <stop offset="50%" stopColor="#47e0fa" />
            <stop offset="100%" stopColor="#fa4ce9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// (TestButton and MapToggleButton removed)
