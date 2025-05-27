// src/components/NeonGlowRing.js
import React from "react";

export default function NeonGlowRing({ icon, size = 60, colorA = "#22c9f0", colorB = "#2f8dfa", percent = 100 }) {
  return (
    <div style={{
      position: "relative",
      width: size,
      height: size,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      background: `conic-gradient(${colorA} ${percent}%, transparent 0%), ${colorB}`,
      padding: 4,
    }}>
      <div style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: "#232a41",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {icon}
      </div>
    </div>
  );
}