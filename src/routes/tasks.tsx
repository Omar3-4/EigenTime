import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { DataGate } from "@/components/data-gate";
import { useI18n } from "@/lib/i18n";
import { createTask, deleteTask, listSubjects, listTasks, toggleTask } from "@/lib/repo";
import { subjectColorVar, subjectSoftVar } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Task Checklist — EigenTime" },
      {
        name: "description",
        content:
          "A private daily checklist with subject tags and completion history, stored locally alongside your focus sessions.",
      },
      { property: "og:title", content: "Task Checklist — EigenTime" },
      {
        property: "og:description",
        content: "Daily tasks with subject tags, kept on your device with your focus history.",
      },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("tasks")}>
      <DataGate>
        <TasksBody />
      </DataGate>
    </AppShell>
  );
}

function TasksBody() {
  const { t } = useI18n();
  const tasks = useLiveQuery(() => listTasks(), [], []);
  const subjects = useLiveQuery(() => listSubjects(), [], []);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");

  const add = async (overrideTitle?: string) => {
    const tToUse = overrideTitle || title;
    if (!tToUse.trim()) return;
    await createTask({ title: tToUse, subjectId: subjectId || null });
    if (!overrideTitle) setTitle("");
  };

  const open = (tasks ?? []).filter((x) => !x.done);
  const done = (tasks ?? []).filter((x) => x.done);

  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void add()}
          placeholder={t("taskTitle")}
          className="min-w-48 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t("noSubject")}</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void add()}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-focus)" }}
        >
          <Plus className="size-4" />
          {t("addTask")}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TaskList title={`${t("open")} · ${open.length}`} items={open} subjects={subjects ?? []} />
        <TaskList title={`${t("done")} · ${done.length}`} items={done} subjects={subjects ?? []} />
      </div>
    </div>
  );
}

function TaskList({
  title,
  items,
  subjects,
}: {
  title: string;
  items: { id: string; title: string; done: 0 | 1; subjectId: string | null }[];
  subjects: { id: string; name: string; color: keyof typeof subjectColorVar }[];
}) {
  const { t } = useI18n();
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <ul className="space-y-1">
        {items.map((task) => {
          const subject = subjects.find((s) => s.id === task.subjectId);
          return (
            <li key={task.id} className="group flex items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleTask(task.id, !task.done)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-secondary"
              >
                {task.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-goal" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    task.done && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </span>
                {subject && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: subjectSoftVar[subject.color],
                      color: subjectColorVar[subject.color],
                    }}
                  >
                    {subject.name}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={t("remove")}
                onClick={() => void deleteTask(task.id)}
                className="rounded-lg p-2 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="py-6 text-sm text-muted-foreground">{t("noneYet")}</li>
        )}
      </ul>
    </section>
  );
}
