// src/AgentChatWindow.js
import React from "react";
import NeonGlowRing from "./NeonGlowRing";
import { Button } from "@mantine/core";

export default function AgentChatWindow({
  agent,
  win,
  bringToFront,
  onDragStop,
  onResizeStop,
  borderColor,
  minimizeWindow,
  closeWindow,
  children, // for Lottie etc.
}) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        className="drag-header"
        style={{
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "rgba(0,0,0,0.13)",
          borderBottom: `2.5px solid ${borderColor}`,
          borderRadius: "18px 18px 0 0",
          padding: "13px 22px",
          fontWeight: 900,
          fontSize: 23,
          color: borderColor,
        }}
      >
        <NeonGlowRing
          icon={React.cloneElement(agent.icon, { size: 26, color: "#fff" })}
          size={44}
          colorA={agent.color}
          colorB={agent.secondaryColor}
          percent={100}
        />
        <span style={{ marginLeft: 9 }}>{agent.name}</span>
        <span style={{ flex: 1 }} />
        <Button
          size="xs"
          color="gray"
          variant="subtle"
          style={{ marginRight: 8 }}
          onClick={() => minimizeWindow && minimizeWindow(win.id)}
        >Minimize</Button>
        <Button
          size="xs"
          color="gray"
          variant="subtle"
          onClick={() => closeWindow && closeWindow(win.id)}
        >Close</Button>
      </div>
      {/* Lottie or custom children can go here */}
      {children}
      <div style={{
        padding: 18,
        textAlign: "center",
        color: "#eee",
        fontSize: 18,
        fontWeight: 500,
      }}>
        Chat with {agent.name} coming soon...
      </div>
    </div>
  );
}