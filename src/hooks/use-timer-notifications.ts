import { useEffect, useRef, useMemo, useState } from "react";
import type { Session, TimerSnapshot, DailyStat } from "@/lib/db";
import { isRunning, remainingSeconds, reduceTimer, elapsedSeconds } from "@/lib/timer-engine";
import { notifyPhaseComplete, notifyDailyGoalAchieved } from "@/lib/tauri";
import { playChime } from "@/lib/audio";
import { buildFatigue } from "@/lib/analytics";
import { toast } from "sonner";

export interface TimerNotificationOptions {
  snap: TimerSnapshot;
  commit: (s: TimerSnapshot) => void;
  now: number;
  sessions: Session[] | undefined;
  stat: DailyStat | null;
  goalHours: number;
  elapsed: number;
  running: boolean;
}

export function useTimerNotifications({
  snap,
  commit,
  now,
  sessions,
  stat,
  goalHours,
  elapsed,
  running,
}: TimerNotificationOptions) {
  const breakWarnedRef = useRef(false);
  const [warnedFatigue, setWarnedFatigue] = useState(false);
  const goalAchievedDayRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isRunning(snap)) return;

    if (snap.mode === "pomodoro") {
      if (remainingSeconds(snap, now) <= 0) {
        const wasFocus = snap.pomoPhase === "focus";
        const msg = wasFocus
          ? "Focus phase complete! Break time 🎉"
          : "Break over — back to focus!";
        toast.info(msg, { duration: 4000 });
        notifyPhaseComplete(wasFocus ? "focus" : "break").catch(console.error);
        playChime().catch(console.error);
        commit(reduceTimer(snap, "finish_phase"));
      } else if (snap.pomoPhase === "break" && !breakWarnedRef.current) {
        breakWarnedRef.current = true;
        toast("Hydrate & Stretch 💧", {
          description: "Use this break to drink water and check your posture.",
          duration: 10000,
        });
      }

      // Reset break warning when focus phase starts
      if (snap.pomoPhase === "focus") {
        breakWarnedRef.current = false;
      }
    }
  }, [snap, now, commit]);

  const fatigue = useMemo(
    () => (sessions && sessions.length > 0 && isRunning(snap) ? buildFatigue(sessions) : null),
    [sessions, snap],
  );

  useEffect(() => {
    if (!fatigue || warnedFatigue) return;
    const currentElapsed = elapsedSeconds(snap, now);
    const estimatedRisk = Math.min(100, fatigue.risk + (currentElapsed / 3600 / 6) * 45);
    if (estimatedRisk > 80) {
      toast.warning("Fatigue Warning", {
        description: "Energy levels predicted to drop soon. Consider a rest within 30 minutes.",
        duration: 8000,
      });
      setWarnedFatigue(true);
    }
  }, [fatigue, warnedFatigue, snap, now]);

  useEffect(() => {
    if (!stat) return;
    const currentDay = stat.day;
    if (goalAchievedDayRef.current === currentDay) return;

    const todayTotal = stat.totalSec + (running ? elapsed : 0);
    const goalSec = goalHours * 3600;
    if (goalSec > 0 && todayTotal >= goalSec) {
      goalAchievedDayRef.current = currentDay;
      notifyDailyGoalAchieved(goalHours).catch(console.error);
    }
  }, [elapsed, running, stat, goalHours]);

  return { warnedFatigue, setWarnedFatigue };
}
