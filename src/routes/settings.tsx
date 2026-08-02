import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { DataGate } from "@/components/data-gate";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_DAILY_GOAL_HOURS,
  exportAll,
  getSetting,
  importAll,
  resetAll,
  setSetting,
} from "@/lib/repo";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Local Data — EigenTime" },
      {
        name: "description",
        content:
          "Set your daily focus goal, switch between English and Arabic, and export or import your entire local EigenTime database as JSON.",
      },
      { property: "og:title", content: "Settings & Local Data — EigenTime" },
      {
        property: "og:description",
        content: "Daily goal, language direction and full local database export or import.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("settings")}>
      <DataGate>
        <SettingsBody />
      </DataGate>
    </AppShell>
  );
}

function SettingsBody() {
  const { t, lang, setLang } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const goal =
    useLiveQuery(() => getSetting("dailyGoalHours", DEFAULT_DAILY_GOAL_HOURS), [], null) ??
    DEFAULT_DAILY_GOAL_HOURS;

  const download = async () => {
    const json = await exportAll();
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `eigentime-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File) => {
    await importAll(await file.text());
    window.location.reload();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="glass space-y-4 rounded-2xl p-5">
        <h2 className="text-base font-semibold">{t("dailyGoal")}</h2>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={14}
            step={0.5}
            value={goal}
            onChange={(e) => void setSetting("dailyGoalHours", Number(e.target.value))}
            className="flex-1 accent-[var(--focus)]"
          />
          <span className="tabular w-16 text-end font-display text-lg font-semibold">{goal}h</span>
        </div>
      </section>

      <section className="glass space-y-3 rounded-2xl p-5">
        <h2 className="text-base font-semibold">{t("language")}</h2>
        <div className="flex gap-2">
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={
                lang === l
                  ? "flex-1 rounded-xl bg-focus-soft px-4 py-2.5 text-sm font-semibold text-focus-foreground"
                  : "flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground"
              }
            >
              {l === "en" ? "English (LTR)" : "العربية (RTL)"}
            </button>
          ))}
        </div>
      </section>

      <section className="glass space-y-3 rounded-2xl p-5 lg:col-span-2">
        <h2 className="text-base font-semibold">{t("data")}</h2>
        <p className="text-sm text-muted-foreground">{t("offlineNote")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void download()}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <Download className="size-4" />
            {t("exportJson")}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <Upload className="size-4" />
            {t("importJson")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <button
            type="button"
            onClick={() => {
              void resetAll().then(() => window.location.reload());
            }}
            className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15"
          >
            <Trash2 className="size-4" />
            {t("resetAll")}
          </button>
        </div>
      </section>
    </div>
  );
}
