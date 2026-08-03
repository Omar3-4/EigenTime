import { createFileRoute } from "@tanstack/react-router";
import { GamificationProfile } from "@/components/gamification-profile";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState, useEffect } from "react";
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

import { Responsive, useContainerWidth, type Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Settings2, Save } from "lucide-react";

const defaultLayouts: Layouts = {
  lg: [
    { i: "wave", x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 },
    { i: "distribution", x: 8, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
    { i: "biorhythm", x: 0, y: 2, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "flow", x: 3, y: 2, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "stability", x: 6, y: 2, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "duration", x: 9, y: 2, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "heatmap", x: 0, y: 5, w: 12, h: 2, minW: 6, minH: 2 },
  ],
  md: [
    { i: "wave", x: 0, y: 0, w: 10, h: 2 },
    { i: "distribution", x: 0, y: 2, w: 10, h: 2 },
    { i: "biorhythm", x: 0, y: 4, w: 5, h: 3 },
    { i: "flow", x: 5, y: 4, w: 5, h: 3 },
    { i: "stability", x: 0, y: 7, w: 5, h: 3 },
    { i: "duration", x: 5, y: 7, w: 5, h: 3 },
    { i: "heatmap", x: 0, y: 10, w: 10, h: 2 },
  ],
  sm: [
    { i: "wave", x: 0, y: 0, w: 6, h: 2 },
    { i: "distribution", x: 0, y: 2, w: 6, h: 2 },
    { i: "biorhythm", x: 0, y: 4, w: 6, h: 3 },
    { i: "flow", x: 0, y: 7, w: 6, h: 3 },
    { i: "stability", x: 0, y: 10, w: 6, h: 3 },
    { i: "duration", x: 0, y: 13, w: 6, h: 3 },
    { i: "heatmap", x: 0, y: 16, w: 6, h: 2 },
  ],
};

function AnalyticsBody() {
  const { t, dir, lang } = useI18n();
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState<Layouts>(() => {
    const saved = localStorage.getItem("analytics-layout");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultLayouts;
      }
    }
    return defaultLayouts;
  });

  const handleLayoutChange = (currentLayout: unknown, allLayouts: Layouts) => {
    setLayouts(allLayouts);
  };

  const saveLayout = () => {
    localStorage.setItem("analytics-layout", JSON.stringify(layouts));
    setIsEditing(false);
  };

  const [data, setData] = useState<{ sessions: any[]; subjects: any[]; tasks: any[] }>({
    sessions: [],
    subjects: [],
    tasks: [],
  });

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [sess, subj, tsk] = await Promise.all([
          sessionsInRange(365),
          listSubjects(),
          listTasks(),
        ]);
        if (mounted) {
          setData({ sessions: sess, subjects: subj, tasks: tsk });
        }
      } catch (err) {
        console.error("Failed to fetch analytics data", err);
      }
    };

    fetchData();

    // Optionally refetch when window regains focus to keep it relatively fresh
    // without spinning on every DB tick.
    window.addEventListener("focus", fetchData);
    return () => {
      mounted = false;
      window.removeEventListener("focus", fetchData);
    };
  }, []);

  const { sessions = [], subjects = [], tasks = [] } = data || {};

  const wave = useMemo(() => buildWave(sessions, range), [sessions, range]);
  const distribution = useMemo(() => buildDistribution(sessions, subjects), [sessions, subjects]);
  const biorhythm = useMemo(() => buildBiorhythm(sessions), [sessions]);
  const flow = useMemo(() => buildFlowDriver(sessions, subjects), [sessions, subjects]);
  const stability = useMemo(() => buildStability(sessions), [sessions]);

  const nextTask = useMemo(
    () => predictNextTask(tasks, sessions, subjects),
    [tasks, sessions, subjects],
  );
  const taskDuration = useMemo(
    () => (nextTask.taskId ? estimateTaskDuration(nextTask.taskId, tasks, sessions) : null),
    [nextTask.taskId, tasks, sessions],
  );

  const { width, containerRef, mounted } = useContainerWidth();

  return (
    <div className="space-y-4" ref={containerRef}>
      <GamificationProfile />

      <div className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <button
              key="reset-btn"
              onClick={() => {
                setLayouts(defaultLayouts);
                localStorage.removeItem("analytics-layout");
                setIsEditing(false);
              }}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              Reset Layouts
            </button>
            <button
              key="save-btn"
              onClick={() => {
                saveLayout();
                setIsEditing(false);
              }}
              className="flex items-center gap-2 rounded-lg bg-focus px-4 py-2 text-sm font-medium text-focus-foreground shadow transition-colors hover:bg-focus/90"
            >
              <Save className="size-4" />
              {t("save_layout")}
            </button>
          </>
        ) : (
          <button
            key="edit-btn"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            <Settings2 className="size-4" />
            {t("edit_layout")}
          </button>
        )}
      </div>

      {mounted &&
        (() => {
          const currentLayouts: Layouts = {};
          for (const key of Object.keys(layouts)) {
            currentLayouts[key] = layouts[key].map((l) => ({ ...l, static: !isEditing }));
          }
          return (
            <div dir="ltr">
              <Responsive
                className={`layout ${isEditing ? "is-editing" : ""}`}
                width={width}
                layouts={currentLayouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={160}
                onLayoutChange={handleLayoutChange}
                isDraggable={isEditing}
                isResizable={isEditing}
                margin={[16, 16]}
                containerPadding={[0, 0]}
                isBounded={false}
                useCSSTransforms={true}
              >
                <div
                  key="wave"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  className="h-full w-full overflow-visible [&>section]:h-full [&>section]:flex [&>section]:flex-col"
                >
                  <PerformanceWaveChart data={wave} range={range} onRangeChange={setRange} />
                </div>
                <div
                  key="distribution"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  className="h-full w-full overflow-visible [&>section]:h-full [&>section]:flex [&>section]:flex-col"
                >
                  <SubjectDistributionChart slices={distribution} subjects={subjects} />
                </div>
                <div
                  key="biorhythm"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  className="h-full w-full overflow-visible"
                >
                  <BiorhythmPanel data={biorhythm} />
                </div>
                <div
                  key="flow"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  className="h-full w-full overflow-visible"
                >
                  <FlowDriverPanel data={flow} />
                </div>
                <div
                  key="stability"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  className="h-full w-full overflow-visible"
                >
                  <StabilityPanel data={stability} />
                </div>
                <div
                  key="duration"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  className="h-full w-full overflow-visible"
                >
                  <TaskDurationPanel data={taskDuration} taskTitle={nextTask.title} />
                </div>
                <div
                  key="heatmap"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  className="h-full w-full overflow-visible [&>section]:h-full [&>section]:flex [&>section]:flex-col"
                >
                  <ActivityHeatmap sessions={sessions} subjects={subjects} />
                </div>
              </Responsive>
            </div>
          );
        })()}

      <style>{`
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, right;
        }
        .react-grid-item.cssTransforms {
          transition-property: transform;
        }
        .react-grid-item.resizing {
          z-index: 10;
          will-change: width, height;
        }
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 11;
          will-change: transform;
        }
        .react-grid-item.react-grid-placeholder {
          background: var(--focus);
          opacity: 0.1;
          border-radius: 1rem;
          transition-duration: 100ms;
          z-index: 2;
        }
        .is-editing .react-grid-item {
          cursor: grab;
        }
        .is-editing .react-grid-item:active {
          cursor: grabbing;
        }
        .is-editing .react-grid-item:hover {
          outline: 2px dashed var(--focus);
          outline-offset: 4px;
          border-radius: 1rem;
        }
        .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          cursor: se-resize;
          background: transparent;
          z-index: 20;
        }
        [dir="rtl"] .react-resizable-handle {
          right: auto;
          left: 0;
          cursor: sw-resize;
          transform: scaleX(-1);
        }
        .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid var(--muted-foreground);
          border-bottom: 2px solid var(--muted-foreground);
        }
      `}</style>
    </div>
  );
}
