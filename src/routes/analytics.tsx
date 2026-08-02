import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataGate } from "@/components/data-gate";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { PerformanceWaveChart, SubjectDistributionChart } from "@/components/analytics-charts";
import {
  BiorhythmPanel,
  FlowDriverPanel,
  StabilityPanel,
  TaskDurationPanel,
} from "@/components/behavioral-panels";
import {
  buildBiorhythm,
  buildDistribution,
  buildFlowDriver,
  buildStability,
  buildWave,
  predictNextTask,
  estimateTaskDuration,
} from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { sessionsInRange, listSubjects, listTasks } from "@/lib/repo";

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

  const data = useLiveQuery(
    async () => {
      const [sess, subj, tsk] = await Promise.all([
        sessionsInRange(365),
        listSubjects(),
        listTasks(),
      ]);
      return { sessions: sess, subjects: subj, tasks: tsk };
    },
    [],
    { sessions: [], subjects: [], tasks: [] }
  );

  const { sessions, subjects, tasks } = data;

  const wave = useMemo(() => buildWave(sessions, range), [sessions, range]);
  const distribution = useMemo(() => buildDistribution(sessions, subjects), [sessions, subjects]);
  const biorhythm = useMemo(() => buildBiorhythm(sessions), [sessions]);
  const flow = useMemo(() => buildFlowDriver(sessions, subjects), [sessions, subjects]);
  const stability = useMemo(() => buildStability(sessions), [sessions]);
  
  // Keep nextTask strictly for taskDuration estimator
  const nextTask = useMemo(
    () => predictNextTask(tasks, sessions, subjects),
    [tasks, sessions, subjects],
  );
  const taskDuration = useMemo(
    () => (nextTask.taskId ? estimateTaskDuration(nextTask.taskId, tasks, sessions) : null),
    [nextTask.taskId, tasks, sessions],
  );

  return (
    <div className="space-y-4">

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PerformanceWaveChart data={wave} range={range} onRangeChange={setRange} />
        <SubjectDistributionChart slices={distribution} subjects={subjects} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <BiorhythmPanel data={biorhythm} />
        <FlowDriverPanel data={flow} />
        <StabilityPanel data={stability} />
        <TaskDurationPanel data={taskDuration} taskTitle={nextTask.title} />
      </div>

      <ActivityHeatmap sessions={sessions} subjects={subjects} />
    </div>
  );
}
