import { Link, useRouterState } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { isRunning, elapsedSeconds, remainingSeconds } from "@/lib/timer-engine";
import { formatHMS } from "@/lib/time";
import { Brain, Coffee, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTimerTick } from "./timer-tick-provider";

function getTimerLabel(isPomodoro: boolean, phase: "focus" | "break" | "completed") {
  if (!isPomodoro) return "Stopwatch";
  if (phase === "focus") return "Focus";
  if (phase === "break") return "Break";
  return "Done";
}

function TimerIcon({ running, isBreak }: { running: boolean; isBreak: boolean }) {
  if (!running) return <Play className="size-3 ps-0.5" />;
  if (isBreak) return <Coffee className="size-3" />;
  return <Brain className="size-3" />;
}

export function MiniTimerWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const snapRow = useLiveQuery(() => getDb().timerSnapshots.get("current"), [], null);
  const snap = snapRow?.snapshot;

  const { now } = useTimerTick();
  
  if (pathname === "/timer" || !snap) return null;

  const running = isRunning(snap);
  if (!running && snap.accumulatedSec === 0) return null;

  const isPomodoro = snap.mode === "pomodoro";
  const phase = snap.pomoPhase ?? "focus";
  const displaySec = isPomodoro ? remainingSeconds(snap, now) : elapsedSeconds(snap, now);

  const isBreak = isPomodoro && phase === "break";
  const activeColor = isBreak ? "#10b981" : "var(--focus)";
  const isDeepFlow = running && elapsedSeconds(snap, now) > 20 * 60 && phase === "focus";

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-500">
      <Link
        to="/timer"
        className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-full border shadow-lg transition-all hover:scale-105 active:scale-95",
          running ? "bg-card/80 border-border" : "bg-secondary/90 border-transparent opacity-80",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center size-6 rounded-full text-white",
            running && "animate-pulse",
          )}
          style={{ background: isDeepFlow ? "#00f0ff" : activeColor }}
        >
          <TimerIcon running={running} isBreak={isBreak} />
        </div>
        <div className="flex flex-col min-w-[60px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
            {getTimerLabel(isPomodoro, phase)}
          </span>
          <span className="tabular font-mono text-sm font-semibold leading-none mt-0.5">
            {formatHMS(Math.round(displaySec))}
          </span>
        </div>
      </Link>
    </div>
  );
}
