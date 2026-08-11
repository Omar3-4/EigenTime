import { sendNotification } from "@tauri-apps/plugin-notification";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  Undo2,
  Redo2,
  Coffee,
  Brain,
  Timer,
  AlarmCheck,
  Maximize,
  Minimize,
  PenTool,
  BookOpen,
  Wand2,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Subject, TimerSnapshot } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { buildFatigue, getOptimalPomodoro } from "@/lib/analytics";
import {
  DEFAULT_DAILY_GOAL_HOURS,
  getSetting,
  listSubjects,
  loadTimer,
  persistTimer,
  saveSession,
  scheduleTimerPersist,
  todayStat,
  createSubject,
} from "@/lib/repo";
import { useSessions } from "@/components/sessions-provider";
import {
  DEFAULT_POMO_BREAK_MIN,
  DEFAULT_POMO_FOCUS_MIN,
  DEFAULT_POMO_ROUNDS,
  elapsedSeconds,
  emptyTimer,
  isRunning,
  progress,
  reduceTimer,
  remainingSeconds,
  totalFocusSec,
  type TimerAction,
} from "@/lib/timer-engine";
import { formatHMS } from "@/lib/time";
import { subjectColorVar } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";
import { playChime } from "@/lib/audio";
import {
  requestNotificationPermission,
  notifyPhaseComplete,
  notifyDailyGoalAchieved,
} from "@/lib/tauri";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { useTrayBridge } from "@/hooks/use-tray-bridge";
import { useTimerTick } from "./timer-tick-provider";
import { usePomodoroEngine } from "@/hooks/use-pomodoro-engine";
import { useTimerNotifications } from "@/hooks/use-timer-notifications";
import { ArcProgress } from "./arc-progress";

const SIZE = 320;
const R = 118;
const CIRC = 2 * Math.PI * R;

function getArcColor(
  isDeepFlow: boolean,
  phase: string,
  isPomodoro: boolean,
  activeSubject: Subject | null,
) {
  if (isDeepFlow) return "#00f0ff";
  if (isPomodoro && phase === "break") return "#10b981";
  if (isPomodoro && phase === "completed") return "#a855f7";
  if (activeSubject) return subjectColorVar[activeSubject.color] ?? "var(--focus)";
  return "var(--focus)";
}

function getPhaseBackground(phase: string) {
  if (phase === "focus") return "var(--focus-soft)";
  if (phase === "completed") return "var(--elapsed-soft)";
  return "oklch(0.95 0.05 160)";
}

function getPhaseColor(phase: string) {
  if (phase === "focus") return "var(--focus-foreground)";
  if (phase === "completed") return "var(--elapsed-foreground)";
  return "oklch(0.35 0.12 160)";
}

function getPhaseLabel(phase: string) {
  if (phase === "focus") return "Focus";
  if (phase === "completed") return "Done";
  return "Break";
}

function getPhaseIcon(phase: string) {
  if (phase === "focus") return <Brain className="size-3.5" />;
  if (phase === "completed") return <AlarmCheck className="size-3.5" />;
  return <Coffee className="size-3.5" />;
}

function getTimerMainLabel(
  isPomodoro: boolean,
  phase: string,
  isTakingBreak: boolean,
  tElapsed: string,
) {
  if (isPomodoro) {
    if (phase === "focus") return "Focus Time";
    if (phase === "completed") return "Finished";
    return "Break Time";
  }
  if (isTakingBreak) return "On Break";
  return tElapsed;
}

function getDotStyle(i: number, round: number, phase: string, arcColor: string) {
  if (i < round - 1) {
    return { background: arcColor, opacity: 0.8, boxShadow: "none" };
  }
  if (i === round - 1) {
    const bg = phase === "focus" ? arcColor : "#10b981";
    return { background: bg, opacity: 1, boxShadow: `0 0 8px ${arcColor}88` };
  }
  return { background: "var(--border)", opacity: 0.35, boxShadow: "none" };
}

