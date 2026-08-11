import { useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { isRunning, totalFocusSec } from "@/lib/timer-engine";
import { checkIsTauri, notify } from "@/lib/tauri";
import { getSetting } from "@/lib/repo";
import { toast } from "sonner";
import { z } from "zod";
import { invoke } from "@tauri-apps/api/core";
import { useTimerTick } from "./timer-tick-provider";

const TWENTY_MINUTES_SEC = 20 * 60;

export function EyeTimerWatcher() {
  const snapRow = useLiveQuery(() => getDb().timerSnapshots.get("current"), [], null);
  const snap = snapRow?.snapshot;

  const eyeBreakEnabled = useLiveQuery(
    () => getSetting("eyeBreakEnabled", false, z.boolean()),
    [],
    false,
  );
  const notifEnabled = useLiveQuery(() => getSetting("notificationsEnabled", true), [], true);

  const lastEyeBreakRef = useRef<number>(0);

  const { now } = useTimerTick();

  useEffect(() => {
    if (!snap || !isRunning(snap) || !eyeBreakEnabled) return;

    const currentFocusSec = Math.floor(totalFocusSec(snap, now));
    const intervals = Math.floor(currentFocusSec / TWENTY_MINUTES_SEC);

    if (intervals > 0 && intervals > lastEyeBreakRef.current) {
      lastEyeBreakRef.current = intervals;

      if (checkIsTauri()) {
        invoke("spawn_eye_rest").catch(console.error);
      } else {
        toast("20-20-20 Rule", {
          description: "Look at something 20 feet away for 20 seconds.",
          duration: 20000,
        });
        if (notifEnabled) {
          notify(
            "20-20-20 Eye Break!",
            "Look at something 20 feet away for 20 seconds to protect your eyes.",
          );
        }
      }
    }
  }, [snap, eyeBreakEnabled, notifEnabled, now]);

  return null;
}
