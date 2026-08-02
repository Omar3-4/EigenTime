import { useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { isRunning } from "@/lib/timer-engine";
import { notify } from "@/lib/tauri";
import { getSetting } from "@/lib/repo";

const TWENTY_MINUTES_SEC = 20 * 60;

export function EyeTimerWatcher() {
  const snapRow = useLiveQuery(() => getDb().timerSnapshots.get("current"), [], null);
  const snap = snapRow?.snapshot;
  
  const notifEnabled = useLiveQuery(() => getSetting("notificationsEnabled", true), [], true);

  // Read accumulator from local storage to persist across reloads
  const accRef = useRef<number>(
    parseInt(localStorage.getItem("eyeAcc") || "0", 10)
  );

  useEffect(() => {
    if (!snap || !isRunning(snap)) return;

    const id = setInterval(() => {
      accRef.current += 1;
      localStorage.setItem("eyeAcc", accRef.current.toString());

      if (accRef.current >= TWENTY_MINUTES_SEC) {
        // Trigger 20-20-20
        accRef.current = 0;
        localStorage.setItem("eyeAcc", "0");
        
        if (notifEnabled) {
          notify(
            "20-20-20 Eye Break!",
            "Look at something 20 feet away for 20 seconds to protect your eyes."
          );
        }
      }
    }, 1000);

    return () => clearInterval(id);
  }, [snap, notifEnabled]);

  return null;
}
