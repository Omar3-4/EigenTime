import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Archive, ArchiveRestore, Palette, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataGate } from "@/components/data-gate";
import type { SubjectColor } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import {
  createSubject,
  deleteSubject,
  listSubjects,
  setSubjectArchived,
  weeklySecondsBySubject,
} from "@/lib/repo";
import { getSubjectColor, getSubjectSoftColor, subjectPresetSwatches } from "@/lib/subject-colors";
import { formatHoursShort } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects & Targets — EigenTime" },
      {
        name: "description",
        content:
          "Organise focus sessions into colour-tagged subjects and projects with custom shade pickers, weekly target hours and live progress bars.",
      },
      { property: "og:title", content: "Subjects & Targets — EigenTime" },
      {
        property: "og:description",
        content: "Colour-tagged subjects with weekly hour targets and custom shade selector.",
      },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("subjects")}>
      <DataGate>
        <SubjectsBody />
      </DataGate>
    </AppShell>
  );
}

function SubjectsBody() {
  const { t } = useI18n();
  const subjects = useLiveQuery(() => listSubjects(), [], []);
  const weekly = useLiveQuery(() => weeklySecondsBySubject(), [], {} as Record<string, number>);
  const [name, setName] = useState("");
  const [color, setColor] = useState<SubjectColor>("subject");
  const [customHex, setCustomHex] = useState("#a855f7");
  const [useCustom, setUseCustom] = useState(false);
  const [target, setTarget] = useState(5);

  const activeColor = useCustom ? customHex : color;

  const add = async () => {
    if (!name.trim()) return;
    await createSubject({ name, color: activeColor, weeklyTargetHours: target });
    setName("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {(subjects ?? []).map((s) => {
          const sec = weekly?.[s.id] ?? 0;
          const pct = s.weeklyTargetHours
            ? Math.min(100, Math.round((sec / (s.weeklyTargetHours * 3600)) * 100))
            : 0;
          const cardColor = getSubjectColor(s.color);
          const balanceSec = sec - s.weeklyTargetHours * 3600;
          const isSurplus = balanceSec >= 0;
          return (
            <article
              key={s.id}
              className={cn(
                "glass rounded-2xl p-5 transition-shadow hover:shadow-lg",
                s.archived && "opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 size-3.5 shrink-0 rounded-full shadow-sm"
                  style={{ background: cardColor }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{s.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="tabular text-xs text-muted-foreground">{t("thisWeek")}</p>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
                        isSurplus
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {isSurplus ? "+" : "-"}
                      {formatHoursShort(Math.abs(balanceSec))} {isSurplus ? "surplus" : "debt"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={s.archived ? t("unarchive") : t("archive")}
                  onClick={() => void setSubjectArchived(s.id, !s.archived)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary"
                >
                  {s.archived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={t("remove")}
                  onClick={() => void deleteSubject(s.id)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground font-medium">{formatHoursShort(sec)}</span>
                <span className="text-muted-foreground">{s.weeklyTargetHours}h</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, background: cardColor }}
                />
              </div>
            </article>
          );
        })}
      </div>

      <aside className="glass h-fit space-y-5 rounded-2xl p-5">
        <h2 className="text-base font-semibold">{t("addSubject")}</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("subjectName")}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="space-y-2">
          <label htmlFor="field" className="text-xs font-medium text-muted-foreground">Fixed Color Presets</label>
          <div className="flex flex-wrap gap-2">
            {subjectPresetSwatches.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                aria-label={swatch.name}
                onClick={() => {
                  setColor(swatch.value);
                  setUseCustom(false);
                }}
                className={cn(
                  "size-8 rounded-lg border-2 transition-all hover:scale-105",
                  !useCustom && color === swatch.value
                    ? "scale-110 border-foreground shadow-md"
                    : "border-transparent",
                )}
                style={{ background: swatch.color }}
                title={swatch.name}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border/50 bg-secondary/30 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Palette className="size-3.5 text-primary" />
              Custom Color Shade Picker
            </span>
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="accent-primary"
            />
          </div>
          {useCustom && (
            <div className="flex items-center gap-3 pt-1">
              <input
                type="color"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                className="size-9 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              <input
                type="text"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
        </div>

        <label htmlFor="field" className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">{t("weeklyTarget")}</span>
          <input
            type="number"
            min={1}
            max={80}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <button
          type="button"
          onClick={() => void add()}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-transform active:scale-95"
          style={{
            background: getSubjectSoftColor(activeColor),
            color: getSubjectColor(activeColor),
            border: `1px solid ${getSubjectColor(activeColor)}40`,
          }}
        >
          <Plus className="size-4" />
          {t("addSubject")}
        </button>
      </aside>
    </div>
  );
}
