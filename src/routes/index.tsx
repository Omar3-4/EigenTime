import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useLiveQuery } from "dexie-react-hooks";
import { getTotalXP, getLevelFromXP } from "../lib/repo";
import {
  ArrowUpCircle,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Layers,
  Star,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataGate } from "@/components/data-gate";
import type { DailyStat } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_DAILY_GOAL_HOURS,
  getSetting,
  setSetting,
  listSubjects,
  listTasks,
  recentSessions,
  sessionsInRange,
  todayStat,
  toggleTask,
} from "@/lib/repo";
import { predictNextTask, buildHabitHealthScore } from "@/lib/analytics";
import { NextTaskPanel, HabitHealthPanel } from "@/components/behavioral-panels";
import { formatHoursShort } from "@/lib/time";
import { subjectColorVar, subjectSoftVar } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EigenTime — Offline Focus Dashboard" },
      { name: "description", content: "EigenTime dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useI18n();
  const stat = useLiveQuery(() => todayStat(), [], null);
  const goalHours =
    useLiveQuery(
      () => getSetting("dailyGoalHours", DEFAULT_DAILY_GOAL_HOURS, z.number()),
      [],
      null,
    ) ?? DEFAULT_DAILY_GOAL_HOURS;
  const pct = Math.min(100, Math.round(((stat?.totalSec ?? 0) / (goalHours * 3600)) * 100));
  const totalXP = useLiveQuery(() => getTotalXP(), [], 0) ?? 0;
  const level = getLevelFromXP(totalXP);

  return (
    <AppShell title={t("dashboard")}>
      <DataGate>
        <div className="space-y-6">
          <GreetingHeader pct={pct} level={level} />
          <MetricsBar stat={stat} goalHours={goalHours} pct={pct} />
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Checklist />
            <div className="space-y-4">
              <LastSession />
            </div>
          </div>
        </div>
      </DataGate>
    </AppShell>
  );
}

function GreetingHeader({ pct, level }: { pct: number; level: number }) {
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  const intensity = Math.max(0.2, pct / 100);
  const orbStyle = {
    background: `radial-gradient(circle at 30% 30%, var(--focus) 0%, transparent 70%)`,
    opacity: intensity,
    animationDuration: `${3 / intensity}s`,
  };

  return (
    <div className="glass flex items-center gap-5 p-6 transition-all duration-300 ease-out hover:shadow-md sm:p-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{greeting}.</h1>
          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Lvl {level}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {pct >= 100
            ? "You've crushed your daily goal!"
            : `You are at ${pct}% of your daily focus goal.`}
        </p>
      </div>
    </div>
  );
}

function BurnRing({ pct, color }: { pct: number; color: string }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative size-14 shrink-0 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 60 60">
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-secondary"
        />
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out drop-shadow-md"
        />
      </svg>
      <span className="relative text-[11px] font-bold">{pct}%</span>
    </div>
  );
}

function MetricsBar({
  stat,
  goalHours,
  pct,
}: {
  stat: DailyStat | null;
  goalHours: number;
  pct: number;
}) {
  const { t } = useI18n();
  const subjects = useLiveQuery(() => listSubjects(), [], []);
  const top = subjects?.find((s) => s.id === stat?.topSubjectId);

  const cards = [
    {
      label: t("totalFocused"),
      value: formatHoursShort(stat?.totalSec ?? 0),
      tone: "elapsed" as const,
    },
    {
      label: t("todaySessions"),
      value: String(stat?.sessionCount ?? 0),
      tone: "focus" as const,
    },
    {
      label: t("topSubject"),
      value: top?.name ?? "—",
      tone: "subject" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="glass flex flex-col justify-between gap-4 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01]"
        >
          <header className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="truncate text-sm font-semibold tracking-tight uppercase text-muted-foreground">
              {c.label}
            </h3>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: subjectColorVar[c.tone] }}
              aria-hidden="true"
            />
          </header>
          <p className="font-display text-4xl font-semibold tabular-nums tracking-tight">
            {c.value}
          </p>
        </div>
      ))}

      {/* Burn Ring Card */}
      <div className="glass flex flex-col justify-between gap-4 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01]">
        <header className="flex items-center justify-between border-b border-border/50 pb-3">
          <h3 className="truncate text-sm font-semibold tracking-tight uppercase text-muted-foreground">
            {t("completionRate")}
          </h3>
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: "var(--productivity)" }}
            aria-hidden="true"
          />
        </header>
        <div className="flex items-center justify-between">
          <p className="font-display text-3xl font-semibold tabular-nums tracking-tight">
            {formatHoursShort(goalHours * 3600)} Goal
          </p>
          <BurnRing pct={pct} color="var(--productivity)" />
        </div>
      </div>
    </div>
  );
}

