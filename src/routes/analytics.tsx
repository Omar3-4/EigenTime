import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataGate } from "@/components/data-gate";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { PerformanceWaveChart, SubjectDonutChart } from "@/components/analytics-charts";
import {
  BiorhythmPanel,
  FatiguePanel,
  FlowDriverPanel,
  NextTaskPanel,
  StabilityPanel,
  HabitHealthPanel,
  TaskDurationPanel,
  LifestyleCorrelationPanel,
} from "@/components/behavioral-panels";
import {
  buildBiorhythm,
  buildDistribution,
  buildFatigue,
  buildFlowDriver,
  buildHeatmap,
  buildStability,
  buildWave,
  predictNextTask,
  buildHabitHealthScore,
  estimateTaskDuration,
  buildLifestyleCorrelation,
} from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { allSessions, listSubjects, listTasks } from "@/lib/repo";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Behavioral Analytics — EigenTime" },
      {
        name: "description",
        content:
          "365-day focus heatmap, performance wave chart, subject distribution and predictive models — biorhythm, flow driver, stability index and fatigue warning, all computed on-device.",
      },
      { property: "og:title", content: "Behavioral Analytics — EigenTime" },
      {
        property: "og:description",
        content: "Predictive focus analytics computed entirely on-device from your session log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("analytics")}>
      <DataGate>
        <AnalyticsBody />
      </DataGate>
    </AppShell>
  );
}

function AnalyticsBody() {
  const { t } = useI18n();
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");

  const sessions = useLiveQuery(() => allSessions(), [], []) ?? [];
  const subjects = useLiveQuery(() => listSubjects(), [], []) ?? [];
  const tasks = useLiveQuery(() => listTasks(), [], []) ?? [];

  const weeks = useMemo(() => buildHeatmap(sessions), [sessions]);
  const wave = useMemo(() => buildWave(sessions, range), [sessions, range]);
  const distribution = useMemo(() => buildDistribution(sessions, subjects), [sessions, subjects]);
  const biorhythm = useMemo(() => buildBiorhythm(sessions), [sessions]);
  const flow = useMemo(() => buildFlowDriver(sessions, subjects), [sessions, subjects]);
  const stability = useMemo(() => buildStability(sessions), [sessions]);
  const fatigue = useMemo(() => buildFatigue(sessions), [sessions]);
  const nextTask = useMemo(
    () => predictNextTask(tasks, sessions, subjects),
    [tasks, sessions, subjects],
  );
  const habitHealth = useMemo(() => buildHabitHealthScore(sessions), [sessions]);
  const taskDuration = useMemo(
    () => (nextTask.taskId ? estimateTaskDuration(nextTask.taskId, tasks, sessions) : null),
    [nextTask.taskId, tasks, sessions],
  );
  const lifestyleCorrelation = useMemo(() => buildLifestyleCorrelation(sessions), [sessions]);

  return (
    <div className="space-y-4">
      <section className="glass rounded-2xl p-5">
        <h2 className="text-lg font-semibold">{t("analyticsSoon")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("analyticsIntro")}</p>
      </section>

      <ActivityHeatmap weeks={weeks} subjects={subjects} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PerformanceWaveChart data={wave} range={range} onRangeChange={setRange} />
        <SubjectDonutChart slices={distribution} subjects={subjects} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <BiorhythmPanel data={biorhythm} />
        <FlowDriverPanel data={flow} />
        <StabilityPanel data={stability} />
        <FatiguePanel data={fatigue} />
        <HabitHealthPanel data={habitHealth} />
        <TaskDurationPanel data={taskDuration} taskTitle={nextTask.title} />
        <NextTaskPanel data={nextTask} />
        <div className="lg:col-span-2 2xl:col-span-2">
           <LifestyleCorrelationPanel data={lifestyleCorrelation} />
        </div>
      </div>
    </div>
  );
}
