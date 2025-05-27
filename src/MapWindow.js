// src/MapWindow.js
import React from "react";
import { FaMapMarkedAlt } from "react-icons/fa";
import { Button } from "@mantine/core";
import Dashboard from "./Dashboard";

export default function MapWindow({
  win,
  bringToFront,
  onDragStop,
  onResizeStop,
  minimizeWindow,
  closeWindow,
  dashboard,
  onDashboardDragEnd,
  addDashboardCard,
  addAgentSuggestion,
  isMobile,
  tooltipId,
  agents
}) {
  dashboard = dashboard || [];
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        className="drag-header"
        style={{
          color: "#FFD700",
          fontWeight: 900,
          fontSize: 23,
          background: "rgba(0,0,0,0.13)",
          borderBottom: "2.5px solid #FFD700",
          borderRadius: "18px 18px 0 0",
          padding: "13px 22px",
          display: "flex",
          alignItems: "center",
        }}>
        <FaMapMarkedAlt style={{ marginRight: 10 }} />
        Map
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
      <Dashboard
        dashboard={dashboard}
        onDashboardDragEnd={onDashboardDragEnd}
        addDashboardCard={addDashboardCard}
        addAgentSuggestion={addAgentSuggestion}
        isMobile={isMobile}
        tooltipId={tooltipId}
        agents={agents}
      />
    </div>
  );
}