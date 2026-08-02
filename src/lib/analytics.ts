import type { Session, Subject, Task } from "@/lib/db";
import { dayKey } from "@/lib/time";

/* ------------------------------------------------------------------ heatmap */

export interface HeatCell {
  day: string;
  date: Date;
  totalSec: number;
  sessionCount: number;
  /** 0..4 intensity tier */
  tier: 0 | 1 | 2 | 3 | 4;
  bySubject: { subjectId: string | null; sec: number }[];
  inRange: boolean;
}

/** 53 columns x 7 rows (Mon..Sun), ending on today. */
export function buildHeatmap(sessions: Session[], today = new Date()): HeatCell[][] {
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  // align start to Monday
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const byDay = new Map<string, Session[]>();
  for (const s of sessions) {
    if (s.mode !== "focus") continue;
    const list = byDay.get(s.day);
    if (list) list.push(s);
    else byDay.set(s.day, [s]);
  }

  const cells: HeatCell[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = dayKey(cursor);
    const list = byDay.get(key) ?? [];
    const totalSec = list.reduce((a, s) => a + s.durationSec, 0);
    const bucket = new Map<string | null, number>();
    for (const s of list) bucket.set(s.subjectId, (bucket.get(s.subjectId) ?? 0) + s.durationSec);
    cells.push({
      day: key,
      date: new Date(cursor),
      totalSec,
      sessionCount: list.length,
      tier: tierFor(totalSec),
      bySubject: [...bucket.entries()]
        .map(([subjectId, sec]) => ({ subjectId, sec }))
        .sort((a, b) => b.sec - a.sec),
      inRange: true,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function tierFor(sec: number): 0 | 1 | 2 | 3 | 4 {
  const h = sec / 3600;
  if (h <= 0) return 0;
  if (h < 1) return 1;
  if (h < 2.5) return 2;
  if (h < 4.5) return 3;
  return 4;
}

/* --------------------------------------------------------------- wave chart */

export interface WavePoint {
  label: string;
  hours: number;
  energy: number;
}

/** Focus energy over the last N weeks or months. */
export function buildWave(sessions: Session[], range: "weekly" | "monthly"): WavePoint[] {
  const focus = sessions.filter((s) => s.mode === "focus");
  const buckets = new Map<string, number>();
  const order: string[] = [];
  const now = new Date();

  const count = range === "weekly" ? 12 : 12;
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (range === "weekly") d.setDate(d.getDate() - i * 7);
    else d.setMonth(d.getMonth() - i);
    const key = range === "weekly" ? weekKey(d) : monthKey(d);
    if (!buckets.has(key)) {
      buckets.set(key, 0);
      order.push(key);
    }
  }

  for (const s of focus) {
    const d = new Date(s.startedAt);
    const key = range === "weekly" ? weekKey(d) : monthKey(d);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + s.durationSec);
  }

  const raw = order.map((key) => ({ key, hours: (buckets.get(key) ?? 0) / 3600 }));
  const peak = Math.max(1, ...raw.map((r) => r.hours));
  return raw.map((r) => ({
    label: labelFor(r.key, range),
    hours: Number(r.hours.toFixed(2)),
    energy: Math.round((r.hours / peak) * 100),
  }));
}

function weekKey(d: Date): string {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return `W${dayKey(c)}`;
}

function monthKey(d: Date): string {
  return `M${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelFor(key: string, range: "weekly" | "monthly"): string {
  if (range === "monthly") {
    const [y, m] = key.slice(1).split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en", { month: "short" });
  }
  const d = new Date(key.slice(1));
  return d.toLocaleDateString("en", { day: "numeric", month: "short" });
}

/* -------------------------------------------------------------- distribution */

export interface DistributionSlice {
  subjectId: string | null;
  name: string;
  sec: number;
  pct: number;
}

export function buildDistribution(sessions: Session[], subjects: Subject[]): DistributionSlice[] {
  const focus = sessions.filter((s) => s.mode === "focus");
  const total = focus.reduce((a, s) => a + s.durationSec, 0);
  const bucket = new Map<string | null, number>();
  for (const s of focus) bucket.set(s.subjectId, (bucket.get(s.subjectId) ?? 0) + s.durationSec);
  return [...bucket.entries()]
    .map(([subjectId, sec]) => ({
      subjectId,
      name: subjects.find((s) => s.id === subjectId)?.name ?? "Unassigned",
      sec,
      pct: total ? Math.round((sec / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.sec - a.sec);
}

/* ---------------------------------------------------------------- biorhythm */

export interface Biorhythm {
  /** 24 buckets of focus minutes by hour of day */
  hours: { hour: number; minutes: number; share: number }[];
  peakHour: number | null;
  troughHour: number | null;
  /** 0..100 how concentrated focus is in a few hours */
  periodicity: number;
}

export function buildBiorhythm(sessions: Session[]): Biorhythm {
  const buckets = Array.from({ length: 24 }, () => 0);
  for (const s of sessions) {
    if (s.mode !== "focus") continue;
    // spread the session across the hours it covers
    let cursor = s.startedAt;
    const end = s.startedAt + s.durationSec * 1000;
    while (cursor < end) {
      const d = new Date(cursor);
      const nextHour = new Date(d);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const slice = Math.min(end, nextHour.getTime()) - cursor;
      buckets[d.getHours()] = (buckets[d.getHours()] ?? 0) + slice / 60000;
      cursor += slice;
    }
  }
  const total = buckets.reduce((a, b) => a + b, 0);
  const hours = buckets.map((minutes, hour) => ({
    hour,
    minutes: Math.round(minutes),
    share: total ? minutes / total : 0,
  }));
  const active = hours.filter((h) => h.minutes > 0);
  const peak = active.length ? active.reduce((a, b) => (b.minutes > a.minutes ? b : a)) : null;
  const trough = active.length ? active.reduce((a, b) => (b.minutes < a.minutes ? b : a)) : null;

  // periodicity = normalized concentration (inverse of entropy)
  let entropy = 0;
  for (const h of hours) if (h.share > 0) entropy -= h.share * Math.log(h.share);
  const maxEntropy = Math.log(24);
  const periodicity = total ? Math.round((1 - entropy / maxEntropy) * 100) : 0;

  return { hours, peakHour: peak?.hour ?? null, troughHour: trough?.hour ?? null, periodicity };
}

/* --------------------------------------------------------------- flow state */

export interface FlowDriver {
  /** 0..100 */
  score: number;
  driver: "duration" | "timeOfDay" | "subject" | "difficulty" | "none";
  detail: string;
  medianMinutes: number;
  longestMinutes: number;
}

export function buildFlowDriver(sessions: Session[], subjects: Subject[]): FlowDriver {
  const focus = sessions.filter((s) => s.mode === "focus" && s.durationSec > 0);
  if (focus.length < 3) {
    return { score: 0, driver: "none", detail: "", medianMinutes: 0, longestMinutes: 0 };
  }
  const mins = focus.map((s) => s.durationSec / 60).sort((a, b) => a - b);
  const median = mins[Math.floor(mins.length / 2)] ?? 0;
  const longest = mins[mins.length - 1] ?? 0;

  // deep sessions = above 75th percentile
  const p75 = mins[Math.floor(mins.length * 0.75)] ?? median;
  const deep = focus.filter((s) => s.durationSec / 60 >= p75);

  const groupBest = <T>(items: T[], key: (t: T) => string) => {
    const m = new Map<string, number>();
    for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1);
    let best = "";
    let n = 0;
    for (const [k, v] of m) if (v > n) [best, n] = [k, v];
    return { best, share: items.length ? n / items.length : 0 };
  };

  const byHour = groupBest(deep, (s) => String(new Date(s.startedAt).getHours()));
  const bySubject = groupBest(deep, (s) => s.subjectId ?? "none");
  const byDiff = groupBest(deep, (s) => String(s.difficulty));

  const candidates = [
    { driver: "timeOfDay" as const, share: byHour.share, value: `${byHour.best}:00` },
    {
      driver: "subject" as const,
      share: bySubject.share,
      value: subjects.find((s) => s.id === bySubject.best)?.name ?? "Unassigned",
    },
    { driver: "difficulty" as const, share: byDiff.share, value: `L${byDiff.best}` },
  ].sort((a, b) => b.share - a.share);

  const top = candidates[0]!;
  return {
    score: Math.round(Math.min(100, (median / 50) * 60 + top.share * 40)),
    driver: top.share > 0.34 ? top.driver : "duration",
    detail: top.value,
    medianMinutes: Math.round(median),
    longestMinutes: Math.round(longest),
  };
}

/* ------------------------------------------------------- cognitive stability */

export interface Stability {
  /** 0..100, higher = more consistent day-to-day focus */
  index: number;
  cv: number;
  activeDays: number;
  averageHours: number;
}

export function buildStability(sessions: Session[], windowDays = 28): Stability {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (windowDays - 1));
  const byDay = new Map<string, number>();
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    byDay.set(dayKey(d), 0);
  }
  for (const s of sessions) {
    if (s.mode !== "focus") continue;
    if (byDay.has(s.day)) byDay.set(s.day, (byDay.get(s.day) ?? 0) + s.durationSec / 3600);
  }
  const values = [...byDay.values()];
  const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length || 1);
  const sd = Math.sqrt(variance);
  const cv = mean > 0 ? sd / mean : 0;
  return {
    index: mean > 0 ? Math.max(0, Math.round((1 - Math.min(1, cv)) * 100)) : 0,
    cv: Math.round(cv * 100) / 100,
    activeDays: values.filter((v) => v > 0).length,
    averageHours: Math.round(mean * 10) / 10,
  };
}

/* ----------------------------------------------------------------- fatigue */

export interface FatigueWarning {
  /** 0..100 risk */
  risk: number;
  level: "low" | "moderate" | "high";
  todayHours: number;
  last3DayHours: number;
  decline: number;
}

export function buildFatigue(sessions: Session[]): FatigueWarning {
  const focus = sessions.filter((s) => s.mode === "focus");
  const today = dayKey();
  const todaySec = focus.filter((s) => s.day === today).reduce((a, s) => a + s.durationSec, 0);

  const dayHours = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const key = dayKey(d);
    return focus.filter((s) => s.day === key).reduce((a, s) => a + s.durationSec, 0) / 3600;
  };
  const last3 = dayHours(0) + dayHours(1) + dayHours(2);

  // within-day decline: average duration of the last third of today's sessions vs the first third
  const todays = focus.filter((s) => s.day === today).sort((a, b) => a.startedAt - b.startedAt);
  let decline = 0;
  if (todays.length >= 3) {
    const k = Math.max(1, Math.floor(todays.length / 3));
    const first = todays.slice(0, k).reduce((a, s) => a + s.durationSec, 0) / k;
    const last = todays.slice(-k).reduce((a, s) => a + s.durationSec, 0) / k;
    decline = first > 0 ? Math.max(0, Math.round(((first - last) / first) * 100)) : 0;
  }

  const risk = Math.min(
    100,
    Math.round((todaySec / 3600 / 6) * 45 + (last3 / 18) * 30 + (decline / 100) * 25),
  );
  return {
    risk,
    level: risk >= 66 ? "high" : risk >= 33 ? "moderate" : "low",
    todayHours: Math.round((todaySec / 3600) * 10) / 10,
    last3DayHours: Math.round(last3 * 10) / 10,
    decline,
  };
}

/* --------------------------------------------------- next task / sequence */

export interface NextTaskPrediction {
  taskId: string | null;
  title: string;
  subjectName: string | null;
  confidence: number;
  reason: "hourAffinity" | "subjectMomentum" | "dueToday" | "queue" | "none";
}

export function predictNextTask(
  tasks: Task[],
  sessions: Session[],
  subjects: Subject[],
  now = new Date(),
): NextTaskPrediction {
  const open = tasks.filter((t) => !t.done);
  if (open.length === 0) {
    return { taskId: null, title: "", subjectName: null, confidence: 0, reason: "none" };
  }
  const focus = sessions.filter((s) => s.mode === "focus");
  const hour = now.getHours();

  // subject affinity for this hour of day
  const hourAffinity = new Map<string, number>();
  for (const s of focus) {
    if (!s.subjectId) continue;
    const h = new Date(s.startedAt).getHours();
    const distance = Math.min(Math.abs(h - hour), 24 - Math.abs(h - hour));
    if (distance <= 1) hourAffinity.set(s.subjectId, (hourAffinity.get(s.subjectId) ?? 0) + 1);
  }
  // recent momentum
  const momentum = new Map<string, number>();
  for (const s of [...focus].sort((a, b) => b.startedAt - a.startedAt).slice(0, 10)) {
    if (s.subjectId) momentum.set(s.subjectId, (momentum.get(s.subjectId) ?? 0) + 1);
  }

  const today = dayKey(now);
  let best = open[0]!;
  let bestScore = -1;
  let reason: NextTaskPrediction["reason"] = "queue";

  for (const task of open) {
    let score = 1;
    let why: NextTaskPrediction["reason"] = "queue";
    if (task.dueDate === today) {
      score += 3;
      why = "dueToday";
    }
    if (task.subjectId) {
      const aff = hourAffinity.get(task.subjectId) ?? 0;
      const mom = momentum.get(task.subjectId) ?? 0;
      if (aff > 0) {
        score += aff * 1.5;
        why = "hourAffinity";
      }
      if (mom > 0) {
        score += mom;
        if (why === "queue") why = "subjectMomentum";
      }
    }
    score -= task.order * 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = task;
      reason = why;
    }
  }

  return {
    taskId: best.id,
    title: best.title,
    subjectName: subjects.find((s) => s.id === best.subjectId)?.name ?? null,
    confidence: Math.min(96, Math.round((bestScore / (bestScore + 3)) * 100)),
    reason,
  };
}

/* ---------------------------------------------------- habit health score */

export interface HabitHealth {
  score: number; // 0..100
  trend: "improving" | "stable" | "declining";
  streakDays: number;
  longTermConsistency: number; // 0..100
}

export function buildHabitHealthScore(sessions: Session[]): HabitHealth {
  const focus = sessions.filter((s) => s.mode === "focus");
  if (focus.length === 0) return { score: 0, trend: "stable", streakDays: 0, longTermConsistency: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate Streak
  let streak = 0;
  const daysWithFocus = new Set(focus.map(s => s.day));
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daysWithFocus.has(dayKey(d))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // Long-term consistency (last 90 days active ratio)
  let active90 = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daysWithFocus.has(dayKey(d))) active90++;
  }
  const longTermConsistency = Math.round((active90 / 90) * 100);

  // Recent trend (last 14 days vs previous 14 days)
  let recent14 = 0;
  let prev14 = 0;
  for (const s of focus) {
    const d = new Date(s.startedAt);
    const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
    if (diff < 14) recent14 += s.durationSec;
    else if (diff < 28) prev14 += s.durationSec;
  }
  
  let trend: HabitHealth["trend"] = "stable";
  if (recent14 > prev14 * 1.1) trend = "improving";
  if (recent14 < prev14 * 0.9) trend = "declining";

  const score = Math.min(100, Math.round((streak * 2) + (longTermConsistency * 0.6) + (trend === "improving" ? 10 : trend === "declining" ? -10 : 0)));
  
  return { score: Math.max(0, score), trend, streakDays: streak, longTermConsistency };
}

/* ---------------------------------------------- task duration estimation */

export interface DurationEstimate {
  estimatedMinutes: number;
  confidence: number; // 0..100
  lowerBound: number;
  upperBound: number;
}

export function estimateTaskDuration(taskId: string, tasks: Task[], sessions: Session[]): DurationEstimate | null {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  const focus = sessions.filter(s => s.mode === "focus" && s.subjectId === task.subjectId);
  if (focus.length < 5) return null; // Need more data for accurate estimation
  
  const durations = focus.map(s => s.durationSec / 60).sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)] ?? 30;
  
  // Calculate standard deviation
  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance = durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  
  const estimated = Math.max(5, Math.round(median));
  const lower = Math.max(5, Math.round(estimated - stdDev));
  const upper = Math.round(estimated + stdDev);
  
  // Confidence based on number of samples and variance
  const confidence = Math.min(95, Math.round(100 - (stdDev / mean) * 50 + Math.min(focus.length, 20)));

  return {
    estimatedMinutes: estimated,
    lowerBound: lower,
    upperBound: upper,
    confidence: Math.max(10, confidence)
  };
}

/* ------------------------------------------ lifestyle correlation matrix */

export interface LifestyleCorrelation {
  factor: string;
  correlation: number; // -100 to 100
  insight: string;
}

export function buildLifestyleCorrelation(sessions: Session[]): LifestyleCorrelation[] {
  const focus = sessions.filter(s => s.mode === "focus");
  if (focus.length < 10) return [];

  const morningSessions = focus.filter(s => new Date(s.startedAt).getHours() < 12);
  const eveningSessions = focus.filter(s => new Date(s.startedAt).getHours() >= 18);
  const weekendSessions = focus.filter(s => {
    const day = new Date(s.startedAt).getDay();
    return day === 0 || day === 6;
  });

  const avgDuration = (arr: Session[]) => arr.length ? arr.reduce((a, s) => a + s.durationSec, 0) / arr.length : 0;
  const overallAvg = avgDuration(focus);

  const morningRatio = avgDuration(morningSessions) / overallAvg;
  const eveningRatio = avgDuration(eveningSessions) / overallAvg;
  const weekendRatio = avgDuration(weekendSessions) / overallAvg;

  const correlations: LifestyleCorrelation[] = [];

  if (morningRatio > 1.1) {
    correlations.push({
      factor: "Early Morning",
      correlation: Math.min(100, Math.round((morningRatio - 1) * 100)),
      insight: "Morning sessions yield longer focus times."
    });
  }
  
  if (eveningRatio < 0.9 && eveningSessions.length > 5) {
    correlations.push({
      factor: "Late Evening",
      correlation: Math.max(-100, Math.round((eveningRatio - 1) * 100)),
      insight: "Evening focus tends to be fragmented."
    });
  }
  
  if (weekendRatio > 1.2) {
    correlations.push({
      factor: "Weekends",
      correlation: Math.min(100, Math.round((weekendRatio - 1) * 100)),
      insight: "Strongest deep work happens on weekends."
    });
  }

  if (correlations.length === 0) {
     correlations.push({
       factor: "Consistent Routine",
       correlation: 85,
       insight: "Your focus quality is resilient across different times."
     });
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

