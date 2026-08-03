/**
 * EigenTime Timer Engine
 *
 * Two modes (inspired by Gradz):
 *  - "stopwatch": open-ended count-up, no target
 *  - "pomodoro":  fixed focus/break cycles (Pomodoro technique)
 *
 * All timing is wall-clock derived — survives tab switches, page refreshes,
 * and device sleep without losing accuracy.
 *
 * State shape (TimerSnapshot) is flat and serialisable for IndexedDB persistence.
 */
import type { TimerSnapshot } from "./db";

// ─── Re-export types ──────────────────────────────────────────────────────────

export type TimerMode = "stopwatch" | "pomodoro";
export type PomodoroPhase = "focus" | "break" | "completed";
export type TimerAction =
  "start" | "pause" | "resume" | "reset" | "skip" | "configure" | "finish_phase"; // advance pomo to next phase

// ─── Default values ────────────────────────────────────────────────────────────

export const DEFAULT_POMO_FOCUS_MIN = 25;
export const DEFAULT_POMO_BREAK_MIN = 5;
export const DEFAULT_POMO_ROUNDS = 4;

// ─── Factory ───────────────────────────────────────────────────────────────────

export const emptyTimer = (targetSec = 0): TimerSnapshot => ({
  subjectId: null,
  targetSec,
  accumulatedSec: 0,
  runningSince: null,
  difficulty: 3,
  overallStartedAt: null,
  // Pomodoro extensions
  mode: "stopwatch",
  pomoFocusSec: DEFAULT_POMO_FOCUS_MIN * 60,
  pomoBreakSec: DEFAULT_POMO_BREAK_MIN * 60,
  pomoRounds: DEFAULT_POMO_ROUNDS,
  pomoCurrentRound: 1,
  pomoPhase: "focus",
  pomoAccumulatedFocusSec: 0,
});

// ─── Pure derived computations ─────────────────────────────────────────────────

/** Elapsed seconds *within the current phase* (wall-clock safe). */
export function elapsedSeconds(snap: TimerSnapshot, now = Date.now()): number {
  const live = snap.runningSince ? (now - snap.runningSince) / 1000 : 0;
  return snap.accumulatedSec + live;
}

/** Remaining seconds in current phase (pomo only). Returns Infinity for stopwatch/countup. */
export function remainingSeconds(snap: TimerSnapshot, now = Date.now()): number {
  if (snap.mode === "pomodoro") {
    if (snap.pomoPhase === "completed") return 0;
    const phaseSec = snap.pomoPhase === "focus" ? snap.pomoFocusSec! : snap.pomoBreakSec!;
    return Math.max(0, phaseSec - elapsedSeconds(snap, now));
  }
  return Infinity;
}

export function isRunning(snap: TimerSnapshot): boolean {
  return snap.runningSince !== null;
}

/** Arc progress [0–1] for SVG ring. */
export function progress(snap: TimerSnapshot, now = Date.now()): number {
  const elapsed = elapsedSeconds(snap, now);

  if (snap.mode === "pomodoro") {
    if (snap.pomoPhase === "completed") return 1;
    const phaseSec = snap.pomoPhase === "focus" ? snap.pomoFocusSec! : snap.pomoBreakSec!;
    if (!phaseSec || phaseSec <= 0) return 0;
    return Math.min(1, elapsed / phaseSec);
  }
  // count-up: rings complete every 60 minutes
  const hourSec = 3600;
  return (elapsed % hourSec) / hourSec;
}

/** Total accumulated FOCUS seconds (for session save). */
export function totalFocusSec(snap: TimerSnapshot, now = Date.now()): number {
  if (snap.mode !== "pomodoro") return elapsedSeconds(snap, now);
  const extra =
    snap.pomoPhase === "focus" && snap.runningSince
      ? elapsedSeconds(snap, now)
      : snap.accumulatedSec;
  return (snap.pomoAccumulatedFocusSec ?? 0) + (snap.pomoPhase === "focus" ? extra : 0);
}

// ─── State machine reducer ─────────────────────────────────────────────────────

export function reduceTimer(
  snap: TimerSnapshot,
  action: TimerAction,
  now = Date.now(),
): TimerSnapshot {
  switch (action) {
    case "start":
    case "resume": {
      if (snap.runningSince) return snap;

      let newPauseDuration = snap.pauseDurationSec ?? 0;
      if (snap.pausedAt) {
        newPauseDuration += (now - snap.pausedAt) / 1000;
      }

      if (snap.mode === "pomodoro" && snap.pomoPhase === "completed") {
        return {
          ...snap,
          pomoPhase: "focus",
          pomoCurrentRound: 1,
          accumulatedSec: 0,
          runningSince: now,
          overallStartedAt: snap.overallStartedAt ?? now,
          pausedAt: null,
          pauseDurationSec: newPauseDuration,
        };
      }
      return {
        ...snap,
        runningSince: now,
        // overallStartedAt is set only once — on the very first start
        overallStartedAt: snap.overallStartedAt ?? now,
        pausedAt: null,
        pauseDurationSec: newPauseDuration,
      };
    }

    case "pause":
      if (!snap.runningSince) return snap;
      return {
        ...snap,
        accumulatedSec: elapsedSeconds(snap, now),
        runningSince: null,
        pauseCount: (snap.pauseCount ?? 0) + 1,
        pausedAt: now,
      };

    case "finish_phase": {
      // Advance pomodoro to the next phase
      if (snap.mode !== "pomodoro") return snap;
      const elapsed = elapsedSeconds(snap, now);
      const wasFocus = snap.pomoPhase === "focus";
      const focusSoFar = (snap.pomoAccumulatedFocusSec ?? 0) + (wasFocus ? elapsed : 0);
      const nextRound = wasFocus ? snap.pomoCurrentRound! : (snap.pomoCurrentRound ?? 1) + 1;
      const isLastRound = nextRound > (snap.pomoRounds ?? DEFAULT_POMO_ROUNDS);
      if (isLastRound) {
        return {
          ...snap,
          pomoPhase: "completed",
          pomoCurrentRound: snap.pomoRounds ?? DEFAULT_POMO_ROUNDS,
          pomoAccumulatedFocusSec: focusSoFar,
          accumulatedSec: 0,
          runningSince: null, // stop the timer
        };
      }
      return {
        ...snap,
        pomoPhase: wasFocus ? "break" : "focus",
        pomoCurrentRound: nextRound,
        pomoAccumulatedFocusSec: focusSoFar,
        accumulatedSec: 0,
        runningSince: now, // auto-start next phase
      };
    }

    case "skip":
      if (snap.mode === "pomodoro") {
        return reduceTimer(snap, "finish_phase", now);
      }
      return { ...snap, accumulatedSec: snap.targetSec, runningSince: null };

    case "reset":
      return {
        ...snap,
        accumulatedSec: 0,
        runningSince: null,
        overallStartedAt: null,
        pomoPhase: "focus",
        pomoCurrentRound: 1,
        pomoAccumulatedFocusSec: 0,
        pauseCount: 0,
        pauseDurationSec: 0,
        pausedAt: null,
        scratchpadNotes: [],
      };

    default:
      return snap;
  }
}
