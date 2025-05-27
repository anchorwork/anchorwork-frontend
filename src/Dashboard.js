import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import NeonGlowRing from "./NeonGlowRing";
import GlowingProgressRing from "./GlowingProgressRing";

export default function Dashboard({
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
    <DragDropContext onDragEnd={onDashboardDragEnd}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
        gap: isMobile ? 14 : 28,
        width: "100%",
        alignItems: "stretch",
        padding: isMobile ? 8 : 24
      }}>
        {dashboard.map(col => (
          <Droppable droppableId={col.id} key={col.id}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  background: "linear-gradient(120deg,rgba(36,44,71,0.94),rgba(40,54,98,0.82))",
                  borderRadius: 36,
                  padding: isMobile ? 14 : 28,
                  minWidth: 0,
                  border: "2.2px solid #FFD70033",
                  boxShadow: "0 6px 28px 0 #FFD70024,0 3px 19px #181f2b33",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "visible",
                  minHeight: 260
                }}
              >
                {/* Header */}
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: isMobile ? 23 : 29,
                  color: "#fff",
                  marginBottom: isMobile ? 15 : 22,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  letterSpacing: 0.2
                }}>
                  <span>{col.title}</span>
                  <span style={{ flex: 1 }} />
                  {(col.id !== "suggestions") ? (
                    <button
                      onClick={() => addDashboardCard(col.id)}
                      data-tooltip-id={tooltipId}
                      data-tooltip-content="Add Card"
                      aria-label="Add new card"
                      style={{
                        background: "linear-gradient(90deg,#FFD700 70%,#f9f6e1 100%)",
                        border: "none",
                        borderRadius: 50,
                        padding: isMobile ? "6px 18px" : "10px 26px",
                        fontWeight: 900,
                        cursor: "pointer",
                        boxShadow: "0 2px 9px #FFD70022",
                        outline: "none",
                        transition: "background 0.18s"
                      }}
                      tabIndex={0}
                    >+ Add</button>
                  ) : (
                    <button
                      onClick={addAgentSuggestion}
                      data-tooltip-id={tooltipId}
                      data-tooltip-content="Add Agent Suggestion"
                      aria-label="Add agent suggestion"
                      style={{
                        background: "linear-gradient(90deg,#22c9f0 70%,#00eaff 100%)",
                        border: "none",
                        borderRadius: 50,
                        padding: isMobile ? "6px 18px" : "10px 26px",
                        fontWeight: 900,
                        cursor: "pointer",
                        boxShadow: "0 2px 9px #22c9f022",
                        outline: "none",
                        transition: "background 0.18s"
                      }}
                      tabIndex={0}
                    >+ Add</button>
                  )}
                </div>
                {/* Cards */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: isMobile ? 11 : 16 }}>
                  {col.cards.map((card, i) => {
                    const agent = card.agentId ? agents.find(a => a.id === card.agentId) : null;
                    return (
                      <Draggable draggableId={String(card.id)} index={i} key={card.id}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            style={{
                              background: card.source === "agent"
                                ? `linear-gradient(90deg,${agent?.color || "#ae47fa"}55,rgba(38,54,97,0.95))`
                                : "linear-gradient(120deg,rgba(255,255,255,0.13),rgba(255,255,210,0.14))",
                              borderRadius: 60,
                              padding: isMobile ? "16px 18px" : "28px 36px",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              gap: isMobile ? 13 : 22,
                              boxShadow: snap.isDragging ? "0 4px 14px #FFD70044" : "none",
                              cursor: snap.isDragging ? "grabbing" : "grab",
                              transition: "background 0.18s, box-shadow 0.18s",
                              ...prov.draggableProps.style
                            }}
                          >
                            {card.source === "agent" ? (
                              <NeonGlowRing
                                icon={agent ? React.cloneElement(
                                  agent.icon, { size: isMobile ? 24 : 30, color: "#fff" }
                                ) : "?"}
                                size={isMobile ? 48 : 62}
                                colorA={agent?.color || "#ae47fa"}
                                colorB={agent?.secondaryColor || "#fa4ce9"}
                                percent={100}
                              />
                            ) : (
                              <GlowingProgressRing value={card.percent} label={card.label} size={isMobile ? 40 : 54}/>
                            )}
                            <span style={{ flex: 1, fontWeight: 800, fontSize: isMobile ? 15 : 18 }}>
                              {card.text}
                            </span>
                            <span style={{
                              fontSize: isMobile ? 11 : 14,
                              fontWeight: 900,
                              background: card.source==="agent" ? (agent?.color || "#FFD700") : "#FFD700",
                              borderRadius: 22,
                              padding: isMobile?"4px 10px":"7px 17px",
                              boxShadow: "0 1px 5px #FFD70022"
                            }}>
                              {card.source === "agent" ? (agent?.name || "Agent") : "You"}
                            </span>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}