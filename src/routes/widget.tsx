import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Pause, X } from "lucide-react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { loadTimer } from "@/lib/repo";
import type { TimerSnapshot } from "@/lib/db";

export const Route = createFileRoute("/widget")({
  component: Widget,
});

function Widget() {
  const [snap, setSnap] = useState<TimerSnapshot | null>(null);

  useEffect(() => {
    const i = setInterval(async () => {
      setSnap(await loadTimer());
    }, 500);
    return () => clearInterval(i);
  }, []);

  const sendAction = async (action: string) => {
    if (isTauri()) await emit("tray:action", action);
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
      className="flex h-full w-full items-center justify-between rounded-full bg-zinc-900/95 px-4 py-2 text-white shadow-xl border border-white/10"
    >
      <div
        className="font-mono text-xl font-medium tracking-tight pointer-events-none"
        data-tauri-drag-region
      >
        {String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => sendAction("toggle-play")}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          {isRunning ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" className="ms-0.5" />
          )}
        </button>
        <button
          onClick={() => invoke("close_widget")}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-500/80 transition-colors text-white/70 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