export function ArcTimer() {
  const { t } = useI18n();
  const subjects = useLiveQuery(() => listSubjects(), [], [] as Subject[]);
  const stat = useLiveQuery(() => todayStat(), [], null);
  const { sessions90: sessions } = useSessions();
  const goalHours =
    useLiveQuery(() => getSetting("dailyGoalHours", DEFAULT_DAILY_GOAL_HOURS), [], null) ??
    DEFAULT_DAILY_GOAL_HOURS;

  const [snap, setSnap] = useState<TimerSnapshot>(() => emptyTimer());
  const [loaded, setLoaded] = useState(false);
  const { now } = useTimerTick();
  const past = useRef<TimerSnapshot[]>([]);
  const future = useRef<TimerSnapshot[]>([]);

  const [isZen, setIsZen] = useState(false);
  const [zenEdge, setZenEdge] = useState(false);
  const [isTakingBreak, setIsTakingBreak] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [scratchInput, setScratchInput] = useState("");
  const [pauseContext, setPauseContext] = useState("");
  const [subjectError, setSubjectError] = useState(false);
  const [subjectInput, setSubjectInput] = useState("");
  const [topicInput, setTopicInput] = useState("");

  useEffect(() => {
    setTopicInput(snap.topic ?? "");
  }, [snap.topic]);

  useEffect(() => {
    if (snap.subjectId && subjects) {
      const s = subjects.find((sub) => sub.id === snap.subjectId);
      if (s && subjectInput !== s.name) {
        setSubjectInput(s.name);
      }
    }
  }, [snap.subjectId, subjects]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          setIsZen(!!document.fullscreenElement);
          if (!document.fullscreenElement) setZenEdge(false);
        });
      } else {
        setIsZen(!!document.fullscreenElement);
        if (!document.fullscreenElement) setZenEdge(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    requestNotificationPermission().catch(console.error);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleZen = async (edge = false) => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(console.error);
      if (edge) setZenEdge(true);
    } else {
      await document.exitFullscreen().catch(console.error);
      setZenEdge(false);
    }
  };

  useEffect(() => {
    loadTimer().then((s) => {
      if (s) {
        setSnap(s);
        if (s.pomoFocusSec) setPomoFocusMin(Math.round(s.pomoFocusSec / 60));
        if (s.pomoBreakSec) setPomoBreakMin(Math.round(s.pomoBreakSec / 60));
        if (s.pomoRounds) setPomoRounds(s.pomoRounds);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    scheduleTimerPersist(snap);
  }, [snap, loaded]);

  const elapsed = elapsedSeconds(snap, now);
  const sessionFocusSec = Math.round(totalFocusSec(snap, now));
  const running = isRunning(snap);
  const isPomodoro = snap.mode === "pomodoro";

  const snapRef = useRef(snap);
  snapRef.current = snap;

  const commit = useCallback((next: TimerSnapshot) => {
    past.current = [...past.current.slice(-30), snapRef.current];
    future.current = [];
    setSnap(next);
  }, []);

  const {
    pomoFocusMin,
    setPomoFocusMin,
    pomoBreakMin,
    setPomoBreakMin,
    pomoRounds,
    setPomoRounds,
    applyPomoSettings,
    autoTunePomodoro,
  } = usePomodoroEngine(snap, commit, sessions ?? []);

  const { setWarnedFatigue } = useTimerNotifications({
    snap,
    commit,
    now,
    sessions,
    stat,
    goalHours,
    elapsed: sessionFocusSec,
    running,
  });

  const globalShortcutsEnabled =
    useLiveQuery(() => getSetting("globalShortcutsEnabled", true, z.boolean()), [], true) ?? true;

  // ── Tray Bridge ───────────────────────────────────────────────────────────
  useTrayBridge(snap, {
    onTogglePlay: () => actRef.current(isRunning(snap) ? "pause" : "start"),
    onSkip: () => actRef.current("skip"),
    onReset: () => actRef.current("reset"),
  });

  const act = (action: TimerAction) => commit(reduceTimer(snap, action));
  // Stable ref so hooks above can call the latest act without stale closures
  const actRef = useRef(act);
  actRef.current = act;

  // ── Global Shortcuts ──────────────────────────────────────────────────────
  useGlobalShortcuts(globalShortcutsEnabled, {
    onTogglePlay: () => actRef.current(isRunning(snap) ? "pause" : running ? "resume" : "start"),
    onStop: () => actRef.current("reset"),
    onSkip: () => actRef.current("skip"),
    onToggleZen: () => toggleZen(),
  });

  const undo = () => {
    const prev = past.current[past.current.length - 1];
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [snapRef.current, ...future.current];
    setSnap(prev);
  };

  const redo = () => {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current = [...past.current, snapRef.current];
    setSnap(next);
  };

  const switchMode = (mode: "stopwatch" | "pomodoro") => {
    commit({
      ...snap,
      mode,
      targetSec: mode === "stopwatch" ? 0 : snap.targetSec,
      accumulatedSec: 0,
      runningSince: null,
      pomoPhase: "focus",
      pomoCurrentRound: 1,
      pomoAccumulatedFocusSec: 0,
      pauseCount: 0,
      pauseDurationSec: 0,
      pausedAt: null,
      scratchpadNotes: [],
    });
  };

  const finish = async () => {
    const total = Math.round(totalFocusSec(snap, now));
    if (total < 1) return;
    
    // We compute startedAt based on the exact focus duration so that
    // the analytics heatmap blocks don't span across break times.
    const startedAt = Date.now() - total * 1000;
    
    let targetSecObj = {};
    if (snap.mode === "pomodoro" && snap.pomoFocusSec !== undefined) {
      targetSecObj = { targetSec: snap.pomoFocusSec };
    } else if (snap.targetSec !== undefined) {
      targetSecObj = { targetSec: snap.targetSec };
    }

    const sessionInput = {
      subjectId: snap.subjectId,
      startedAt,
      endedAt: Date.now(),
      durationSec: total,
      mode: "focus" as const,
      difficulty: snap.difficulty,
      ...targetSecObj,
      ...(snap.pauseCount !== undefined ? { pauseCount: snap.pauseCount } : {}),
      ...(snap.pauseDurationSec !== undefined ? { pauseDurationSec: snap.pauseDurationSec } : {}),
      ...(snap.scratchpadNotes ? { scratchpadNotes: snap.scratchpadNotes } : {}),
      note: pauseContext,
    };
    await saveSession(sessionInput);

    // Trigger gamification engine
    import("@/lib/gamification").then((m) => {
      m.processSessionCompletion({
        id: "", // Mocked because processSessionCompletion only cares about stats
        day: "",
        ...sessionInput,
      }).catch(console.error);
    });
    past.current = [];
    future.current = [];
    const suggestedBreakMinutes = Math.max(
      5,
      Math.round((total / 60) * 0.2 * (snap.difficulty / 3)),
    );
    toast.success("Session Completed 🎉", {
      description: `Great focus! Suggested rest: ${suggestedBreakMinutes} minutes.`,
      duration: 10000,
    });
    setWarnedFatigue(false);
    setIsTakingBreak(false);
    setPauseContext("");
    setSnap(emptyTimer());
  };

  const saveScratch = () => {
    if (!scratchInput.trim()) return;
    commit({ ...snap, scratchpadNotes: [...(snap.scratchpadNotes ?? []), scratchInput] });
    setScratchInput("");
  };

  const rawRatio = progress(snap, now);
  const ratio = Number.isFinite(rawRatio) ? rawRatio : 0;
  const displaySec = isPomodoro ? remainingSeconds(snap, now) : elapsed;
  const phase = snap.pomoPhase ?? "focus";
  const isDeepFlow = running && sessionFocusSec > 20 * 60 && phase === "focus";

  const activeSubject = useMemo(
    () => subjects?.find((s) => s.id === snap.subjectId) ?? null,
    [subjects, snap.subjectId],
  );

  const arcColor = getArcColor(isDeepFlow, phase, isPomodoro, activeSubject);

  const todaySec = stat?.totalSec ?? 0;
  const goalSec = goalHours * 3600;
  const goalPct =
    goalSec > 0 ? Math.min(100, Math.round(((todaySec + sessionFocusSec) / goalSec) * 100)) : 0;
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  const round = snap.pomoCurrentRound ?? 1;
  const totalRounds = snap.pomoRounds ?? DEFAULT_POMO_ROUNDS;

  // Calculate live break time for the secondary stopwatch
  let liveBreakSec = snap.pauseDurationSec ?? 0;
  if (snap.pausedAt) {
    liveBreakSec += (now - snap.pausedAt) / 1000;
  }

  // Handle subtle edge mode render
  if (zenEdge) {
    return (
      <div
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center group"
        onClick={() => toggleZen(false)}
        onKeyDown={() => toggleZen(false)}
      >
        <div
          className="fixed top-0 start-0 h-[2px] transition-all bg-focus"
          style={{
            width: `${ratio * 100}%`,
            background: arcColor,
            filter: isDeepFlow ? "drop-shadow(0 0 10px rgba(0,240,255,1))" : "none",
          }}
        />
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground flex flex-col items-center gap-4">
          <span className="text-4xl font-mono tabular-nums">
            {formatHMS(Math.round(displaySec))}
          </span>
          <p className="text-xs tracking-widest uppercase">Click anywhere to exit Zen Edge</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", isZen ? "block" : "lg:grid-cols-[minmax(0,1fr)_340px]")}>
      <div
        className={cn(
          "flex flex-col items-center gap-6 p-6 sm:p-10 transition-all duration-700",
          isZen ? "fixed inset-0 z-50 bg-background justify-center scale-110" : "glass rounded-3xl",
        )}
      >
        <div className="absolute top-6 end-6 flex items-center gap-2">
          {isZen && (
            <button
              type="button"
              onClick={() => setZenEdge(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase bg-secondary text-muted-foreground hover:text-foreground transition-all"
            >
              Zen Edge
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleZen(false)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-all"
            title="Zen Mode (Fullscreen)"
          >
            {isZen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>

        {isPomodoro && (
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{
                background: getPhaseBackground(phase),
                color: getPhaseColor(phase),
              }}
            >
              {getPhaseIcon(phase)}
              {getPhaseLabel(phase)}
            </span>
            <span className="text-xs text-muted-foreground">
              Round {round} / {totalRounds}
            </span>
          </div>
        )}

        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <ArcProgress
            size={SIZE}
            radius={R}
            arcColor={arcColor}
            ratio={ratio}
            isDeepFlow={isDeepFlow}
          />

          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1"
            style={{ padding: "60px" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {getTimerMainLabel(isPomodoro, phase, isTakingBreak, t("elapsed"))}
            </span>
            <span className="tabular font-mono text-4xl font-semibold leading-none">
              {formatHMS(Math.round(displaySec))}
            </span>

            {/* Break Tracker (Secondary Stopwatch) */}
            {isTakingBreak && (
              <span className="text-sm font-mono font-bold text-emerald-500 animate-pulse mt-1">
                + {formatHMS(Math.round(liveBreakSec))}
              </span>
            )}

            {!isTakingBreak && (
              <span
                className="mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "var(--goal-soft)", color: "var(--goal-foreground)" }}
              >
                {goalPct}% {t("ofGoal")}
              </span>
            )}

            {activeSubject && !isTakingBreak && (
              <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                {activeSubject.name}
              </span>
            )}
            {isDeepFlow && !isTakingBreak && (
              <span
                className="animate-pulse text-[10px] font-semibold"
                style={{ color: "#00f0ff" }}
              >
                Deep Flow
              </span>
            )}
          </div>
        </div>

        {/* Context Dump UI When Paused */}
        {!running && snap.pausedAt && (
          <div className="w-full max-w-sm flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Health Restorative Activity Suggestions */}
            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
              <p className="text-xs font-semibold text-blue-500 mb-2 uppercase tracking-wider">
                Health Suggestions
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>💧 Drink a glass of water</li>
                <li>🧘 Stretch your shoulders & neck</li>
                <li>👀 Look at something 20 feet away</li>
              </ul>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Context Dump
              </p>
              <textarea
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 resize-none"
                rows={3}
                placeholder="Where did you stop? What is your next step?"
                value={pauseContext}
                onChange={(e) => setPauseContext(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {running ? (
            <button
              type="button"
              onClick={() => {
                setIsTakingBreak(false);
                act("pause");
              }}
              className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-300 ease-out hover:scale-[1.03] active:scale-95"
              style={{ background: "var(--gradient-focus)" }}
            >
              <Pause className="size-4" /> {t("pause")}
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setIsTakingBreak(false);

                if (elapsed === 0) {
                  const typedName = subjectInput.trim();
                  if (!typedName) {
                    setSubjectError(true);
                    return;
                  }

                  let finalId = snap.subjectId;
                  const existing = subjects?.find(
                    (s) => s.name.toLowerCase() === typedName.toLowerCase(),
                  );

                  if (existing) {
                    finalId = existing.id;
                  } else {
                    const colors = [
                      "focus",
                      "elapsed",
                      "break",
                      "purple",
                      "orange",
                      "pink",
                      "cyan",
                    ];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    finalId = await createSubject({
                      name: typedName,
                      color: randomColor as any,
                      weeklyTargetHours: 0,
                    });
                  }

                  setSubjectError(false);
                  const nextSnap = { ...snap, subjectId: finalId };
                  commit(reduceTimer(nextSnap, "start"));
                  return;
                }

                setSubjectError(false);
                act("resume");
              }}
              className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-300 ease-out hover:scale-[1.03] active:scale-95"
              style={{ background: "var(--gradient-focus)" }}
            >
              <Play className="size-4" /> {elapsed > 0 ? t("resume") : t("start")}
            </button>
          )}

          {/* Long Session Break Button (only in stopwatch mode and not pomodoro break) */}
          {running && !isPomodoro && (
            <button
              type="button"
              onClick={() => {
                setIsTakingBreak(true);
                act("pause");
              }}
              className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all duration-300 ease-out hover:bg-emerald-500/20 hover:scale-[1.03] active:scale-95 border border-emerald-500/20"
            >
              <Coffee className="size-4" /> Break
            </button>
          )}

          <IconBtn
            onClick={() => setScratchpadOpen(!scratchpadOpen)}
            label={t("brainDump")}
            emphasis={scratchpadOpen}
          >
            <PenTool className="size-4" />
          </IconBtn>
          <IconBtn onClick={() => act("skip")} label={t("skip")}>
            <SkipForward className="size-4" />
          </IconBtn>
          <IconBtn onClick={() => act("reset")} label={t("reset")}>
            <RotateCcw className="size-4" />
          </IconBtn>
          <IconBtn onClick={undo} label={t("undo")}>
            <Undo2 className="size-4" />
          </IconBtn>
          <IconBtn onClick={redo} label={t("redo")}>
            <Redo2 className="size-4" />
          </IconBtn>
          <IconBtn onClick={finish} label={t("finish")} emphasis>
            <Square className="size-4" />
          </IconBtn>
        </div>

        {/* {t("brainDump")} UI */}
        {scratchpadOpen && (
          <div className="w-full max-w-sm bg-card border rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
              <BookOpen className="size-3.5" /> {t("brainDump")}
            </h4>
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
              {(snap.scratchpadNotes ?? []).map((note, i) => (
                <div
                  key={`idx-${i}`}
                  className="text-sm px-3 py-2 bg-secondary/50 rounded-lg text-foreground break-words border-l-2 border-[var(--focus)]"
                >
                  {note}
                </div>
              ))}
              {(!snap.scratchpadNotes || snap.scratchpadNotes.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-2 italic">
                  Jot down any fleeing thoughts...
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-secondary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--focus)]"
                placeholder="Type note and hit Enter..."
                value={scratchInput}
                onChange={(e) => setScratchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveScratch()}
              />
              <button
                type="button"
                onClick={saveScratch}
                className="px-3 py-2 bg-[var(--focus-soft)] text-[var(--focus-foreground)] rounded-lg text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {isPomodoro && (
          <div className="flex items-center gap-2 mt-2">
            {Array.from({ length: totalRounds }, (_, i) => (
              <span
                key={`idx-${i}`}
                className="size-2.5 rounded-full transition-colors"
                style={getDotStyle(i, round, phase, arcColor)}
              />
            ))}
          </div>
        )}
      </div>

      {!isZen && (
        <div className="glass flex flex-col gap-5 rounded-3xl p-5">
          <div
            className={cn(
              "space-y-4 rounded-2xl p-4 transition-all duration-300",
              subjectError && !snap.subjectId
                ? "border-2 border-red-500 bg-red-500/10"
                : "border-2 border-transparent bg-transparent p-0",
            )}
          >
            <div className="space-y-2">
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  subjectError && !subjectInput.trim() ? "text-red-500" : "text-muted-foreground",
                )}
              >
                {t("selectSubject")} <span className="opacity-70">(Required)</span>
              </p>
              <input
                list="subject-options"
                type="text"
                placeholder="Type or select a subject..."
                value={subjectInput}
                onChange={(e) => {
                  setSubjectError(false);
                  setSubjectInput(e.target.value);
                  const existing = subjects?.find(
                    (s) => s.name.toLowerCase() === e.target.value.trim().toLowerCase(),
                  );
                  if (existing) {
                    commit({ ...snap, subjectId: existing.id });
                  } else if (e.target.value.trim() === "") {
                    commit({ ...snap, subjectId: "" });
                  }
                  // If it's a partial type, we do NOT clear snap.subjectId.
                  // This prevents the session from detaching during typing.
                }}
                onBlur={() => {
                  // If they typed something that doesn't match an existing subject,
                  // and it's not empty, we revert the input to the actual selected subject to avoid confusion.
                  const val = subjectInput.trim();
                  if (val) {
                    const existing = subjects?.find(
                      (s) => s.name.toLowerCase() === val.toLowerCase(),
                    );
                    if (!existing) {
                      const currentSubject = subjects?.find((s) => s.id === snap.subjectId);
                      setSubjectInput(currentSubject?.name ?? "");
                    }
                  }
                }}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
                  subjectError && !subjectInput.trim()
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/50 bg-red-500/5"
                    : "border-border bg-card hover:border-muted-foreground/30 focus:border-ring focus:ring-ring",
                )}
              />
              <datalist id="subject-options">
                {(subjects ?? [])
                  .filter((s) => !s.archived)
                  .map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("topic") || "Topic"} <span className="opacity-70">(Optional)</span>
              </p>
              <input
                type="text"
                placeholder="What are you focusing on?"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onBlur={() => commit({ ...snap, topic: topicInput })}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition-all hover:border-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Session Mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["stopwatch", "pomodoro"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors",
                    (snap.mode ?? "stopwatch") === m
                      ? "bg-focus-soft text-focus-foreground ring-2 ring-focus-foreground/20"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80",
                  )}
                >
                  {m === "stopwatch" ? (
                    <Timer className="size-3.5" />
                  ) : (
                    <AlarmCheck className="size-3.5" />
                  )}
                  {m === "stopwatch" ? "Long Session" : "Pomodoro"}
                </button>
              ))}
            </div>
          </div>

          {(snap.mode ?? "stopwatch") === "pomodoro" && (
            <div className="space-y-4 rounded-2xl bg-secondary/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  🎯 Pomodoro Settings
                </p>
                <button
                  type="button"
                  onClick={autoTunePomodoro}
                  className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  <Wand2 className="size-3.5 inline-block mr-1 align-sub" />
                  Auto-tune
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Focus Time</span>
                  <span className="font-bold" style={{ color: "var(--focus-foreground)" }}>
                    {pomoFocusMin}m
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={90}
                  step={5}
                  value={pomoFocusMin}
                  onChange={(e) => setPomoFocusMin(Number(e.target.value))}
                  className="w-full accent-[var(--focus-foreground)]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Break Time</span>
                  <span className="font-bold" style={{ color: "#10b981" }}>
                    {pomoBreakMin}m
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={pomoBreakMin}
                  onChange={(e) => setPomoBreakMin(Number(e.target.value))}
                  className="w-full accent-[#10b981]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Rounds</span>
                  <span className="font-bold text-foreground">{pomoRounds}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={pomoRounds}
                  onChange={(e) => setPomoRounds(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                type="button"
                onClick={applyPomoSettings}
                className="w-full rounded-xl py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
                style={{ background: "var(--gradient-focus)" }}
              >
                Apply Settings
              </button>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("difficulty")}
            </p>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => commit({ ...snap, difficulty: d })}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors",
                    snap.difficulty === d
                      ? "bg-productivity-soft text-productivity-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  emphasis,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-11 items-center justify-center rounded-2xl border transition-all duration-200 ease-out active:scale-95",
        emphasis
          ? "border-transparent bg-goal-soft text-goal-foreground hover:-translate-y-0.5 hover:shadow-md"
          : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground hover:-translate-y-0.5 hover:shadow-sm",
      )}
    >
      {children}
    </button>
  );
}
