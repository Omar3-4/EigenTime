/**
 * useGlobalShortcuts
 *
 * Registers OS-level global keyboard shortcuts that work even when the
 * EigenTime window is minimized or out of focus.
 *
 * Shortcuts are automatically cleaned up (unregistered) when the component
 * using this hook unmounts — zero memory leaks.
 */
import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import type { TimerSnapshot } from "@/lib/db";
import type { TimerAction } from "@/lib/timer-engine";
import { isRunning } from "@/lib/timer-engine";

type CommitFn = (next: TimerSnapshot) => void;

interface ShortcutCallbacks {
  onTogglePlay: () => void;
  onStop: () => void;
  onSkip: () => void;
  onToggleZen: () => void;
}

const SHORTCUTS = [
  { combo: "Ctrl+Shift+P", key: "play" },
  { combo: "Ctrl+Shift+S", key: "stop" },
  { combo: "Ctrl+Shift+N", key: "skip" },
  { combo: "Ctrl+Shift+Z", key: "zen" },
] as const;

export function useGlobalShortcuts(enabled: boolean, callbacks: ShortcutCallbacks) {
  // Keep callbacks ref-stable so shortcuts don't need to be re-registered
  // every render — only when `enabled` actually changes.
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!enabled || !isTauri()) return;

    let registered = false;

    const registerAll = async () => {
      try {
        // Register each shortcut, gracefully ignoring conflicts
        for (const { combo, key } of SHORTCUTS) {
          try {
            await register(combo, (event) => {
              if (event.state !== "Pressed") return;
              switch (key) {
                case "play":
                  cbRef.current.onTogglePlay();
                  break;
                case "stop":
                  cbRef.current.onStop();
                  break;
                case "skip":
                  cbRef.current.onSkip();
                  break;
                case "zen":
                  cbRef.current.onToggleZen();
                  break;
              }
            });
          } catch (err) {
            console.warn(
              `[EigenTime] Could not register shortcut ${combo} — it may be taken by another app.`,
              err,
            );
          }
        }
        registered = true;
      } catch (err) {
        console.warn("[EigenTime] Global shortcut registration failed:", err);
      }
    };

    registerAll();

    return () => {
      if (registered && isTauri()) {
        // Unregister all EigenTime shortcuts on unmount
        unregisterAll().catch((err) => {
          console.warn("[EigenTime] Failed to unregister shortcuts:", err);
        });
      }
    };
  }, [enabled]);
}
