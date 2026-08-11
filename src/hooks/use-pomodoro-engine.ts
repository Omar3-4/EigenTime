import { useState } from "react";
import { TimerSnapshot, Session } from "@/lib/db";
import {
  DEFAULT_POMO_BREAK_MIN,
  DEFAULT_POMO_FOCUS_MIN,
  DEFAULT_POMO_ROUNDS,
} from "@/lib/timer-engine";
import { getOptimalPomodoro } from "@/lib/analytics";
import { toast } from "sonner";

export function usePomodoroEngine(
  snap: TimerSnapshot,
  commit: (s: TimerSnapshot) => void,
  sessions: Session[],
) {
  const [pomoFocusMin, setPomoFocusMin] = useState(DEFAULT_POMO_FOCUS_MIN);
  const [pomoBreakMin, setPomoBreakMin] = useState(DEFAULT_POMO_BREAK_MIN);
  const [pomoRounds, setPomoRounds] = useState(DEFAULT_POMO_ROUNDS);

  const applyPomoSettings = () => {
    commit({
      ...snap,
      mode: "pomodoro",
      pomoFocusSec: pomoFocusMin * 60,
      pomoBreakSec: pomoBreakMin * 60,
      pomoRounds,
    });
    toast.success(`Pomodoro updated: ${pomoFocusMin}m focus / ${pomoBreakMin}m break`);
  };

  const autoTunePomodoro = () => {
    if (!sessions || sessions.length === 0) {
      toast.error("Not enough focus history to auto-tune.");
      return;
    }
    const optimal = getOptimalPomodoro(sessions);
    if (!optimal) {
      toast.error("Not enough diverse sessions to find optimal duration.");
      return;
    }
    setPomoFocusMin(optimal.focusMin);
    setPomoBreakMin(optimal.breakMin);
    toast.success(`Auto-tuned to ${optimal.focusMin}m focus (FEI score: ${optimal.fei})`);
  };

  return {
    pomoFocusMin,
    setPomoFocusMin,
    pomoBreakMin,
    setPomoBreakMin,
    pomoRounds,
    setPomoRounds,
    applyPomoSettings,
    autoTunePomodoro,
  };
}
