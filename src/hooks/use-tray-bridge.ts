/**
 * useTrayBridge
 *
 * Bidirectional IPC bridge between the Rust system tray and the React timer.
 *
 * ─ Inbound  (Rust → React): Listens for `tray:action` events from the tray
 *   context menu and maps them to timer actions.
 *
 * ─ Outbound (React → Rust): Emits `tray:timer-state` to update the tray
 *   tooltip. Throttled to at most once per second, and only emitted when the
 *   window is not the focused foreground window (prevents unnecessary IPC).
 *
 * All listeners are cleaned up on unmount — zero memory leaks.
 */
import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type { TimerSnapshot } from "@/lib/db";
import { elapsedSeconds, isRunning, remainingSeconds } from "@/lib/timer-engine";
import { formatHMS } from "@/lib/time";

type TrayAction = "toggle-play" | "skip" | "reset";

interface TrayBridgeCallbacks {
  onTogglePlay: () => void;
  onSkip: () => void;
  onReset: () => void;
}

export function useTrayBridge(snap: TimerSnapshot, callbacks: TrayBridgeCallbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const snapRef = useRef(snap);
  snapRef.current = snap;

  // ── Inbound: listen for tray menu actions ────────────────────────────────
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: UnlistenFn | undefined;

    listen<TrayAction>("tray:action", (event) => {
      switch (event.payload) {
        case "toggle-play":
          cbRef.current.onTogglePlay();
          break;
        case "skip":
          cbRef.current.onSkip();
          break;
        case "reset":
          cbRef.current.onReset();
          break;
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(console.error);

    return () => {
      unlisten?.();
    };
  }, []);

  // ── Outbound: emit timer state to tray tooltip ───────────────────────────
  // Throttled: emits at most every 1000ms, only when window is not focused.
  const lastEmitRef = useRef(0);

  useEffect(() => {
    if (!isTauri()) return;

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      // Throttle to 1 emit per second
      if (now - lastEmitRef.current < 950) return;
      // Only emit when window is not focused (reduce IPC overhead)
      if (document.hasFocus()) return;

      lastEmitRef.current = now;
      const current = snapRef.current;
      const running = isRunning(current);

      let label: string;
      if (!running && current.accumulatedSec === 0) {
        label = "Idle";
      } else if (current.mode === "pomodoro") {
        const phase = current.pomoPhase === "focus" ? "Focus" : current.pomoPhase === "break" ? "Break" : "Done";
        const rem = remainingSeconds(current, now);
        label = rem === Infinity ? `${phase}: running` : `${phase}: ${formatHMS(rem)}`;
      } else {
        const elapsed = elapsedSeconds(current, now);
        label = running ? `Focus: ${formatHMS(elapsed)}` : `Paused: ${formatHMS(elapsed)}`;
      }

      emit("tray:timer-state", { label, is_running: running }).catch(() => {});
    }, 250); // Poll at 250ms but gate emission to 1s

    return () => window.clearInterval(intervalId);
  }, []);
}
