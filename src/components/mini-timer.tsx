import { Link, useRouterState } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { isRunning, elapsedSeconds, remainingSeconds } from "@/lib/timer-engine";
import { formatHMS } from "@/lib/time";
import { Brain, Coffee, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function MiniTimerWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const snapRow = useLiveQuery(() => getDb().timerSnapshots.get("current"), [], null);
  const snap = snapRow?.snapshot;
  
  const [, setTick] = useState(0);
  
  useEffect(() => {
    if (!snap || !isRunning(snap)) return;
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [snap]);

  // Hide if on timer page or if timer is completely empty/stopped
  if (pathname === "/timer" || !snap) return null;
  
  const running = isRunning(snap);
  // Hide if not running and no accumulated time
  if (!running && snap.accumulatedSec === 0) return null;

  const isPomodoro = snap.mode === "pomodoro";
  const phase = snap.pomoPhase ?? "focus";
  const displaySec = isPomodoro ? remainingSeconds(snap) : elapsedSeconds(snap);
  
  const activeColor = isPomodoro && phase === "break" ? "#10b981" : "var(--focus)";
  const isDeepFlow = running && elapsedSeconds(snap) > 20 * 60 && phase === "focus";

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-500">
      <Link 
        to="/timer"
        className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-full border shadow-lg backdrop-blur-xl transition-all hover:scale-105 active:scale-95",
          running ? "bg-card/80 border-border" : "bg-secondary/90 border-transparent opacity-80"
        )}
      >
        <div 
          className={cn("flex items-center justify-center size-6 rounded-full text-white", running && "animate-pulse")}
          style={{ background: isDeepFlow ? "#00f0ff" : activeColor }}
        >
          {!running ? <Play className="size-3 pl-0.5" /> : isPomodoro && phase === "break" ? <Coffee className="size-3" /> : <Brain className="size-3" />}
        </div>
        <div className="flex flex-col min-w-[60px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
            {isPomodoro ? (phase === "focus" ? "Focus" : "Break") : "Stopwatch"}
          </span>
          <span className="tabular font-mono text-sm font-semibold leading-none mt-0.5">
            {formatHMS(Math.round(displaySec))}
          </span>
        </div>
      </Link>
    </div>
  );
}
