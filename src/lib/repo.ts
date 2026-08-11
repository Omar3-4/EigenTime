import {
  getDb,
  uid,
  type DailyStat,
  type ScheduleBlock,
  type Session,
  type SettingsRecord,
  type Subject,
  type SubjectColor,
  type Task,
  type TimerSnapshot,
} from "./db";
import { dayKey, startOfWeek } from "./time";
import { z } from "zod";
import { EigenTimeBackupSchema } from "./backup-schema";

/* ------------------------------------------------------------------ settings */

export async function getSetting<T>(key: string, fallback: T, schema?: z.ZodType<T>): Promise<T> {
  const row = await getDb().settings.get(key);
  if (!row) return fallback;
  if (schema) {
    const res = schema.safeParse(row.value);
    if (!res.success) {
      console.warn(`[getSetting] Schema mismatch for '${key}', using fallback.`, res.error);
      return fallback;
    }
    return res.data;
  }
  return row.value as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await getDb().settings.put({ key, value });
}

export const DEFAULT_DAILY_GOAL_HOURS = 4;

/* ------------------------------------------------------------------ subjects */

export async function listSubjects(): Promise<Subject[]> {
  const all = await getDb().subjects.toArray();
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function createSubject(input: {
  name: string;
  color: SubjectColor;
  weeklyTargetHours: number;
}): Promise<string> {
  const id = uid();
  await getDb().subjects.add({
    id,
    name: input.name.trim(),
    color: input.color,
    weeklyTargetHours: input.weeklyTargetHours,
    archived: 0,
    createdAt: Date.now(),
  });
  return id;
}

export async function updateSubject(id: string, patch: Partial<Subject>): Promise<void> {
  await getDb().subjects.update(id, patch);
}

export async function setSubjectArchived(id: string, archived: boolean): Promise<void> {
  await getDb().subjects.update(id, { archived: archived ? 1 : 0 });
}

export async function deleteSubject(id: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.subjects, db.sessions, db.tasks, async () => {
    await db.subjects.delete(id);
    await db.sessions.where("subjectId").equals(id).modify({ subjectId: null });
    await db.tasks.where("subjectId").equals(id).modify({ subjectId: null });
  });
}

/* ------------------------------------------------------------------ sessions */

export async function saveSession(input: {
  subjectId: string | null;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  mode: "focus" | "rest";
  difficulty: 1 | 2 | 3 | 4 | 5;
  note?: string;
  targetSec?: number;
  pauseCount?: number;
  pauseDurationSec?: number;
  scratchpadNotes?: string[];
}): Promise<void> {
  const db = getDb();

  let fei = 0;
  let xp = 0;

  if (input.mode === "focus") {
    const pauseCount = input.pauseCount ?? 0;
    const pauseDur = input.pauseDurationSec ?? 0;
    const target =
      input.targetSec && input.targetSec > 0 ? input.targetSec : Math.max(input.durationSec, 1);

    // FEI = MAX(0, 100 - (Pause Count × 2) - ((Pause Duration Sec / Target Sec) × 100))
    fei = Math.max(0, 100 - pauseCount * 2 - (pauseDur / target) * 100);

    const diffMultMap: Record<number, number> = { 1: 1.0, 2: 1.2, 3: 1.5, 4: 2.0, 5: 2.5 };
    const diffMult = diffMultMap[input.difficulty] ?? 1.5;

    const durMins = input.durationSec / 60;
    xp = durMins * 10 * diffMult * (fei / 100);
  }

  const session: Session = {
    id: uid(),
    day: dayKey(input.startedAt),
    subjectId: input.subjectId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSec: input.durationSec,
    mode: input.mode,
    difficulty: input.difficulty,
    ...(input.note !== undefined ? { note: input.note } : {}),
    ...(fei > 0 ? { fei } : {}),
    ...(xp > 0 ? { xp } : {}),
    ...(input.pauseCount !== undefined ? { pauseCount: input.pauseCount } : {}),
    ...(input.pauseDurationSec !== undefined ? { pauseDurationSec: input.pauseDurationSec } : {}),
    ...(input.scratchpadNotes !== undefined ? { scratchpadNotes: input.scratchpadNotes } : {}),
  };

  await db.transaction("rw", db.sessions, db.dailyStats, async () => {
    await db.sessions.add(session);
    await rollUpDay(session.day);
  });
}

/** Recomputes the cached daily roll-up so dashboards and analytics stay cheap. */
async function rollUpDay(day: string): Promise<void> {
  const db = getDb();
  const sessions = await db.sessions.where("day").equals(day).toArray();
  const focus = sessions.filter((s) => s.mode === "focus");
  const bySubject = new Map<string, number>();
  for (const s of focus) {
    if (!s.subjectId) continue;
    bySubject.set(s.subjectId, (bySubject.get(s.subjectId) ?? 0) + s.durationSec);
  }
  let topSubjectId: string | null = null;
  let best = 0;
  for (const [id, sec] of bySubject) {
    if (sec > best) {
      best = sec;
      topSubjectId = id;
    }
  }
  const stat: DailyStat = {
    day,
    totalSec: focus.reduce((acc, s) => acc + s.durationSec, 0),
    sessionCount: focus.length,
    topSubjectId,
  };
  await db.dailyStats.put(stat);
}

