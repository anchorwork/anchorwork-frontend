import React from "react";
import { FaUserCircle } from "react-icons/fa";
import NeonGlowRing from "./NeonGlowRing";

export default function Sidebar({
  agents,
  openWindows,
  bringToFront,
  isMobile,
  tooltipId,
  showProfile,
  setShowProfile
}) {
  // Helper: Is window for this agent open?
  function isAgentOpen(agent) {
    if (agent.id === "coder") {
      return openWindows.some(w => w.id === "coder");
    }
    return openWindows.some(w => w.id === agent.id);
  }

  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, bottom: 0,
      width: isMobile ? 64 : 88, zIndex: 50,
      background: "linear-gradient(180deg, #232a41 0%, #191f2b 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 20, boxShadow: "2px 0 22px #001a3a22",
      backdropFilter: "blur(7px) saturate(2)",
      borderRight: "1.5px solid #fff1",
    }}>
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: isMobile ? 6 : 8,
        width: "100%",
      }}>
        {agents.map(agent => {
          const isActive = isAgentOpen(agent);
          return (
            <div
              key={agent.id}
              className="agent-list-item"
              tabIndex={0}
              aria-label={`Open ${agent.name} window`}
              style={{
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: isMobile ? "7px 0" : "12px 0",
                borderRadius: 14,
                transition: "background 0.18s",
                position: "relative",
                background: isActive ? `${agent.color}22` : "transparent",
                outline: isActive ? `2px solid ${agent.color}` : "none"
              }}
              onClick={() => bringToFront(agent.id)}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && bringToFront(agent.id)}
              data-tooltip-id={tooltipId}
              data-tooltip-content={agent.name}
            >
              <NeonGlowRing
                icon={React.cloneElement(agent.icon, { size: isMobile ? 28 : 36, color: "#fff" })}
                size={isMobile ? 56 : 70}
                colorA={agent.color}
                colorB={agent.secondaryColor}
                percent={100}
              />
              <div
                style={{
                  marginTop: 3,
                  fontSize: 10,
                  color: agent.color,
                  fontWeight: 700,
                  textAlign: "center",
                  opacity: 0,
                  height: 13,
                  transition: "opacity 0.15s",
                  userSelect: "none"
                }}
                className="agent-name-hover"
              >
                {agent.name.split(" ")[0]}
              </div>
              <style>{`
                .agent-list-item:hover .agent-name-hover, .agent-list-item:focus .agent-name-hover {
                  opacity: 1;
                }
              `}</style>
            </div>
          );
        })}
      </div>
      {/* User profile/settings */}
      <div style={{ marginTop: "auto", marginBottom: 24 }}>
        <button
          onClick={() => setShowProfile(p => !p)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            borderRadius: "50%",
            padding: 2,
            boxShadow: "0 0 8px #FFD70033"
          }}
          data-tooltip-id={tooltipId}
          data-tooltip-content="User Profile & Settings"
          aria-label="Open user profile"
        >
          <NeonGlowRing
            icon={<FaUserCircle size={isMobile ? 22 : 28} color="#fff" />}
            size={isMobile ? 44 : 54}
            colorA="#FFD700"
            colorB="#FFCE63"
            percent={100}
          />
        </button>
      </div>
    </aside>
  );
}