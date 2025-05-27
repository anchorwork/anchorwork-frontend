import React, { useState, useEffect, useRef, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { Tooltip } from "react-tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { FaMapMarkedAlt, FaUserCircle } from "react-icons/fa";
import Sidebar from "./Sidebar";
import AgentWindow from "./AgentWindow";
import Dashboard from "./Dashboard";
import CoderChat from "./CoderChat";
import NeonGlowRing from "./NeonGlowRing";
import MapWindow from "./MapWindow";
import AgentChatWindow from "./AgentChatWindow";
import { MantineProvider, Button } from "@mantine/core";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import mateyLottie from "./matey_lottie.json";
import confettiJson from "./lottie_confetti.json";
const Lottie = React.lazy(() => import("lottie-react"));

export default function App() {
  // ─── Theme & Dark Mode ───────────────────────
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [dark, setDark] = useState(() =>
    localStorage.theme ? localStorage.theme === "dark" : prefersDark
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.theme = dark ? "dark" : "light";
  }, [dark]);

  // ─── Layout & Window State ────────────────────
  const [openWindows, setOpenWindows] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("aw_open_windows") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [zMax, setZMax] = useState(5);
  const [minimized, setMinimized] = useState([]);
  const [showProfile, setShowProfile] = useState(false);

  // Celestial background
  const particlesInit = async (main) => { await loadFull(main); };
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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("aw_open_windows", JSON.stringify(openWindows));
  }, [openWindows]);

  // ─── Agents & Dashboard Data ─────────────────
  const agents = [
    { id: "coder", name: "Coder", icon: <span role="img" aria-label="Coder">🖥️</span>, color: "#22c9f0", secondaryColor: "#2f8dfa" },
    { id: "firstmatey", name: "First Matey", icon: <span role="img" aria-label="First Matey">🧜</span>, color: "#ae47fa", secondaryColor: "#fa4ce9" },
    { id: "golden", name: "Golden", icon: <span role="img" aria-label="Golden">⭐️</span>, color: "#FFD700", secondaryColor: "#FFCE63" },
    { id: "navigator", name: "Navigator", icon: <span role="img" aria-label="Navigator">🗺️</span>, color: "#60e457", secondaryColor: "#13d6c2" },
    { id: "redalert", name: "Red Alert", icon: <span role="img" aria-label="Red Alert">🚨</span>, color: "#fa6363", secondaryColor: "#ff9659" },
    { id: "bluewave", name: "Blue Wave", icon: <span role="img" aria-label="Blue Wave">🌊</span>, color: "#667fff", secondaryColor: "#47e0fa" },
    { id: "pinkfizz", name: "Pink Fizz", icon: <span role="img" aria-label="Pink Fizz">💖</span>, color: "#ff6cf7", secondaryColor: "#2fa8fa" }
  ];
  const [dashboard, setDashboard] = useState([
    { id: "current", title: "Current Tasks", cards: [] },
    { id: "todo", title: "To Do", cards: [] },
    { id: "dream", title: "Dream Vision", cards: [] },
    { id: "ideas", title: "Ideas", cards: [] },
    { id: "suggestions", title: "Agent Suggestions", cards: [] },
  ]);

  useEffect(() => {
    // demo content
    setDashboard(cols =>
      cols.map(col =>
        col.id === "current"
          ? { ...col, cards: [{ id: "c1", text: "Upgrade patch logic", source: "user" }] }
          : col
      )
    );
  }, []);

  // ─── Window Helpers ──────────────────────────
  function bringToFront(id) {
    const maxZ = Math.max(...openWindows.map(w => w.z || 1), zMax);
    setOpenWindows(ws => ws.map(w => (w.id === id ? { ...w, z: maxZ + 1 } : w)));
    setZMax(z => z + 1);
  }
  function openAgentWindow(id) {
    // Minimized restore logic
    const minIdx = minimized.findIndex(m => m.id === id);
    if (minIdx !== -1) {
      const win = minimized[minIdx];
      setMinimized(mins => mins.filter((m, i) => i !== minIdx));
      setOpenWindows(ws => [...ws, { ...win, z: zMax + 1 }]);
      setZMax(z => z + 1);
      return;
    }
    // Open logic
    const idx = openWindows.findIndex(w => w.id === id);
    if (idx !== -1) {
      bringToFront(id);
    } else {
      setOpenWindows(ws => [
        ...ws,
        { id, width: 460, height: 350, x: 120 + ws.length * 50, y: 80 + ws.length * 50, z: zMax + 1 },
      ]);
      setZMax(z => z + 1);
    }
  }
  function onDragStop(id, d) {
    setOpenWindows(ws =>
      ws.map(w => (w.id === id ? { ...w, x: d.x, y: d.y } : w))
    );
  }
  function onResizeStop(id, width, height, pos) {
    setOpenWindows(ws =>
      ws.map(w =>
        w.id === id ? { ...w, width, height, x: pos.x, y: pos.y } : w
      )
    );
  }
  function minimizeWindow(id) {
    setOpenWindows(ws => {
      const w = ws.find(w => w.id === id);
      if (!w) return ws;
      setMinimized(mins => (mins.some(m => m.id === id) ? mins : [...mins, w]));
      return ws.filter(w => w.id !== id);
    });
  }
  function restoreMinimized(id) {
    const min = minimized.find(m => m.id === id);
    if (!min) return;
    setMinimized(mins => mins.filter(m => m.id !== id));
    setOpenWindows(ws => [...ws, { ...min, z: zMax + 1 }]);
    setZMax(z => z + 1);
  }

  // ─── Dashboard Handlers ──────────────────────
  function onDashboardDragEnd(result) {
    if (!result.destination) return;
    const { source, destination } = result;
    setDashboard(cols => {
      const src = cols.findIndex(c => c.id === source.droppableId);
      const dst = cols.findIndex(c => c.id === destination.droppableId);
      const card = cols[src].cards[source.index];
      const newCols = cols.map((c, i) => {
        if (i === src) {
          const cards = [...c.cards];
          cards.splice(source.index, 1);
          return { ...c, cards };
        }
        if (i === dst) {
          const cards = [...c.cards];
          cards.splice(destination.index, 0, card);
          return { ...c, cards };
        }
        return c;
      });
      return newCols;
    });
  }
  function addDashboardCard(colId) {
    const text = prompt("New card text?");
    if (!text) return;
    setDashboard(cols =>
      cols.map(c =>
        c.id === colId
          ? {
              ...c,
              cards: [...c.cards, { id: Date.now().toString(), text, source: "user" }],
            }
          : c
      )
    );
  }
  function addAgentSuggestion() {
    const suggestion = prompt("Agent suggestion?");
    if (!suggestion) return;
    // pick random agent
    const agent = agents[Math.floor(Math.random() * agents.length)];
    setDashboard(cols =>
      cols.map(c =>
        c.id === "suggestions"
          ? {
              ...c,
              cards: [
                ...c.cards,
                { id: Date.now().toString(), text: suggestion, source: "agent", agentId: agent.id },
              ],
            }
          : c
      )
    );
  }

  // ─── Render ─────────────────────────────────
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={{ colorScheme: dark ? "dark" : "light" }}>
      <div style={{ minHeight: "100vh", background: "linear-gradient(120deg, #191f2b 60%, #232a41 100%)", overflow: "hidden", position: "relative" }}>
        {/* Celestial Star Background */}
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

        {/* SIDEBAR */}
        <Sidebar
          agents={agents}
          openWindows={openWindows}
          bringToFront={openAgentWindow}
          isMobile={isMobile}
          tooltipId="main-tooltip"
          showProfile={showProfile}
          setShowProfile={setShowProfile}
        />

        {/* PROFILE POPOVER */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.25 }}
              style={{
                position: "fixed",
                left: isMobile ? 64 : 100,
                bottom: 32,
                zIndex: 200,
                background: "rgba(38,44,77,0.97)",
                color: "#fff",
                borderRadius: 16,
                padding: "28px 34px",
                minWidth: 230,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>User Profile</div>
              <Button onClick={() => setShowProfile(false)}>Close</Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AGENT WINDOWS */}
        <AnimatePresence>
          {openWindows.map(win => {
            // Coder Chat
            if (win.id === "coder") {
              return (
                <CoderChat
                  key={win.id}
                  win={win}
                  bringToFront={bringToFront}
                  onDragStop={onDragStop}
                  onResizeStop={onResizeStop}
                  borderColor={agents.find(a => a.id === "coder").color}
                  API={process.env.REACT_APP_API_URL || "http://localhost:8000"}
                  minimizeWindow={minimizeWindow}
                  closeWindow={id => setOpenWindows(ws => ws.filter(w => w.id !== id))}
                />
              );
            }
            // Map window
            if (win.id === "map") {
              return (
                <AgentWindow
                  key={win.id}
                  id={win.id}
                  win={win}
                  bringToFront={bringToFront}
                  onDragStop={onDragStop}
                  onResizeStop={onResizeStop}
                  borderColor="#FFD700"
                  minimizeWindow={minimizeWindow}
                  closeWindow={id => setOpenWindows(ws => ws.filter(w => w.id !== id))}
                >
                  <MapWindow
                    dashboard={dashboard}
                    onDashboardDragEnd={onDashboardDragEnd}
                    addDashboardCard={addDashboardCard}
                    addAgentSuggestion={addAgentSuggestion}
                    isMobile={isMobile}
                    tooltipId="main-tooltip"
                    agents={agents}
                  />
                </AgentWindow>
              );
            }
            // Other agent windows (not coder, not map)
            const agent = agents.find(a => a.id === win.id);
            if (agent) {
              return (
                <AgentChatWindow
                  key={win.id}
                  agent={agent}
                  win={win}
                  bringToFront={bringToFront}
                  onDragStop={onDragStop}
                  onResizeStop={onResizeStop}
                  borderColor={agent.color}
                  minimizeWindow={minimizeWindow}
                  closeWindow={id => setOpenWindows(ws => ws.filter(w => w.id !== id))}
                >
                  {agent.id === "firstmatey" && (
                    <Suspense fallback={null}>
                      <Lottie animationData={mateyLottie} style={{ width: 120, marginBottom: 10 }} />
                    </Suspense>
                  )}
                </AgentChatWindow>
              );
            }
            return null;
          })}
        </AnimatePresence>

        {/* FLOATING MAP BUTTON */}
        <button
          onClick={() => openAgentWindow("map")}
          style={{
            position: "fixed",
            right: 32,
            bottom: 32,
            padding: "14px 24px",
            background: "linear-gradient(90deg,#FFD700 70%,#faf9f6 100%)",
            border: "none",
            borderRadius: 50,
            cursor: "pointer",
            zIndex: 400,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontWeight: 900,
            fontSize: 20,
          }}
          data-tooltip-id="main-tooltip"
          data-tooltip-content="Open Map"
        >
          <FaMapMarkedAlt style={{ marginRight: 8 }} />
          Map
        </button>

        {/* Minimized tray */}
        <div style={{
          position: "fixed",
          left: isMobile ? 60 : 110,
          bottom: 7,
          zIndex: 200,
          display: "flex",
          gap: 11,
          alignItems: "center"
        }}>
          {minimized.map((m, idx) => {
            const agent = agents.find(a => a.id === m.id);
            const colorA = agent ? agent.color : "#FFD700";
            const colorB = agent ? (agent.secondaryColor || "#47e0fa") : "#FFCE63";
            return (
              <button
                key={m.id}
                onClick={() => restoreMinimized(m.id)}
                style={{
                  background: "none",
                  border: "none",
                  borderRadius: 12,
                  width: 38,
                  height: 38,
                  boxShadow: `0 2px 12px ${colorA}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 23,
                  cursor: "pointer",
                  marginRight: 2,
                  padding: 0,
                }}
                data-tooltip-id="main-tooltip"
                data-tooltip-content={"Restore " + (agent?.name || m.id)}
              >
                <NeonGlowRing
                  icon={agent?.icon || <FaUserCircle size={20} color="#fff" />}
                  size={38}
                  colorA={colorA}
                  colorB={colorB}
                  percent={100}
                />
              </button>
            );
          })}
        </div>

        {/* TOASTS & TOOLTIP */}
        <Toaster position="top-center" />
        <Tooltip id="main-tooltip" />
      </div>
    </MantineProvider>
  );
}