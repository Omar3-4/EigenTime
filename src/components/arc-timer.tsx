import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Redo2, SkipForward, Square, Undo2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Subject, TimerSnapshot } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { buildFatigue } from "@/lib/analytics";
import {
  DEFAULT_DAILY_GOAL_HOURS,
  getSetting,
  listSubjects,
  loadTimer,
  persistTimer,
  saveSession,
  todayStat,
  allSessions,
} from "@/lib/repo";
import {
  elapsedSeconds,
  emptyTimer,
  isRunning,
  progress,
  reduceTimer,
  remainingSeconds,
  type TimerAction,
} from "@/lib/timer-engine";
import { formatHMS } from "@/lib/time";
import { subjectColorVar } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";

const SIZE = 320;
const R = 118;
const CIRC = 2 * Math.PI * R;

export function ArcTimer() {
  const { t } = useI18n();
  const subjects = useLiveQuery(() => listSubjects(), [], [] as Subject[]);
  const stat = useLiveQuery(() => todayStat(), [], null);
  const sessions = useLiveQuery(() => allSessions(), [], []);
  const goalHours =
    useLiveQuery(() => getSetting("dailyGoalHours", DEFAULT_DAILY_GOAL_HOURS), [], null) ??
    DEFAULT_DAILY_GOAL_HOURS;

  const [snap, setSnap] = useState<TimerSnapshot>(() => emptyTimer());
  const [loaded, setLoaded] = useState(false);
  const [warnedFatigue, setWarnedFatigue] = useState(false);
  const [, forceTick] = useState(0);
  const past = useRef<TimerSnapshot[]>([]);
  const future = useRef<TimerSnapshot[]>([]);

  useEffect(() => {
    loadTimer().then((s) => {
      if (s) setSnap(s);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void persistTimer(snap);
  }, [snap, loaded]);

  useEffect(() => {
    if (!isRunning(snap)) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [snap]);

  // Predictive Fatigue Early Warning
  const elapsed = elapsedSeconds(snap);
  const running = isRunning(snap);

  useEffect(() => {
    if (!running || !sessions || warnedFatigue) return;
    const baseRisk = buildFatigue(sessions).risk;
    const estimatedRisk = Math.min(100, baseRisk + (elapsed / 3600 / 6) * 45);
    
    if (estimatedRisk > 80) {
      toast.warning("Fatigue Warning", { 
        description: "Energy levels predicted to drop soon. Consider taking a rest within 30 minutes.",
        duration: 8000 
      });
      setWarnedFatigue(true);
    }
  }, [running, elapsed, sessions, warnedFatigue]);

  const commit = (next: TimerSnapshot) => {
    past.current = [...past.current.slice(-30), snap];
    future.current = [];
    setSnap(next);
  };

  const act = (action: TimerAction) => commit(reduceTimer(snap, action));

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current = [snap, ...future.current];
    setSnap(prev);
  };

  const redo = () => {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current = [...past.current, snap];
    setSnap(next);
  };

  const ratio = progress(snap);
  const display = snap.countdown ? remainingSeconds(snap) : elapsed;

  const activeSubject = useMemo(
    () => subjects?.find((s) => s.id === snap.subjectId) ?? null,
    [subjects, snap.subjectId],
  );
  
  // Deep Flow Visual Indicator (triggers after 20 minutes of continuous focus)
  const isDeepFlow = running && elapsed > 20 * 60;
  const arcColor = isDeepFlow ? "#00f0ff" : (activeSubject ? subjectColorVar[activeSubject.color] : "var(--focus)");

  const todaySec = stat?.totalSec ?? 0;
  const goalSec = goalHours * 3600;
  const goalPct = goalSec > 0 ? Math.min(100, Math.round(((todaySec + elapsed) / goalSec) * 100)) : 0;

  const finish = async () => {
    const total = Math.round(elapsed);
    if (total < 1) return;
    const paused = reduceTimer(snap, "pause");
    await saveSession({
      subjectId: snap.subjectId,
      startedAt: Date.now() - total * 1000,
      endedAt: Date.now(),
      durationSec: total,
      mode: "focus",
      difficulty: snap.difficulty,
    });
    past.current = [];
    future.current = [];
    
    // Dynamic Rest Calibration
    const suggestedBreakMinutes = Math.max(5, Math.round((total / 60) * 0.2 * (snap.difficulty / 3)));
    toast.success("Session Completed", {
      description: `Great focus! Suggested rest interval: ${suggestedBreakMinutes} minutes.`,
      duration: 10000,
    });
    
    setWarnedFatigue(false);
    setSnap({ ...paused, accumulatedSec: 0, runningSince: null });
  };

  const ticks = Array.from({ length: 30 }, (_, i) => i);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="glass flex flex-col items-center gap-6 rounded-3xl p-6 sm:p-10">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* radial minute ticks: 0–30 min, long marks every 5 */}
            <g>
              {ticks.map((i) => {
                const angle = (i / 30) * 2 * Math.PI - Math.PI / 2;
                const major = i % 5 === 0;
                const outer = R + 26;
                const inner = outer - (major ? 12 : 6);
                const cx = SIZE / 2;
                return (
                  <line
                    key={i}
                    x1={cx + Math.cos(angle) * inner}
                    y1={cx + Math.sin(angle) * inner}
                    x2={cx + Math.cos(angle) * outer}
                    y2={cx + Math.sin(angle) * outer}
                    stroke={major ? arcColor : "var(--border)"}
                    strokeWidth={major ? 2.5 : 1.5}
                    strokeLinecap="round"
                    opacity={major ? 0.85 : 0.6}
                  />
                );
              })}
            </g>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="var(--border)"
              strokeWidth={14}
              opacity={0.5}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={arcColor}
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - ratio)}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              style={{ 
                transition: "stroke-dashoffset 300ms linear, stroke 1000ms ease, filter 1000ms ease",
                filter: isDeepFlow ? "drop-shadow(0 0 16px rgba(0, 240, 255, 0.7))" : "none"
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {snap.countdown ? t("remaining") : t("elapsed")}
            </span>
            <span className="tabular font-mono text-4xl font-semibold sm:text-5xl">
              {formatHMS(display)}
            </span>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--goal-soft)", color: "var(--goal-foreground)" }}
            >
              {goalPct}% {t("ofGoal")}
            </span>
            {activeSubject && (
              <span className="text-sm font-medium text-muted-foreground">{activeSubject.name}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => act(running ? "pause" : elapsed > 0 ? "resume" : "start")}
            className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-[1.02]"
            style={{ background: "var(--gradient-focus)" }}
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {running ? t("pause") : elapsed > 0 ? t("resume") : t("start")}
          </button>
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
      </div>

      <div className="glass flex flex-col gap-5 rounded-3xl p-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("selectSubject")}
          </p>
          <div className="flex flex-wrap gap-2">
            {(subjects ?? [])
              .filter((s) => !s.archived)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => commit({ ...snap, subjectId: s.id })}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                    snap.subjectId === s.id ? "border-transparent" : "border-border bg-card",
                  )}
                  style={
                    snap.subjectId === s.id
                      ? { background: subjectColorVar[s.color], color: "oklch(1 0 0)" }
                      : undefined
                  }
                >
                  {s.name}
                </button>
              ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("timer")}
          </p>
          <div className="flex gap-2">
            {[false, true].map((cd) => (
              <button
                key={String(cd)}
                type="button"
                onClick={() => commit({ ...snap, countdown: cd })}
                className={cn(
                  "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                  snap.countdown === cd
                    ? "bg-focus-soft text-focus-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {cd ? t("countdown") : t("countUp")}
              </button>
            ))}
          </div>
          {snap.countdown && (
            <div className="flex flex-wrap gap-2 pt-1">
              {[15, 25, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => commit({ ...snap, targetSec: m * 60 })}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold",
                    snap.targetSec === m * 60
                      ? "bg-elapsed-soft text-elapsed-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
          )}
        </div>

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
                  "flex-1 rounded-lg py-2 text-xs font-semibold",
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
        "flex size-11 items-center justify-center rounded-2xl border transition-colors",
        emphasis
          ? "border-transparent bg-goal-soft text-goal-foreground hover:brightness-95"
          : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
