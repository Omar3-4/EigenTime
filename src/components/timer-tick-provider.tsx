import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSetting } from "@/lib/repo";

interface TimerTickContextType {
  now: number;
}

const TimerTickContext = createContext<TimerTickContextType>({ now: Date.now() });

export function useTimerTick() {
  return useContext(TimerTickContext);
}

export function TimerTickProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(Date.now());

  // We can also use this global ticker to do the midnight boundary check
  const lastMidnightRef = useState(() => new Date().setHours(0, 0, 0, 0))[0];

  useEffect(() => {
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);

      // Check midnight boundary
      const currentMidnight = new Date(current).setHours(0, 0, 0, 0);
      if (currentMidnight > lastMidnightRef) {
        // Daily Reset! Instead of a hard reload, emit an event.
        // Listeners (like dashboard) can catch this to refresh their data.
        window.dispatchEvent(new Event("midnight-rollover"));
      }
    }, 1000); // 1000ms for responsiveness (throttled for CPU/GPU efficiency)

    return () => clearInterval(id);
  }, [lastMidnightRef]);

  return <TimerTickContext.Provider value={{ now }}>{children}</TimerTickContext.Provider>;
}
