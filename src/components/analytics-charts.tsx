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
  const maxHours = Math.max(1, ...data.map((d) => d.hours));

  return (
    <section className="glass rounded-2xl p-6 sm:p-8 shadow-sm transition-all duration-300 ease-out hover:shadow-md">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="truncate text-base font-semibold">{t("waveTitle")}</h2>
          <div className="group relative cursor-help">
            <div className="flex size-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground">
              ?
            </div>
            <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 w-64 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl bg-popover p-3 text-xs text-popover-foreground shadow-xl border rtl:text-right">
              {t("waveDesc")}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 rounded-xl bg-secondary p-1 text-xs font-semibold">
          {(["weekly", "monthly"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={
                r === range
                  ? "rounded-lg bg-card px-3 py-1.5 shadow-sm transition-all duration-300 ease-out"
                  : "rounded-lg px-3 py-1.5 text-muted-foreground transition-all duration-300 ease-out hover:text-foreground hover:bg-secondary/80"
              }
            >
              {t(r)}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-8 flex h-48 w-full items-end gap-1 sm:gap-2">
        {data.map((d, i) => {
          const heightPct = Math.round((d.hours / maxHours) * 100);
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center justify-end h-full"
            >
              <div
                className="w-full max-w-[48px] rounded-t-md bg-[var(--focus)] opacity-80 transition-opacity group-hover:opacity-100"
                style={{ height: `${heightPct}%`, minHeight: d.hours > 0 ? "4px" : "0" }}
              />
              <div className="mt-2 text-[10px] text-muted-foreground truncate w-full text-center">
                {d.label}
              </div>

              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 z-10 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-sm">
                <div className="font-semibold text-[var(--foreground)]">{d.label}</div>
                <div className="text-[var(--focus)]">
                  {d.hours}h {t("focusHours")}
                </div>
                <div className="text-muted-foreground">
                  {d.energy}% {t("energy")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SubjectDistributionChart({
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
    <section className="glass rounded-2xl p-6 sm:p-8 shadow-sm transition-all duration-300 ease-out hover:shadow-md">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="truncate text-base font-semibold">{t("donutTitle")}</h2>
        <div className="group relative cursor-help">
          <div className="flex size-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground">
            ?
          </div>
          <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 w-64 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl bg-popover p-3 text-xs text-popover-foreground shadow-xl border rtl:text-right">
            {t("donutDesc")}
          </div>
        </div>
      </div>

      {slices.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">{t("noneYet")}</p>
      ) : (
        <div className="mt-6 flex flex-col justify-center h-48 gap-6">
          <div className="flex h-6 w-full overflow-hidden rounded-full border border-[var(--glass-border)] bg-secondary">
            {slices.map((s, i) => (
              <div
                key={s.subjectId ?? `none-${i}`}
                style={{
                  width: `${total ? (s.sec / total) * 100 : 0}%`,
                  backgroundColor: colorFor(s, i),
                }}
                className="h-full transition-all"
                title={`${s.name}: ${formatHoursShort(s.sec)}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm sm:grid-cols-3">
            {slices.map((s, i) => (
              <div
                key={s.subjectId ?? `none-${i}`}
                className="flex items-center gap-2 transition-all duration-300 ease-out hover:scale-[1.02]"
              >
                <div
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: colorFor(s, i) }}
                />
                <span className="truncate">{s.name}</span>
                <span className="ms-auto text-xs text-muted-foreground tabular-nums">
                  {Math.round(s.pct)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
