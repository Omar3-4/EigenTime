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

export type SubjectColor = "focus" | "subject" | "productivity" | "elapsed" | "goal";

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
  countdown: boolean;
  targetSec: number;
  accumulatedSec: number;
  runningSince: number | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export class EigenTimeDB extends Dexie {
  subjects!: Table<Subject, string>;
  sessions!: Table<Session, string>;
  tasks!: Table<Task, string>;
  scheduleBlocks!: Table<ScheduleBlock, string>;
  dailyStats!: Table<DailyStat, string>;
  settings!: Table<SettingsRecord, string>;

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
