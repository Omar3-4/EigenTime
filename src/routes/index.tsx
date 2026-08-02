import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, Circle, Clock, Flame, Layers, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataGate } from "@/components/data-gate";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_DAILY_GOAL_HOURS,
  getSetting,
  listBlocksForDay,
  listSubjects,
  listTasks,
  recentSessions,
  todayStat,
  toggleTask,
} from "@/lib/repo";
import { formatHoursShort, minutesFromHM, nowMinutes } from "@/lib/time";
import { subjectColorVar, subjectSoftVar } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EigenTime — Offline Focus Dashboard" },
      {
        name: "description",
        content:
          "EigenTime is an offline-first focus tracker: chronograph timer, subject allocation, daily checklist and schedule, stored entirely on your device.",
      },
      { property: "og:title", content: "EigenTime — Offline Focus Dashboard" },
      {
        property: "og:description",
        content:
          "Track deep work with a chronograph timer, subject targets and a private local database. No account, no internet.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("dashboard")}>
      <DataGate>
        <div className="space-y-4">
          <MetricsBar />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Checklist />
            <Timeline />
          </div>
          <ActivityFeed />
        </div>
      </DataGate>
    </AppShell>
  );
}

function MetricsBar() {
  const { t } = useI18n();
  const stat = useLiveQuery(() => todayStat(), [], null);
  const subjects = useLiveQuery(() => listSubjects(), [], []);
  const goalHours =
    useLiveQuery(() => getSetting("dailyGoalHours", DEFAULT_DAILY_GOAL_HOURS), [], null) ??
    DEFAULT_DAILY_GOAL_HOURS;

  const top = subjects?.find((s) => s.id === stat?.topSubjectId);
  const pct = Math.min(100, Math.round(((stat?.totalSec ?? 0) / (goalHours * 3600)) * 100));

  const cards = [
    {
      label: t("totalFocused"),
      value: formatHoursShort(stat?.totalSec ?? 0),
      icon: Clock,
      tone: "elapsed" as const,
    },
    {
      label: t("todaySessions"),
      value: String(stat?.sessionCount ?? 0),
      icon: Flame,
      tone: "focus" as const,
    },
    {
      label: t("topSubject"),
      value: top?.name ?? "—",
      icon: Layers,
      tone: "subject" as const,
    },
    {
      label: t("completionRate"),
      value: `${pct}%`,
      icon: TrendingUp,
      tone: "productivity" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span
                className="flex size-10 items-center justify-center rounded-xl"
                style={{ background: subjectSoftVar[c.tone], color: subjectColorVar[c.tone] }}
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

function Checklist() {
  const { t } = useI18n();
  const tasks = useLiveQuery(() => listTasks(), [], []);
  const subjects = useLiveQuery(() => listSubjects(), [], []);

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-base font-semibold">{t("todayChecklist")}</h2>
      <ul className="space-y-2">
        {(tasks ?? []).slice(0, 8).map((task) => {
          const subject = subjects?.find((s) => s.id === task.subjectId);
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => void toggleTask(task.id, !task.done)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-secondary"
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

function Timeline() {
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
          const color = subject ? subjectColorVar[subject.color] : "var(--focus)";
          return (
            <li key={b.id} className="relative py-2.5">
              <span
                className="absolute -start-6 top-4 size-3.5 rounded-full border-2 border-card"
                style={{
                  background: state === "upcoming" ? "var(--border)" : color,
                  opacity: state === "past" ? 0.45 : 1,
                }}
                aria-hidden
              />
              <div
                className={cn(
                  "rounded-xl px-3 py-2",
                  state === "active" && "bg-focus-soft",
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

function ActivityFeed() {
  const { t, lang } = useI18n();
  const sessions = useLiveQuery(() => recentSessions(6), [], []);
  const subjects = useLiveQuery(() => listSubjects(), [], []);

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-base font-semibold">{t("activity")}</h2>
      <ul className="divide-y divide-border">
        {(sessions ?? []).map((s) => {
          const subject = subjects?.find((x) => x.id === s.subjectId);
          return (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: subject ? subjectColorVar[subject.color] : "var(--focus)" }}
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {subject?.name ?? t("noSubject")}
              </span>
              <span className="tabular shrink-0 text-sm font-semibold">
                {formatHoursShort(s.durationSec)}
              </span>
              <span className="tabular shrink-0 text-xs text-muted-foreground">
                {new Date(s.startedAt).toLocaleTimeString(lang === "ar" ? "ar" : "en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          );
        })}
        {(sessions ?? []).length === 0 && (
          <li className="py-6 text-sm text-muted-foreground">{t("noneYet")}</li>
        )}
      </ul>
    </section>
  );
}
