import React from "react";

export default function ThinkingDots({ color = "#FFD700" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, minHeight: 24 }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <span key={i} style={{
          display: "inline-block",
          width: 8, height: 8,
          borderRadius: "50%",
          background: color,
          opacity: 0.7,
          animation: `thinkingDot 1.2s infinite ${delay}s`
        }} />
      ))}
      <style>{`
        @keyframes thinkingDot {
          0%, 80%, 100% { transform: scale(1); opacity: 0.7; }
          40% { transform: scale(1.5); opacity: 1; }
        }
      `}</style>
    </span>
  );
}