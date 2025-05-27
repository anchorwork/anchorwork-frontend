import React, { useState, useEffect, useRef } from "react";
import { Button, ActionIcon, Tooltip } from "@mantine/core";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import AgentWindow from "./AgentWindow";
import ThinkingDots from "./ThinkingDots";
import { FaMinus, FaTimes } from "react-icons/fa";

export default function CoderChat({
  win,
  bringToFront,
  onDragStop,
  onResizeStop,
  borderColor,
  API,
  minimizeWindow,
  closeWindow
}) {
  const [coderLog, setCoderLog] = useState([
    { id: 0, sender: "system", text: "Welcome to Anchorwork — Coder online.", time: new Date().toLocaleTimeString() }
  ]);
  const [coderPrompt, setCoderPrompt] = useState("");
  const [coderThinking, setCoderThinking] = useState(false);
  const [coderStatus, setCoderStatus] = useState({ phase: "idle", step: 0 });
  const chatScrollRef = useRef(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [coderLog, coderThinking]);

  useEffect(() => {
    return () => {
      // nothing to cleanup until SSE implemented via hook
    };
  }, []);

  const makeEntry = (sender, text) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random(),
    sender, text, time: new Date().toLocaleTimeString()
  });

  async function runPreflight() {
    try {
      const ping = await fetch(`${API}/coder/ping`).then(r=>r.json());
      if (!ping.ok) throw new Error("Ping failed");

      const smoke = await fetch(`${API}/coder/gpt_smoke_test`, {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ prompt: "Write a random one-line ship log confirming all Anchorwork systems are nominal." })
      }).then(r=>r.json());
      if (!smoke.ok) throw new Error(smoke.error);

      const status = await fetch(`${API}/coder/boot_status`).then(r=>r.json());
      setCoderLog(lg => [...lg, makeEntry("system", `✅ Preflight OK • phase=${status.phase}`)]);
      toast.success(`✅ Ping OK • GPT OK • phase=${status.phase}`);
    } catch (err) {
      toast.error("Preflight failed: " + err.message);
    }
  }

  const sendPrompt = async () => {
    if (!coderPrompt.trim()) return;
    const text = coderPrompt; setCoderPrompt("");
    setCoderLog(lg => [...lg, makeEntry("user", text)]);
    setCoderThinking(true);

    const es = new EventSource(`${API}/coder/stream_thoughts`);
    es.onmessage = ev => {
      try {
        const data = JSON.parse(ev.data);
        setCoderStatus(data);
        if (data.phase === "idle") es.close();
      } catch{}
    };
    es.onerror = () => es.close();

    try {
      const res = await fetch(`${API}/coder`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt: text })
      }).then(r=>r.json());
      const reply = res.result || res.reply || res.message || "⚠️ No response";
      setCoderLog(lg => [...lg, makeEntry("coder", reply)]);
    } catch {
      setCoderLog(lg => [...lg, makeEntry("coder", "⚠️ Error contacting backend")]);
    } finally {
      es.close();
      setCoderThinking(false);
    }
  };

  return (
    <AgentWindow
      id="coder-chat"
      win={win}
      bringToFront={bringToFront}
      onDragStop={onDragStop}
      onResizeStop={onResizeStop}
      borderColor={borderColor}
    >
      {/* Header */}
      <div style={{ position: "relative" }}>
        <div className="drag-header" style={{
          cursor: "grab", display: "flex", alignItems: "center", gap: 12,
          background: "rgba(0,0,0,0.13)", borderBottom: `1.5px solid ${borderColor}`,
          padding: "13px 22px", fontWeight: 900, fontSize: 28, color: "#FFD700"
        }}>
          Coder
          <span style={{ flex: 1 }} />
          <Button size="xs" variant="outline" radius="sm" onClick={runPreflight}>Test</Button>
          <Tooltip label="Minimize" withArrow position="bottom" color={borderColor}>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              style={{ marginLeft: 8 }}
              onClick={() => minimizeWindow && minimizeWindow(win.id)}
              aria-label="Minimize window"
              title="Minimize"
            >
              <FaMinus />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Close" withArrow position="bottom" color={borderColor}>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              style={{ marginLeft: 8 }}
              onClick={() => closeWindow && closeWindow(win.id)}
              aria-label="Close window"
              title="Close"
            >
              <FaTimes />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>
      {/* Status */}
      <div style={{ padding: "6px 13px", fontSize: 13, color: borderColor }}>
        Phase: {coderStatus.phase} | Step: {coderStatus.step}
      </div>
      {/* Chat area */}
      <div style={{ display:"flex", flexDirection:"column", height:"calc(100% - 80px)" }}>
        <div ref={chatScrollRef} style={{ flex:1, overflowY:"auto", padding:14 }}>
          {coderLog.map((e,i) => (
            <motion.div key={e.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}>
              <div style={{
                margin: "4px 0",
                alignSelf: e.sender==="user" ? "flex-end" : "flex-start",
                background: e.sender==="user" ? "#FFD70022" : "#22c9f044",
                border: `2px solid ${e.sender==="user"? "#FFD700": "#22c9f0"}`,
                borderRadius: 32,
                padding: "12px 16px",
                maxWidth: 400,
                color: "#fff",
              }}>
                {e.text}
                <div style={{ fontSize:11, opacity:0.6, marginTop:4, textAlign:"right" }}>{e.time}</div>
              </div>
            </motion.div>
          ))}
          {(coderThinking) && <ThinkingDots color={borderColor} />}
        </div>
        {/* Input */}
        <div style={{ display:"flex", padding:7, borderTop:`1px solid ${borderColor}` }}>
          <textarea
            value={coderPrompt}
            onChange={e=>setCoderPrompt(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendPrompt(); } }}
            style={{ flex:1, padding:10, borderRadius:8, border:"none", resize:"none" }}
            placeholder="Type to Coder..."
          />
          <button
            onClick={sendPrompt}
            style={{
              marginLeft:4, padding:"8px 12px", background:borderColor,
              border:"none", borderRadius:8, color:"#fff", cursor:"pointer"
            }}
          >Send</button>
        </div>
      </div>
    </AgentWindow>
  );
}