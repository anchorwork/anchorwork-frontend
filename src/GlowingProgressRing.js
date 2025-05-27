import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

export default function GlowingProgressRing({ value = 68, label = "", size = 110 }) {
  return (
    <div style={{
      width: size, height: size,
      display: "flex", alignItems: "center", justifyContent: "center",
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