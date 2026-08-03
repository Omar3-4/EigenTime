import { z } from "zod";

const UUIDSchema = z.string().min(1); // Usually a proper UUID or custom string ID

export const SubjectSchema = z
  .object({
    id: UUIDSchema,
    name: z.string(),
    nameAr: z.string().optional(),
    color: z.string(),
    weeklyTargetHours: z.number().nonnegative(),
    archived: z.union([z.literal(0), z.literal(1)]),
    createdAt: z.number(),
  })
  .strict();

export const SessionSchema = z
  .object({
    id: UUIDSchema,
    subjectId: UUIDSchema.nullable(),
    startedAt: z.number(),
    endedAt: z.number(),
    durationSec: z.number().nonnegative(),
    mode: z.union([z.literal("focus"), z.literal("rest")]),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    note: z.string().optional(),
    day: z.string(),
    xp: z.number().optional(),
    fei: z.number().optional(),
    pauseCount: z.number().optional(),
    pauseDurationSec: z.number().optional(),
    scratchpadNotes: z.array(z.string()).optional(),
  })
  .strict();

export const TaskSchema = z
  .object({
    id: UUIDSchema,
    title: z.string(),
    subjectId: UUIDSchema.nullable(),
    done: z.union([z.literal(0), z.literal(1)]),
    dueDate: z.string().nullable(),
    order: z.number(),
    tags: z.array(z.string()),
    createdAt: z.number(),
    completedAt: z.number().nullable(),
  })
  .strict();

export const ScheduleBlockSchema = z
  .object({
    id: UUIDSchema,
    title: z.string(),
    subjectId: UUIDSchema.nullable(),
    startTime: z.string(),
    endTime: z.string(),
    date: z.string(),
  })
  .strict();

export const SettingsRecordSchema = z
  .object({
    key: z.string(),
    value: z.unknown(),
  })
  .strict();

export const EigenTimeBackupSchema = z
  .object({
    app: z.literal("EigenTime"),
    version: z.number().positive(),
    exportedAt: z.string(),
    subjects: z.array(SubjectSchema),
    sessions: z.array(SessionSchema),
    tasks: z.array(TaskSchema),
    scheduleBlocks: z.array(ScheduleBlockSchema),
    settings: z.array(SettingsRecordSchema),
  })
  .strict();