export async function todayStat(): Promise<DailyStat> {
  const day = dayKey(new Date());
  const row = await getDb().dailyStats.get(day);
  return row ?? { day, totalSec: 0, sessionCount: 0, topSubjectId: null };
}

export async function recentSessions(limit = 8): Promise<Session[]> {
  const all = await getDb().sessions.orderBy("startedAt").reverse().toArray();
  return all.filter((s) => s.durationSec > 0).slice(0, limit);
}

/** Full session log — only used for analytics with a bounded window. */
export async function allSessions(): Promise<Session[]> {
  const all = await getDb().sessions.orderBy("startedAt").toArray();
  return all.filter((s) => s.durationSec > 0);
}

/**
 * Bounded session query for analytics (Bug 3.3 fix).
 * Prevents loading thousands of rows into memory after long-term use.
 */
export async function sessionsInRange(days = 365): Promise<Session[]> {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const cutoffDay = dayKey(d);
  return getDb().sessions.where("day").aboveOrEqual(cutoffDay).sortBy("startedAt");
}

export async function weeklySecondsBySubject(): Promise<Record<string, number>> {
  const from = startOfWeek().getTime();
  const sessions = await getDb().sessions.where("startedAt").aboveOrEqual(from).toArray();
  const out: Record<string, number> = {};
  for (const s of sessions) {
    if (s.mode !== "focus" || !s.subjectId) continue;
    out[s.subjectId] = (out[s.subjectId] ?? 0) + s.durationSec;
  }
  return out;
}

export async function getTotalXP(): Promise<number> {
  const sessions = await getDb().sessions.toArray();
  return sessions.reduce((sum, s) => sum + (s.xp ?? 0), 0);
}

