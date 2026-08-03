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
  sessionsInRange,
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
            <SessionHistory />
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
    useLiveQuery(
      () => getSetting("dailyGoalHours", DEFAULT_DAILY_GOAL_HOURS, z.number()),
      [],
      null,
    ) ?? DEFAULT_DAILY_GOAL_HOURS;

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
                onClick={() => {
                  toggleTask(task.id, !task.done).catch(console.error);
                }}
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

function SessionHistory() {
  const { t, lang } = useI18n();
  const sessions = useLiveQuery(
    async () => {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const all = await sessionsInRange(1);
      return all.filter((s) => s.startedAt >= from.getTime());
    },
    [],
    [],
  );
  const subjects = useLiveQuery(() => listSubjects(), [], []);

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-base font-semibold">{t("timer")}</h2>
      <ul className="space-y-3">
        {(sessions ?? []).reverse().map((s) => {
          const subject = subjects?.find((sub) => sub.id === s.subjectId);
          const locale = lang === "ar" ? "ar-EG" : "en-US";
          const startTime = new Date(s.startedAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          });
          const endTime = new Date(s.endedAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          });
          const durationMins = Math.round(s.durationSec / 60);
          const durationHours = (s.durationSec / 3600).toFixed(2);

          return (
            <li key={s.id} className="flex flex-col gap-1 rounded-xl bg-secondary/50 p-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">
                  {subject ? subject.name : "Uncategorized"}
                  {s.topic ? (
                    <span className="text-muted-foreground ml-2 font-normal truncate max-w-[150px] inline-block align-bottom">
                      - {s.topic}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {startTime} - {endTime}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-muted-foreground flex gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full",
                      s.mode === "focus"
                        ? "bg-focus-soft text-focus-foreground"
                        : "bg-emerald-500/10 text-emerald-500",
                    )}
                  >
                    {s.mode === "focus" ? "Focus" : "Break"}
                  </span>
                </span>
                <span className="font-bold text-[var(--focus)]">
                  {durationMins}m <span className="opacity-70 font-normal">({durationHours}h)</span>
                </span>
              </div>
            </li>
          );
        })}
        {(sessions ?? []).length === 0 && (
          <li className="px-3 py-6 text-sm text-muted-foreground">{t("noneYet")}</li>
        )}
      </ul>
    </section>
  );
}
