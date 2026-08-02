import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DistributionSlice, WavePoint } from "@/lib/analytics";
import type { Subject } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { subjectColorVar } from "@/lib/subject-colors";
import { formatHoursShort } from "@/lib/time";

const chartVars = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function PerformanceWaveChart({
  data,
  range,
  onRangeChange,
}: {
  data: WavePoint[];
  range: "weekly" | "monthly";
  onRangeChange: (r: "weekly" | "monthly") => void;
}) {
  const { t } = useI18n();
  return (
    <section className="glass rounded-2xl p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{t("waveTitle")}</h2>
          <p className="truncate text-xs text-muted-foreground">{t("waveSub")}</p>
        </div>
        <div className="flex shrink-0 rounded-xl bg-secondary p-1 text-xs font-semibold">
          {(["weekly", "monthly"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={
                r === range
                  ? "rounded-lg bg-card px-3 py-1.5 shadow-sm"
                  : "rounded-lg px-3 py-1.5 text-muted-foreground"
              }
            >
              {t(r)}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-4 h-64 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--focus)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--elapsed)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="var(--muted-foreground)"
              unit="h"
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
              }}
              formatter={(v: number, key) =>
                key === "hours" ? [`${v}h`, t("focusHours")] : [`${v}%`, t("energy")]
              }
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="var(--focus)"
              strokeWidth={2.5}
              fill="url(#waveFill)"
            />
            <Area
              type="monotone"
              dataKey="energy"
              stroke="var(--subject)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function SubjectDonutChart({
  slices,
  subjects,
}: {
  slices: DistributionSlice[];
  subjects: Subject[];
}) {
  const { t } = useI18n();
  const colorFor = (slice: DistributionSlice, i: number) => {
    const subject = subjects.find((s) => s.id === slice.subjectId);
    return subject ? subjectColorVar[subject.color] : chartVars[i % chartVars.length]!;
  };
  const total = slices.reduce((a, s) => a + s.sec, 0);

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-base font-semibold">{t("donutTitle")}</h2>
      <p className="text-xs text-muted-foreground">{t("donutSub")}</p>

      {slices.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">{t("noneYet")}</p>
      ) : (
        <div className="mt-2 h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="sec"
                nameKey="name"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={2}
                stroke="none"
              >
                {slices.map((s, i) => (
                  <Cell key={s.subjectId ?? `none-${i}`} fill={colorFor(s, i)} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 12,
                }}
                formatter={(v: number, name) => [
                  `${formatHoursShort(v)} · ${total ? Math.round((v / total) * 100) : 0}%`,
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
