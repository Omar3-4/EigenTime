import { AlertTriangle, Brain, Gauge, Sparkles, Waves, Heart, Timer, LineChart } from "lucide-react";
import type {
  Biorhythm,
  FatigueWarning,
  FlowDriver,
  NextTaskPrediction,
  Stability,
  HabitHealth,
  DurationEstimate,
  LifestyleCorrelation,
} from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";

function Panel({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof Gauge;
  tone: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="glass flex flex-col gap-3 rounded-2xl p-5">
      <header className="flex min-w-0 items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}
        >
          <Icon className="size-5" />
        </span>
        <h3 className="truncate text-sm font-semibold">{title}</h3>
      </header>
      {children}
    </article>
  );
}

function Meter({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: `var(--${tone})` }}
      />
    </div>
  );
}

const hourLabel = (h: number | null) => (h === null ? "—" : `${String(h).padStart(2, "0")}:00`);

export function BiorhythmPanel({ data }: { data: Biorhythm }) {
  const { t } = useI18n();
  const peak = Math.max(1, ...data.hours.map((h) => h.minutes));
  return (
    <Panel icon={Waves} tone="focus" title={t("biorhythm")}>
      <div className="flex h-24 items-end gap-[3px]" dir="ltr">
        {data.hours.map((h) => (
          <div
            key={h.hour}
            title={`${hourLabel(h.hour)} — ${h.minutes}m`}
            className="flex-1 rounded-t-[3px]"
            style={{
              height: `${Math.max(3, (h.minutes / peak) * 100)}%`,
              background: h.hour === data.peakHour ? "var(--focus)" : "var(--focus-soft)",
            }}
          />
        ))}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{t("peakHour")}</dt>
          <dd className="tabular font-semibold">{hourLabel(data.peakHour)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("lowHour")}</dt>
          <dd className="tabular font-semibold">{hourLabel(data.troughHour)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("periodicity")}</dt>
          <dd className="tabular font-semibold">{data.periodicity}%</dd>
        </div>
      </dl>
    </Panel>
  );
}

export function FlowDriverPanel({ data }: { data: FlowDriver }) {
  const { t } = useI18n();
  return (
    <Panel icon={Sparkles} tone="subject" title={t("flowDriver")}>
      <p className="tabular font-display text-3xl font-semibold">{data.score}</p>
      <Meter value={data.score} tone="subject" />
      <p className="text-xs text-muted-foreground">
        {data.driver === "none"
          ? t("needMoreData")
          : `${t(`driver_${data.driver}`)} · ${data.detail}`}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("medianSession")}: <span className="tabular font-semibold">{data.medianMinutes}m</span> ·{" "}
        {t("longestSession")}: <span className="tabular font-semibold">{data.longestMinutes}m</span>
      </p>
    </Panel>
  );
}

export function StabilityPanel({ data }: { data: Stability }) {
  const { t } = useI18n();
  return (
    <Panel icon={Brain} tone="elapsed" title={t("stability")}>
      <p className="tabular font-display text-3xl font-semibold">{data.index}</p>
      <Meter value={data.index} tone="elapsed" />
      <p className="text-xs text-muted-foreground">
        {t("dispersion")}: <span className="tabular font-semibold">{data.cv}</span> ·{" "}
        {t("activeDays")}: <span className="tabular font-semibold">{data.activeDays}/28</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {t("dailyAverage")}: <span className="tabular font-semibold">{data.averageHours}h</span>
      </p>
    </Panel>
  );
}

export function FatiguePanel({ data }: { data: FatigueWarning }) {
  const { t } = useI18n();
  const tone = data.level === "high" ? "productivity" : data.level === "moderate" ? "goal" : "goal";
  return (
    <Panel icon={AlertTriangle} tone={tone} title={t("fatigue")}>
      <p className="tabular font-display text-3xl font-semibold">{data.risk}%</p>
      <Meter value={data.risk} tone={tone} />
      <p className="text-xs font-semibold">{t(`fatigue_${data.level}`)}</p>
      <p className="text-xs text-muted-foreground">
        {t("todayLoad")}: <span className="tabular font-semibold">{data.todayHours}h</span> ·{" "}
        {t("threeDayLoad")}: <span className="tabular font-semibold">{data.last3DayHours}h</span> ·{" "}
        {t("withinDayDecline")}: <span className="tabular font-semibold">{data.decline}%</span>
      </p>
    </Panel>
  );
}

export function NextTaskPanel({ data }: { data: NextTaskPrediction }) {
  const { t } = useI18n();
  return (
    <Panel icon={Gauge} tone="goal" title={t("nextTask")}>
      {data.taskId ? (
        <>
          <p className="font-display text-lg font-semibold">{data.title}</p>
          <p className="text-xs text-muted-foreground">
            {data.subjectName ?? t("noSubject")} · {t(`reason_${data.reason}`)}
          </p>
          <Meter value={data.confidence} tone="goal" />
          <p className="tabular text-xs text-muted-foreground">
            {t("confidence")}: {data.confidence}%
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noOpenTasks")}</p>
      )}
    </Panel>
  );
}

export function HabitHealthPanel({ data }: { data: HabitHealth }) {
  const { t } = useI18n();
  const tone = data.trend === "declining" ? "goal" : data.trend === "improving" ? "focus" : "elapsed";
  return (
    <Panel icon={Heart} tone={tone} title={t("habitHealth") ?? "Habit Health"}>
      <p className="tabular font-display text-3xl font-semibold">{data.score}</p>
      <Meter value={data.score} tone={tone} />
      <p className="text-xs font-semibold capitalize">{data.trend}</p>
      <p className="text-xs text-muted-foreground">
        Current Streak: <span className="tabular font-semibold">{data.streakDays} days</span>
      </p>
      <p className="text-xs text-muted-foreground">
        90-Day Consistency: <span className="tabular font-semibold">{data.longTermConsistency}%</span>
      </p>
    </Panel>
  );
}

export function TaskDurationPanel({ data, taskTitle }: { data: DurationEstimate | null; taskTitle?: string }) {
  const { t } = useI18n();
  if (!data) {
    return (
      <Panel icon={Timer} tone="elapsed" title={t("taskDuration") ?? "Task Duration"}>
        <p className="text-sm text-muted-foreground">Need more task history to estimate.</p>
      </Panel>
    );
  }
  return (
    <Panel icon={Timer} tone="elapsed" title={t("taskDuration") ?? "Task Duration"}>
      <p className="font-display text-lg font-semibold">{taskTitle ?? "Pending Task"}</p>
      <p className="tabular font-display text-3xl font-semibold">{data.estimatedMinutes}m</p>
      <Meter value={data.confidence} tone="elapsed" />
      <p className="text-xs text-muted-foreground">
        Range: <span className="tabular font-semibold">{data.lowerBound}m – {data.upperBound}m</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Confidence: <span className="tabular font-semibold">{data.confidence}%</span>
      </p>
    </Panel>
  );
}

export function LifestyleCorrelationPanel({ data }: { data: LifestyleCorrelation[] }) {
  const { t } = useI18n();
  return (
    <Panel icon={LineChart} tone="subject" title={t("lifestyleCorrelation") ?? "Lifestyle Correlation"}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Log more sessions to unlock correlations.</p>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 2).map((corr, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{corr.factor}</span>
                <span className="tabular text-xs font-semibold text-muted-foreground">{corr.correlation > 0 ? "+" : ""}{corr.correlation}%</span>
              </div>
              <p className="text-xs text-muted-foreground">{corr.insight}</p>
              <Meter value={Math.abs(corr.correlation)} tone={corr.correlation > 0 ? "focus" : "goal"} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