function Checklist() {
  const { t } = useI18n();
  const tasks = useLiveQuery(() => listTasks(), [], []);
  const subjects = useLiveQuery(() => listSubjects(), [], []);
  const upNextTaskId = useLiveQuery(
    () => getSetting("upNextTaskId", null, z.string().nullable()),
    [],
    null,
  );

  const setUpNext = async (id: string | null) => {
    await setSetting("upNextTaskId", id);
  };

  return (
    <section className="glass rounded-2xl p-6 sm:p-8 flex flex-col transition-all duration-300 ease-out hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">{t("todayChecklist")}</h2>
        <span className="text-xs font-medium text-focus bg-focus-soft px-2 py-1 rounded-md">
          Queue
        </span>
      </div>

      <ul className="space-y-2 flex-1">
        {(tasks ?? []).slice(0, 8).map((task) => {
          const subject = subjects?.find((s) => s.id === task.subjectId);
          const isUpNext = upNextTaskId === task.id;

          return (
            <li key={task.id} className="group flex gap-2">
              <button
                type="button"
                onClick={() => {
                  toggleTask(task.id, !task.done).catch(console.error);
                }}
                className={cn(
                  "flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-secondary border",
                  isUpNext ? "border-focus/30 bg-focus-soft/50 shadow-sm" : "border-transparent",
                )}
              >
                {task.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-goal" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    task.done && "text-muted-foreground line-through",
                    isUpNext && !task.done && "font-medium text-foreground",
                  )}
                >
                  {task.title}
                </span>
                {subject && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: subjectSoftVar[subject.color],
                      color: subjectColorVar[subject.color],
                    }}
                  >
                    {subject.name}
                  </span>
                )}
              </button>

              {!task.done && (
                <button
                  onClick={() => setUpNext(isUpNext ? null : task.id)}
                  title={isUpNext ? "Remove from Up Next" : "Set as Up Next"}
                  className={cn(
                    "flex items-center justify-center shrink-0 w-10 rounded-xl transition-all border",
                    isUpNext
                      ? "bg-focus text-focus-foreground border-transparent shadow-md"
                      : "bg-transparent text-muted-foreground border-border hover:bg-secondary hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100",
                  )}
                >
                  <ArrowUpCircle className="size-4" />
                </button>
              )}
            </li>
          );
        })}
        {(tasks ?? []).length === 0 && (
          <li className="px-3 py-6 text-sm text-muted-foreground">{t("noneYet")}</li>
        )}
      </ul>
    </section>
  );
}

function LastSession() {
  const { t, lang } = useI18n();
  const sessions = useLiveQuery(() => recentSessions(1), [], []);
  const subjects = useLiveQuery(() => listSubjects(), [], []);
  const last = sessions?.[0];

  if (!last) return null;

  const subject = subjects?.find((x) => x.id === last.subjectId);

  return (
    <section className="glass rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md">
      <h2 className="mb-4 text-base font-semibold">Last Session</h2>
      <div className="flex items-center gap-3 py-3 rounded-lg px-2 -mx-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: subject ? subjectColorVar[subject.color] : "var(--focus)" }}
        />
        <span className="min-w-0 flex-1 truncate text-sm">{subject?.name ?? t("noSubject")}</span>
        <span className="tabular shrink-0 text-sm font-semibold">
          {formatHoursShort(last.durationSec)}
        </span>
        <span className="tabular shrink-0 text-xs text-muted-foreground">
          {new Date(last.startedAt).toLocaleTimeString(lang === "ar" ? "ar" : "en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </section>
  );
}

function DashboardInsights() {
  const data = useLiveQuery(
    async () => {
      const [sess, subj, tsk] = await Promise.all([
        sessionsInRange(90),
        listSubjects(),
        listTasks(),
      ]);
      return { sessions: sess, subjects: subj, tasks: tsk };
    },
    [],
    { sessions: [], subjects: [], tasks: [] },
  );

  const { sessions, subjects, tasks } = data;

  const nextTask = predictNextTask(tasks, sessions, subjects);
  const habitHealth = buildHabitHealthScore(sessions);

  return (
    <div className="flex flex-col gap-4">
      <NextTaskPanel data={nextTask} />
      <HabitHealthPanel data={habitHealth} />
    </div>
  );
}
