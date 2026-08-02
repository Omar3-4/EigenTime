import type { TimerSnapshot } from "./db";

export type TimerAction = "start" | "pause" | "resume" | "reset" | "skip" | "configure";

export const emptyTimer = (targetSec = 25 * 60): TimerSnapshot => ({
  subjectId: null,
  countdown: false,
  targetSec,
  accumulatedSec: 0,
  runningSince: null,
  difficulty: 3,
});

/** Wall-clock derived elapsed seconds, so reloads and sleep do not lose time. */
export function elapsedSeconds(snap: TimerSnapshot, now = Date.now()): number {
  const live = snap.runningSince ? (now - snap.runningSince) / 1000 : 0;
  return snap.accumulatedSec + live;
}

export function remainingSeconds(snap: TimerSnapshot, now = Date.now()): number {
  return Math.max(0, snap.targetSec - elapsedSeconds(snap, now));
}

export function isRunning(snap: TimerSnapshot): boolean {
  return snap.runningSince !== null;
}

export function progress(snap: TimerSnapshot, now = Date.now()): number {
  if (snap.countdown && snap.targetSec > 0) {
    return Math.min(1, elapsedSeconds(snap, now) / snap.targetSec);
  }
  // count-up rings complete every 60 minutes
  const hourSec = 3600;
  return (elapsedSeconds(snap, now) % hourSec) / hourSec;
}

export function reduceTimer(
  snap: TimerSnapshot,
  action: TimerAction,
  now = Date.now(),
): TimerSnapshot {
  switch (action) {
    case "start":
    case "resume":
      if (snap.runningSince) return snap;
      return { ...snap, runningSince: now };
    case "pause":
      if (!snap.runningSince) return snap;
      return {
        ...snap,
        accumulatedSec: elapsedSeconds(snap, now),
        runningSince: null,
      };
    case "skip":
      // jump to the end of the configured target
      return { ...snap, accumulatedSec: snap.targetSec, runningSince: null };
    case "reset":
      return { ...snap, accumulatedSec: 0, runningSince: null };
    default:
      return snap;
  }
}
