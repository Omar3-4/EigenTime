import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Archive, ArchiveRestore, Plus, Trash2 } from "lucide-react";
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
import { subjectColorVar, subjectColors, subjectSoftVar } from "@/lib/subject-colors";
import { formatHoursShort } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects & Targets — EigenTime" },
      {
        name: "description",
        content:
          "Organise focus sessions into colour-tagged subjects and projects with weekly target hours and live progress bars.",
      },
      { property: "og:title", content: "Subjects & Targets — EigenTime" },
      {
        property: "og:description",
        content: "Colour-tagged subjects with weekly hour targets and live weekly progress.",
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
  const [target, setTarget] = useState(5);

  const add = async () => {
    if (!name.trim()) return;
    await createSubject({ name, color, weeklyTargetHours: target });
    setName("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {(subjects ?? []).map((s) => {
          const sec = weekly?.[s.id] ?? 0;
          const pct = s.weeklyTargetHours
            ? Math.min(100, Math.round((sec / (s.weeklyTargetHours * 3600)) * 100))
            : 0;
          return (
            <article
              key={s.id}
              className={cn("glass rounded-2xl p-5", s.archived && "opacity-60")}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 size-3.5 shrink-0 rounded-full"
                  style={{ background: subjectColorVar[s.color] }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{s.name}</h3>
                  <p className="tabular text-xs text-muted-foreground">
                    {formatHoursShort(sec)} / {s.weeklyTargetHours}h · {t("thisWeek")}
                  </p>
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
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, background: subjectColorVar[s.color] }}
                />
              </div>
            </article>
          );
        })}
      </div>

      <aside className="glass h-fit space-y-4 rounded-2xl p-5">
        <h2 className="text-base font-semibold">{t("addSubject")}</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("subjectName")}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          {subjectColors.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn(
                "size-8 rounded-lg border-2 transition-transform",
                color === c ? "scale-110 border-foreground/30" : "border-transparent",
              )}
              style={{ background: subjectColorVar[c] }}
            />
          ))}
        </div>
        <label className="block space-y-1">
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
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          style={{ background: subjectSoftVar[color], color: subjectColorVar[color] }}
        >
          <Plus className="size-4" />
          {t("addSubject")}
        </button>
      </aside>
    </div>
  );
}
