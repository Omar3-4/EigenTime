import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, X, Brain, Coffee } from "lucide-react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { loadTimer } from "@/lib/repo";
import type { TimerSnapshot } from "@/lib/db";

export const Route = createFileRoute("/widget")({
  component: Widget,
});

function padZ(n: number) {
  return String(n).padStart(2, "0");
}

function Widget() {
  const [snap, setSnap] = useState<TimerSnapshot | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Poll DB every 500 ms — lightweight, no live-query overhead
    tickRef.current = setInterval(async () => {
      setSnap(await loadTimer());
    }, 500);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const sendAction = async (action: string) => {
    if (isTauri()) await emit("tray:action", action);
  };

  const handleClose = async () => {
    await invoke("close_widget");
  };

  const handleDragStart = async () => {
    if (isTauri()) {
      try {
        await getCurrentWindow().startDragging();
      } catch {
        // not fatal
      }
    }
  };

  // ── Derive display values ──────────────────────────────────────────────────
  const isRunning = snap?.runningSince != null;
  const isPomodoro = snap?.mode === "pomodoro";
  const phase = snap?.pomoPhase ?? "focus";
  const isBreak = isPomodoro && phase === "break";

  let displaySec = 0;
  if (snap) {
    const live = isRunning ? (Date.now() - snap.runningSince!) / 1000 : 0;
    const elapsed = snap.accumulatedSec + live;

    if (isPomodoro && snap.targetSec) {
      // Count-down for pomodoro
      displaySec = Math.max(0, snap.targetSec - elapsed);
    } else {
      displaySec = elapsed;
    }
  }

  const totalSec = Math.round(displaySec);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const timeStr = h > 0 ? `${h}:${padZ(m)}:${padZ(s)}` : `${padZ(m)}:${padZ(s)}`;

  const accentColor = isBreak ? "#10b981" : "#6366f1";
  const pulseClass = isRunning ? "animate-pulse" : "";

  return (
    // The root div fills the transparent 220×64 OS window exactly
    <div
      className="h-screen w-screen flex items-center overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/*
        Draggable pill — data-tauri-drag-region on the background,
        but NOT on interactive elements so clicks still register.
      */}
      <div
        className="flex items-center justify-between w-full h-12 mx-2 px-3 rounded-full border border-white/15 shadow-2xl"
        style={{
          background: "rgba(10, 10, 14, 0.92)",
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        }}
        onMouseDown={handleDragStart}
      >
        {/* Status dot + time */}
        <div className="flex items-center gap-2 pointer-events-none select-none">
          <div
            className={`flex items-center justify-center size-6 rounded-full shrink-0 ${pulseClass}`}
            style={{ background: isRunning ? accentColor : "rgba(255,255,255,0.12)" }}
          >
            {isRunning
              ? isBreak
                ? <Coffee size={12} color="white" />
                : <Brain size={12} color="white" />
              : <Play size={12} color="rgba(255,255,255,0.6)" className="ms-0.5" />
            }
          </div>
          <span
            className="font-mono text-base font-semibold tracking-tight text-white"
          >
            {timeStr}
          </span>
        </div>

        {/* Controls — pointer-events must remain active */}
        <div
          className="flex items-center gap-1"
          onMouseDown={(e) => e.stopPropagation()} // prevent drag when clicking buttons
        >
          <button
            type="button"
            onClick={() => sendAction("toggle-play")}
            className="flex items-center justify-center size-7 rounded-full transition-colors"
            style={{ background: "rgba(255,255,255,0.08)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            title={isRunning ? "Pause" : "Play"}
          >
            {isRunning
              ? <Pause size={12} color="white" fill="white" />
              : <Play size={12} color="white" fill="white" className="ms-0.5" />
            }
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center size-7 rounded-full transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            title="Close widget (restore main window)"
          >
            <X size={13} color="rgba(255,255,255,0.6)" />
          </button>
        </div>
      </div>
    </div>
  );
}