export function getLevelFromXP(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

/* --------------------------------------------------------------------- tasks */

export async function listTasks(): Promise<Task[]> {
  const all = await getDb().tasks.toArray();
  return all.sort((a, b) => a.order - b.order);
}

export async function createTask(input: {
  title: string;
  subjectId: string | null;
  dueDate?: string | null;
  tags?: string[];
}): Promise<void> {
  const count = await getDb().tasks.count();
  await getDb().tasks.add({
    id: uid(),
    title: input.title.trim(),
    subjectId: input.subjectId,
    done: 0,
    dueDate: input.dueDate ?? dayKey(),
    order: count,
    tags: input.tags ?? [],
    createdAt: Date.now(),
    completedAt: null,
  });
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const db = getDb();
  await db.tasks.update(id, { done: done ? 1 : 0, completedAt: done ? Date.now() : null });
  if (done) {
    const upNext = await getSetting("upNextTaskId", null, z.string().nullable());
    if (upNext === id) await setSetting("upNextTaskId", null);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDb();
  await db.tasks.delete(id);
  const upNext = await getSetting("upNextTaskId", null, z.string().nullable());
  if (upNext === id) await setSetting("upNextTaskId", null);
}

/* ------------------------------------------------------------------ schedule */

export async function listBlocksForDay(day = dayKey()): Promise<ScheduleBlock[]> {
  const rows = await getDb().scheduleBlocks.where("date").equals(day).toArray();
  return rows.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function createBlock(input: Omit<ScheduleBlock, "id">): Promise<void> {
  await getDb().scheduleBlocks.add({ id: uid(), ...input });
}

export async function deleteBlock(id: string): Promise<void> {
  await getDb().scheduleBlocks.delete(id);
}

/* --------------------------------------------------------------- timer state */

export const TIMER_KEY = "timerSnapshot";

export async function loadTimer(): Promise<TimerSnapshot | null> {
  const row = await getDb().timerSnapshots.get("current");
  return row ? row.snapshot : null;
}

// ── Debounced persist (Bug 3.7 fix) — avoids concurrent write races ─────────
let _pendingSnap: TimerSnapshot | null = null;
let _debounceId: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounce timer persistence to 1 s intervals.
 * Call this instead of `persistTimer` from the 250 ms tick loop.
 */
export function scheduleTimerPersist(snapshot: TimerSnapshot): void {
  _pendingSnap = snapshot;
  if (_debounceId !== null) clearTimeout(_debounceId);
  _debounceId = setTimeout(() => {
    if (_pendingSnap) {
      const snapToSave = _pendingSnap;
      _pendingSnap = null;
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (
          window as unknown as { requestIdleCallback: (cb: () => void) => void }
        ).requestIdleCallback(() => void persistTimer(snapToSave));
      } else {
        void persistTimer(snapToSave);
      }
    }
    _debounceId = null;
  }, 1000);
}

export async function persistTimer(snapshot: TimerSnapshot | null): Promise<void> {
  if (!snapshot) {
    await getDb().timerSnapshots.delete("current");
  } else {
    await getDb().timerSnapshots.put({ id: "current", snapshot });
  }
}

export async function exportAll(): Promise<string> {
  const db = getDb();
  const payload = {
    app: "EigenTime",
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: await db.subjects.toArray(),
    sessions: await db.sessions.toArray(),
    tasks: await db.tasks.toArray(),
    scheduleBlocks: await db.scheduleBlocks.toArray(),
    settings: await db.settings.toArray(),
  };
  return JSON.stringify(payload, null, 2);
}

export async function exportCsv(): Promise<string> {
  const db = getDb();
  const sessions = await db.sessions.toArray();
  const subjects = await db.subjects.toArray();

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  let csv = "ID,Date,Subject,Mode,Duration (seconds),Difficulty,FEI,XP,Note\n";
  for (const s of sessions) {
    const subName = s.subjectId ? (subjectMap.get(s.subjectId) ?? "Unknown") : "None";
    const date = new Date(s.startedAt).toISOString();
    const note = s.note ? `"${s.note.replace(/"/g, '""')}"` : "";
    csv += `${s.id},${date},${subName},${s.mode},${s.durationSec},${s.difficulty},${s.fei ?? ""},${s.xp ?? ""},${note}\n`;
  }
  return csv;
}

export async function exportMarkdown(): Promise<string> {
  const db = getDb();
  const sessions = await db.sessions.toArray();
  const subjects = await db.subjects.toArray();

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  let md = "# EigenTime Data Export\n\n";

  md += "## Subjects\n\n";
  for (const s of subjects) {
    md += `- **${s.name}** (Target: ${s.weeklyTargetHours}h/week)\n`;
  }

  md += "\n## Sessions\n\n";
  md += "| Date | Subject | Mode | Duration | XP | FEI |\n";
  md += "|---|---|---|---|---|---|\n";

  const recent = sessions.sort((a, b) => b.startedAt - a.startedAt).slice(0, 100);
  for (const s of recent) {
    const subName = s.subjectId ? (subjectMap.get(s.subjectId) ?? "Unknown") : "None";
    const date = new Date(s.startedAt).toLocaleDateString();
    const dur = Math.round(s.durationSec / 60) + "m";
    const xp = s.xp ? s.xp.toFixed(1) : "-";
    const fei = s.fei ? s.fei.toFixed(0) : "-";
    md += `| ${date} | ${subName} | ${s.mode} | ${dur} | ${xp} | ${fei} |\n`;
  }

  if (sessions.length > 100) {
    md += `\n*(Showing last 100 out of ${sessions.length} sessions)*\n`;
  }

  return md;
}

const EXPORT_VERSION = 1;

export async function importAll(json: string): Promise<void> {
  let rawData: unknown;
  try {
    rawData = JSON.parse(json);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }

  // Phase 1: Check version easily
  if (typeof rawData !== "object" || rawData === null) {
    throw new Error("Backup file is malformed.");
  }
  const data = rawData as Record<string, unknown>;

  if (data["app"] !== "EigenTime") {
    throw new Error("Backup does not appear to be an EigenTime export (missing app field).");
  }
  const ver = data["version"] as number | undefined;
  if (!ver || ver > EXPORT_VERSION) {
    throw new Error(
      `Incompatible backup version: expected v${EXPORT_VERSION}, got ${ver ?? "none"}. Please export from a compatible version.`,
    );
  }

  // Phase 2: Strict Data Integrity Check using Zod
  const validationResult = EigenTimeBackupSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error("Zod Validation Error:", validationResult.error);
    const issues = validationResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Data integrity check failed: ${issues}`);
  }

  const validData = validationResult.data;

  const db = getDb();
  await db.transaction(
    "rw",
    [db.subjects, db.sessions, db.tasks, db.scheduleBlocks, db.settings, db.dailyStats],
    async () => {
      await Promise.all([
        db.subjects.clear(),
        db.sessions.clear(),
        db.tasks.clear(),
        db.scheduleBlocks.clear(),
        db.dailyStats.clear(),
      ]);
      if (data["subjects"]) await db.subjects.bulkAdd(data["subjects"] as Subject[]);
      if (data["sessions"]) await db.sessions.bulkAdd(data["sessions"] as Session[]);
      if (data["tasks"]) await db.tasks.bulkAdd(data["tasks"] as Task[]);
      if (data["scheduleBlocks"])
        await db.scheduleBlocks.bulkAdd(data["scheduleBlocks"] as ScheduleBlock[]);
      if (data["settings"]) await db.settings.bulkPut(data["settings"] as SettingsRecord[]);
    },
  );
  const days = new Set<string>(((data["sessions"] ?? []) as Session[]).map((s) => s.day));
  for (const d of days) await rollUpDay(d);
}

export async function resetAll(): Promise<void> {
  const db = getDb();
  await Promise.all([
    db.subjects.clear(),
    db.sessions.clear(),
    db.tasks.clear(),
    db.scheduleBlocks.clear(),
    db.dailyStats.clear(),
    db.settings.clear(),
  ]);
}

/* ---------------------------------------------------------------- first run */

const SEEDED_KEY = "seeded";

export async function ensureSeeded(): Promise<void> {
  const db = getDb();
  const seeded = await getSetting(SEEDED_KEY, false);
  if (seeded) return;

  await setSetting(SEEDED_KEY, true);
}
