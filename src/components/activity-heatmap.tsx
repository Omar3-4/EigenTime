import { useMemo, useState } from "react";
import { buildHeatmap, type HeatCell } from "@/lib/analytics";
import type { Subject, Session } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { formatHoursShort } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Cuboid, Play } from "lucide-react";

const tierVar = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];

export function ActivityHeatmap({
  sessions,
  subjects,
}: {
  sessions: Session[];
  subjects: Subject[];
}) {
  const { t, lang } = useI18n();
  const [active, setActive] = useState<HeatCell | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const weeks = useMemo(() => {
    if (!isLoaded) return [];
    return buildHeatmap(sessions);
  }, [isLoaded, sessions]);

  const monthLabels = useMemo(() => {
    if (!isLoaded) return [];
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
  }, [weeks, lang, isLoaded]);

  const totalSec = isLoaded ? weeks.flat().reduce((a, c) => a + c.totalSec, 0) : 0;
  const activeDays = isLoaded ? weeks.flat().filter((c) => c.totalSec > 0).length : 0;

  return (
    <section className="glass rounded-2xl p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{t("heatmapTitle")}</h2>
          {isLoaded && (
            <p className="truncate text-xs text-muted-foreground">
              {formatHoursShort(totalSec)} · {activeDays} {t("activeDays")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {isLoaded && (
            <>
              <button
                onClick={() => setIs3D(!is3D)}
                title="Toggle 3D Heatmap"
                className={cn("flex items-center justify-center p-1.5 rounded-lg transition-colors border mr-2", is3D ? "bg-focus text-focus-foreground border-transparent" : "hover:bg-secondary border-border text-muted-foreground")}
              >
                <Cuboid className="size-4" />
              </button>
              <span>{t("less")}</span>
              {tierVar.map((v) => (
                <span key={v} className="size-3 rounded-[3px]" style={{ background: v }} />
              ))}
              <span>{t("more")}</span>
            </>
          )}
        </div>
      </header>

      {!isLoaded ? (
        <div className="mt-4 flex flex-col items-center justify-center py-12 rounded-xl bg-secondary/30 border border-dashed border-border">
          <Cuboid className="size-8 text-muted-foreground mb-4 opacity-50" />
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
            The heatmap is paused by default to conserve memory. Click below to load your activity history.
          </p>
          <button
            onClick={() => setIsLoaded(true)}
            className="flex items-center gap-2 bg-focus text-focus-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Play className="size-4" />
            Load Heatmap
          </button>
        </div>
      ) : (
        <>
          <div className={cn("mt-4 overflow-x-auto pb-1 flex", is3D && "justify-center py-12 overflow-visible")} dir="ltr">
            <div className="min-w-max" style={{ perspective: "1000px" }}>
              <div className={cn("relative mb-1 h-4 text-[10px] text-muted-foreground transition-opacity duration-300", is3D && "opacity-0 pointer-events-none")}>
                {monthLabels.map((m) => (
                  <span key={`${m.index}-${m.label}`} className="absolute" style={{ left: m.index * 14 }}>
                    {m.label}
                  </span>
                ))}
              </div>
              <div 
                className="flex gap-[3px] transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  transformStyle: "preserve-3d",
                  transform: is3D ? "rotateX(60deg) rotateZ(-45deg) scale(1.4)" : "rotateX(0deg) rotateZ(0deg) scale(1)"
                }}
              >
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]" style={{ transformStyle: "preserve-3d" }}>
                    {week.map((cell) => (
                      <button
                        key={cell.day}
                        type="button"
                        onMouseEnter={() => setActive(cell)}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive(cell)}
                        onBlur={() => setActive(null)}
                        aria-label={`${cell.day}: ${formatHoursShort(cell.totalSec)}`}
                        className={cn(
                          "size-[11px] outline-none transition-all duration-500",
                          !is3D && "rounded-[3px] hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring",
                          is3D && "rounded-sm"
                        )}
                        style={{ 
                          background: tierVar[cell.tier],
                          transform: is3D ? `translateZ(${cell.tier * 6}px)` : "translateZ(0px)",
                          boxShadow: is3D && cell.tier > 0 
                            ? `-1px 1px 0px rgba(0,0,0,0.3), -2px 2px 0px rgba(0,0,0,0.1), 0 10px 20px rgba(0,0,0,0.1)` 
                            : "none"
                        }}
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
        </>
      )}
    </section>
  );
}
