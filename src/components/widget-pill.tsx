/**
 * WidgetPill — a self-contained floating overlay component.
 * Has NO dependency on AppShell, Router, DataGate, or any provider.
 * Reads the timer DB directly via Dexie and polls every 500 ms.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getDb } from "@/lib/db";
import type { TimerSnapshot } from "@/lib/db";

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

async function readSnap(): Promise<TimerSnapshot | null> {
  try {
    const row = await getDb().timerSnapshots.get("current");
    return row?.snapshot ?? null;
  } catch {
    return null;
  }
}

export function WidgetPill() {
  const [snap, setSnap] = useState<TimerSnapshot | null>(null);
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Poll DB + update clock every 500 ms
    intervalRef.current = setInterval(async () => {
      setSnap(await readSnap());
      setNow(Date.now());
    }, 500);
    // Immediate first read
    readSnap().then(setSnap);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const sendAction = useCallback(async (action: string) => {
    if (isTauri()) await emit("tray:action", action);
  }, []);

  const handleClose = useCallback(async () => {
    await invoke("close_widget");
  }, []);

  const startDrag = useCallback(async (e: React.MouseEvent) => {
    // Don't drag when clicking on buttons
    if ((e.target as HTMLElement).closest("button")) return;
    if (isTauri()) {
      try {
        await getCurrentWindow().startDragging();
      } catch {
        // not fatal on dev
      }
    }
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isRunning = snap?.runningSince != null;
  const isPomodoro = snap?.mode === "pomodoro";
  const phase = snap?.pomoPhase ?? "focus";
  const isBreak = isPomodoro && phase === "break";

  let displaySec = 0;
  if (snap) {
    const live = isRunning ? (now - snap.runningSince!) / 1000 : 0;
    const elapsed = snap.accumulatedSec + live;
    if (isPomodoro && snap.targetSec) {
      displaySec = Math.max(0, snap.targetSec - elapsed);
    } else {
      displaySec = elapsed;
    }
  }
  const timeStr = formatTime(Math.round(displaySec));
  const accentColor = isBreak ? "#10b981" : "#818cf8";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
      }}
    >
      {/* Glass pill */}
      <div
        onMouseDown={startDrag}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "calc(100% - 12px)",
          height: "48px",
          borderRadius: "9999px",
          background: "rgba(8, 8, 12, 0.90)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04) inset",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          padding: "0 10px 0 12px",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        {/* Left: status dot + time */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", pointerEvents: "none" }}>
          {/* Pulse dot */}
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: isRunning ? accentColor : "rgba(255,255,255,0.25)",
              boxShadow: isRunning ? `0 0 6px ${accentColor}` : "none",
              animation: isRunning ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: "15px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {timeStr}
          </span>
          {snap && (
            <span
              style={{
                color: isBreak ? "#10b981" : "rgba(129,140,248,0.8)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {isBreak ? "BREAK" : isPomodoro ? "FOCUS" : ""}
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <PillBtn
            onClick={() => sendAction("toggle-play")}
            title={isRunning ? "Pause" : "Play"}
            hoverColor="rgba(129,140,248,0.25)"
          >
            {isRunning ? (
              /* Pause icon */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              /* Play icon */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" style={{ marginLeft: "1px" }}>
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
          </PillBtn>
          <PillBtn
            onClick={handleClose}
            title="Close widget"
            hoverColor="rgba(239,68,68,0.35)"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </PillBtn>
        </div>
      </div>

      {/* Inline keyframes for pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function PillBtn({
  onClick,
  title,
  hoverColor,
  children,
}: {
  onClick: () => void;
  title: string;
  hoverColor: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        border: "none",
        background: hovered ? hoverColor : "rgba(255,255,255,0.07)",
        cursor: "pointer",
        transition: "background 0.15s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
