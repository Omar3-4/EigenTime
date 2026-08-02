import {
  getDb,
  uid,
  type DailyStat,
  type ScheduleBlock,
  type Session,
  type Subject,
  type SubjectColor,
  type Task,
  type TimerSnapshot,
} from "./db";
import { dayKey, startOfWeek } from "./time";

/* ------------------------------------------------------------------ settings */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await getDb().settings.get(key);
  return row ? (row.value as T) : fallback;
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
}): Promise<void> {
  const db = getDb();
  const session: Session = { id: uid(), day: dayKey(input.startedAt), ...input };
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
  const day = dayKey();
  const row = await getDb().dailyStats.get(day);
  return row ?? { day, totalSec: 0, sessionCount: 0, topSubjectId: null };
}

export async function recentSessions(limit = 8): Promise<Session[]> {
  const all = await getDb().sessions.orderBy("startedAt").reverse().limit(limit).toArray();
  return all;
}

/** Full session log — analytics models run over the whole local history. */
export async function allSessions(): Promise<Session[]> {
  return getDb().sessions.orderBy("startedAt").toArray();
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
  await getDb().tasks.update(id, { done: done ? 1 : 0, completedAt: done ? Date.now() : null });
}

export async function deleteTask(id: string): Promise<void> {
  await getDb().tasks.delete(id);
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
  return getSetting<TimerSnapshot | null>(TIMER_KEY, null);
}

export async function persistTimer(snapshot: TimerSnapshot | null): Promise<void> {
  await setSetting(TIMER_KEY, snapshot);
}

/* ------------------------------------------------------------ export /import */

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

export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json);
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
      if (data.subjects) await db.subjects.bulkAdd(data.subjects);
      if (data.sessions) await db.sessions.bulkAdd(data.sessions);
      if (data.tasks) await db.tasks.bulkAdd(data.tasks);
      if (data.scheduleBlocks) await db.scheduleBlocks.bulkAdd(data.scheduleBlocks);
      if (data.settings) await db.settings.bulkPut(data.settings);
    },
  );
  const days = new Set<string>((data.sessions ?? []).map((s: Session) => s.day));
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

  const palette: SubjectColor[] = ["subject", "focus", "elapsed", "productivity"];
  const names = ["Linear Algebra", "Signals & Systems", "Thesis Writing", "Language Practice"];
  const targets = [8, 6, 5, 3];
  const ids: string[] = [];
  for (let i = 0; i < names.length; i++) {
    ids.push(
      await createSubject({
        name: names[i]!,
        color: palette[i]!,
        weeklyTargetHours: targets[i]!,
      }),
    );
  }

  await createTask({ title: "Review eigenvalue decomposition", subjectId: ids[0]!, tags: ["theory"] });
  await createTask({ title: "Solve problem set 4", subjectId: ids[0]!, tags: ["practice"] });
  await createTask({ title: "Fourier transform notes", subjectId: ids[1]!, tags: ["notes"] });
  await createTask({ title: "Draft chapter 2 outline", subjectId: ids[2]!, tags: ["writing"] });

  const today = dayKey();
  await createBlock({ title: "Morning deep work", subjectId: ids[0]!, startTime: "08:00", endTime: "10:00", date: today });
  await createBlock({ title: "Problem session", subjectId: ids[1]!, startTime: "11:00", endTime: "12:30", date: today });
  await createBlock({ title: "Thesis writing", subjectId: ids[2]!, startTime: "15:00", endTime: "17:00", date: today });
  await createBlock({ title: "Language review", subjectId: ids[3]!, startTime: "20:00", endTime: "20:45", date: today });

  await setSetting(SEEDED_KEY, true);
}
