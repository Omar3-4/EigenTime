import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { ArcTimer } from "@/components/arc-timer";
import { DataGate } from "@/components/data-gate";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, Circle, Clock, Flame, Layers, TrendingUp } from "lucide-react";
import {
  DEFAULT_DAILY_GOAL_HOURS,
  getSetting,
  listBlocksForDay,
  listSubjects,
  listTasks,
  todayStat,
  toggleTask,
} from "@/lib/repo";
import { formatHoursShort, minutesFromHM, nowMinutes } from "@/lib/time";
import { getSubjectColor, getSubjectSoftColor } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timer")({
  head: () => ({
    meta: [
      { title: "Chronograph Timer — EigenTime" },
      {
        name: "description",
        content:
          "Arc ring chronograph with count-up and countdown modes, quick metrics bar, task checklist, schedule timeline, and subject tagging.",
      },
      { property: "og:title", content: "Chronograph Timer — EigenTime" },
      {
        property: "og:description",
        content: "Precision arc ring focus timer with daily schedule and task checklist.",
      },
    ],
  }),
  component: TimerPage,
});

function TimerPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("timer")}>
      <DataGate>
        <div className="space-y-6">
          <QuickMetricsOverview />
          <ArcTimer />
          <div className="grid gap-6 xl:grid-cols-2">
            <TimerChecklist />
            <TimerScheduleTimeline />
          </div>
        </div>
      </DataGate>
    </AppShell>
  );
}

function QuickMetricsOverview() {
  const { t } = useI18n();
  const stat = useLiveQuery(() => todayStat(), [], null);
  const subjects = useLiveQuery(() => listSubjects(), [], []);
  const goalHours =
    useLiveQuery(() => getSetting("dailyGoalHours", DEFAULT_DAILY_GOAL_HOURS, z.number()), [], null) ??
    DEFAULT_DAILY_GOAL_HOURS;

  const top = subjects?.find((s) => s.id === stat?.topSubjectId);
  const pct = Math.min(100, Math.round(((stat?.totalSec ?? 0) / (goalHours * 3600)) * 100));

  const cards = [
    {
      label: t("totalFocused"),
      value: formatHoursShort(stat?.totalSec ?? 0),
      icon: Clock,
      color: "elapsed",
    },
    {
      label: t("todaySessions"),
      value: String(stat?.sessionCount ?? 0),
      icon: Flame,
      color: "focus",
    },
    {
      label: t("topSubject"),
      value: top?.name ?? "—",
      icon: Layers,
      color: "subject",
    },
    {
      label: t("completionRate"),
      value: `${pct}%`,
      icon: TrendingUp,
      color: "productivity",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const mainColor = getSubjectColor(c.color);
        const softColor = getSubjectSoftColor(c.color);
        return (
          <div key={c.label} className="glass rounded-2xl p-4 transition-all hover:scale-[1.01]">
            <div className="flex items-center gap-3">
              <span
                className="flex size-10 items-center justify-center rounded-xl shadow-sm"
                style={{ background: softColor, color: mainColor }}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">{c.label}</p>
                <p className="tabular truncate font-display text-xl font-semibold">{c.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimerChecklist() {
  const { t } = useI18n();
  const tasks = useLiveQuery(() => listTasks(), [], []);
  const subjects = useLiveQuery(() => listSubjects(), [], []);

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-base font-semibold">{t("todayChecklist")}</h2>
      <ul className="space-y-2">
        {(tasks ?? []).slice(0, 6).map((task) => {
          const subject = subjects?.find((s) => s.id === task.subjectId);
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => { toggleTask(task.id, !task.done).catch(console.error); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-secondary"
              >
                {task.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    task.done && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </span>
                {subject && (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: getSubjectSoftColor(subject.color),
                      color: getSubjectColor(subject.color),
                    }}
                  >
                    {subject.name}
                  </span>
                )}
              </button>
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

function TimerScheduleTimeline() {
  const { t } = useI18n();
  const blocks = useLiveQuery(() => listBlocksForDay(), [], []);
  const subjects = useLiveQuery(() => listSubjects(), [], []);
  const current = nowMinutes();

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-base font-semibold">{t("schedule")}</h2>
      <ol className="relative space-y-1 ps-6">
        <span className="absolute inset-y-2 start-[7px] w-px bg-border" aria-hidden />
        {(blocks ?? []).map((b) => {
          const subject = subjects?.find((s) => s.id === b.subjectId);
          const start = minutesFromHM(b.startTime);
          const end = minutesFromHM(b.endTime);
          const state = current >= end ? "past" : current >= start ? "active" : "upcoming";
          const color = subject ? getSubjectColor(subject.color) : "var(--focus)";
          return (
            <li key={b.id} className="relative py-2">
              <span
                className="absolute -start-6 top-3.5 size-3.5 rounded-full border-2 border-card"
                style={{
                  background: state === "upcoming" ? "var(--border)" : color,
                  opacity: state === "past" ? 0.45 : 1,
                }}
                aria-hidden
              />
              <div
                className={cn(
                  "rounded-xl px-3 py-2 transition-colors",
                  state === "active" && "bg-cyan-500/10 border border-cyan-500/30",
                  state === "past" && "opacity-60",
                )}
              >
                <p className="text-sm font-medium">{b.title}</p>
                <p className="tabular text-xs text-muted-foreground">
                  {b.startTime} – {b.endTime}
                  {subject ? ` · ${subject.name}` : ""}
                </p>
              </div>
            </li>
          );
        })}
        {(blocks ?? []).length === 0 && (
          <li className="py-6 text-sm text-muted-foreground">{t("noneYet")}</li>
        )}
      </ol>
    </section>
  );
}
