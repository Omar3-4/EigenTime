import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Play, Pause, X } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

// We can read from indexedDB directly to show the active session
// Or since the main window handles timer logic, we just send commands to it
import { loadTimer, listSubjects, type TimerSnapshot } from "@/lib/repo";

export const Route = createFileRoute("/widget")({
  component: Widget,
});

function Widget() {
  const [snap, setSnap] = useState<TimerSnapshot | null>(null);
  const subjects = useLiveQuery(() => listSubjects(), [], []);

  // Poll IndexedDB every 500ms since the main window updates it every second
  // This is a simple IPC-free way to sync state one-way for display
  useEffect(() => {
    const i = setInterval(async () => {
      const state = await loadTimer();
      setSnap(state);
    }, 500);
    return () => clearInterval(i);
  }, []);

  const activeSubject = subjects.find((s) => s.id === snap?.subjectId);

  // Helper to emit actions to the main window via Tauri events
  const sendAction = async (action: string) => {
    if (isTauri()) {
      await emit("tray:action", action);
    }
  };

  const isRunning = snap?.runningSince != null;
  const elapsed = snap
    ? snap.accumulatedSec + (isRunning ? (Date.now() - snap.runningSince!) / 1000 : 0)
    : 0;
  
  const min = Math.floor(elapsed / 60);
  const sec = Math.floor(elapsed % 60);

  return (
    <div
      data-tauri-drag-region
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40 p-3 text-white shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between" data-tauri-drag-region>
        <div className="flex items-center gap-2" data-tauri-drag-region>
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: activeSubject ? `var(--${activeSubject.color})` : "#888" }}
          />
          <span className="text-xs font-semibold tracking-wider text-white/80 pointer-events-none">
            {activeSubject?.name ?? "No Subject"}
          </span>
        </div>
        <button
          onClick={() => invoke("close_widget")}
          className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-2 flex items-end justify-between" data-tauri-drag-region>
        <div className="font-mono text-3xl font-medium tracking-tight pointer-events-none">
          {String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => sendAction(isRunning ? "pause" : "resume")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
