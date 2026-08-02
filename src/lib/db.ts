import Dexie, { type Table } from "dexie";

export type UUID = string;

export interface Subject {
  id: UUID;
  name: string;
  nameAr?: string;
  color: SubjectColor;
  weeklyTargetHours: number;
  archived: 0 | 1;
  createdAt: number;
}

export type SubjectColor = "focus" | "subject" | "productivity" | "elapsed" | "goal" | string;

export interface Session {
  id: UUID;
  subjectId: UUID | null;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  mode: "focus" | "rest";
  difficulty: 1 | 2 | 3 | 4 | 5;
  note?: string;
  /** yyyy-mm-dd local day key, indexed for fast day roll-ups */
  day: string;
  // Expansion fields:
  xp?: number;
  fei?: number;
  pauseCount?: number;
  pauseDurationSec?: number;
  scratchpadNotes?: string[];
}

export interface Task {
  id: UUID;
  title: string;
  subjectId: UUID | null;
  done: 0 | 1;
  dueDate: string | null;
  order: number;
  tags: string[];
  createdAt: number;
  completedAt: number | null;
}

export interface ScheduleBlock {
  id: UUID;
  title: string;
  subjectId: UUID | null;
  /** HH:MM 24h */
  startTime: string;
  endTime: string;
  /** yyyy-mm-dd */
  date: string;
}

export interface DailyStat {
  day: string;
  totalSec: number;
  sessionCount: number;
  topSubjectId: UUID | null;
}

export interface TimerSnapshot {
  subjectId: UUID | null;
  targetSec: number;
  accumulatedSec: number;
  runningSince: number | null;
  difficulty: 1 | 2 | 3 | 4 | 5;

  /**
   * Wall-clock epoch ms of the very first "start" press in this session.
   * Survives pause/resume cycles — used by finish() to compute accurate
   * session startedAt without assuming a contiguous block of time.
   */
  overallStartedAt?: number | null;

  // ── Pomodoro / mode extension ────────────────────────────────────────────
  /** "stopwatch" (default) or "pomodoro" */
  mode?: "stopwatch" | "pomodoro";
  /** Focus phase duration in seconds */
  pomoFocusSec?: number;
  /** Break phase duration in seconds */
  pomoBreakSec?: number;
  /** Total rounds per cycle (default 4) */
  pomoRounds?: number;
  /** Current round number (1-based) */
  pomoCurrentRound?: number;
  /** Current phase */
  pomoPhase?: "focus" | "break" | "completed";
  /** Accumulated FOCUS seconds from completed pomo rounds */
  pomoAccumulatedFocusSec?: number;

  // Expansion fields:
  playlist?: { 
    subjectId: string | null; 
    mode: "stopwatch" | "pomodoro"; 
    pomoFocusSec?: number; 
    pomoBreakSec?: number; 
    pomoRounds?: number;
    targetSec?: number;
  }[];
  playlistIndex?: number;
  scratchpadNotes?: string[];
  pauseCount?: number;
  pauseDurationSec?: number;
  /** Epoch MS of the exact moment this session was paused, to compute duration on resume. */
  pausedAt?: number | null;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export interface TimerSnapshotRecord {
  id: "current";
  snapshot: TimerSnapshot;
}

export class EigenTimeDB extends Dexie {
  subjects!: Table<Subject, string>;
  sessions!: Table<Session, string>;
  tasks!: Table<Task, string>;
  scheduleBlocks!: Table<ScheduleBlock, string>;
  dailyStats!: Table<DailyStat, string>;
  settings!: Table<SettingsRecord, string>;
  timerSnapshots!: Table<TimerSnapshotRecord, string>;

  constructor() {
    super("eigentime");
    this.version(1).stores({
      subjects: "id, name, archived, createdAt",
      sessions: "id, subjectId, day, startedAt, mode",
      tasks: "id, subjectId, done, dueDate, order",
      scheduleBlocks: "id, date, subjectId",
      dailyStats: "day",
      settings: "key",
    });
    this.version(2).stores({
      timerSnapshots: "id",
    }).upgrade(async (tx) => {
      try {
        const old = await tx.table("settings").get("timerSnapshot");
        if (old && old.value) {
          await tx.table("timerSnapshots").put({ id: "current", snapshot: old.value });
        }
      } catch (e) {
        console.warn("Migration v2 failed:", e);
      }
    });
    this.version(3).stores({});
    this.version(4).stores({});
  }
}

let instance: EigenTimeDB | null = null;

/** Dexie must only be instantiated in the browser — IndexedDB does not exist during SSR. */
export function getDb(): EigenTimeDB {
  if (typeof indexedDB === "undefined") {
    throw new Error("EigenTime database is only available in the browser.");
  }
  if (!instance) instance = new EigenTimeDB();
  return instance;
}

export function uid(): UUID {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
