import { useMemo, useState } from "react";
import type { HeatCell } from "@/lib/analytics";
import type { Subject } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { formatHoursShort } from "@/lib/time";

const tierVar = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];

export function ActivityHeatmap({
  weeks,
  subjects,
}: {
  weeks: HeatCell[][];
  subjects: Subject[];
}) {
  const { t, lang } = useI18n();
  const [active, setActive] = useState<HeatCell | null>(null);

  const monthLabels = useMemo(() => {
    const out: { index: number; label: string }[] = [];
    let last = -1;
    weeks.forEach((week, i) => {
      const first = week[0];
      if (!first) return;
      const m = first.date.getMonth();
      if (m !== last) {
        out.push({
          index: i,
          label: first.date.toLocaleDateString(lang === "ar" ? "ar" : "en", { month: "short" }),
        });
        last = m;
      }
    });
    return out;
  }, [weeks, lang]);

  const totalSec = weeks.flat().reduce((a, c) => a + c.totalSec, 0);
  const activeDays = weeks.flat().filter((c) => c.totalSec > 0).length;

  return (
    <section className="glass rounded-2xl p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{t("heatmapTitle")}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {formatHoursShort(totalSec)} · {activeDays} {t("activeDays")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span>{t("less")}</span>
          {tierVar.map((v) => (
            <span key={v} className="size-3 rounded-[3px]" style={{ background: v }} />
          ))}
          <span>{t("more")}</span>
        </div>
      </header>

      <div className="mt-4 overflow-x-auto pb-1" dir="ltr">
        <div className="min-w-max">
          <div className="relative mb-1 h-4 text-[10px] text-muted-foreground">
            {monthLabels.map((m) => (
              <span key={`${m.index}-${m.label}`} className="absolute" style={{ left: m.index * 14 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell) => (
                  <button
                    key={cell.day}
                    type="button"
                    onMouseEnter={() => setActive(cell)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(cell)}
                    onBlur={() => setActive(null)}
                    aria-label={`${cell.day}: ${formatHoursShort(cell.totalSec)}`}
                    className="size-[11px] rounded-[3px] outline-none ring-offset-1 transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ background: tierVar[cell.tier] }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-16 rounded-xl bg-secondary/60 p-3 text-xs">
        {active ? (
          <div className="space-y-1">
            <p className="font-semibold">
              {active.date.toLocaleDateString(lang === "ar" ? "ar" : "en", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-muted-foreground">
              {formatHoursShort(active.totalSec)} · {active.sessionCount} {t("sessions")}
            </p>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
              {active.bySubject.length === 0 && <li>{t("noneYet")}</li>}
              {active.bySubject.map((b) => (
                <li key={b.subjectId ?? "none"}>
                  {subjects.find((s) => s.id === b.subjectId)?.name ?? t("noSubject")} —{" "}
                  {formatHoursShort(b.sec)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("hoverHint")}</p>
        )}
      </div>
    </section>
  );
}
