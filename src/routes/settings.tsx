import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bell,
  BrainCircuit,
  Clock,
  Download,
  Globe,
  Palette,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  BellRing,
} from "lucide-react";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataGate } from "@/components/data-gate";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_DAILY_GOAL_HOURS,
  exportAll,
  exportCsv,
  exportMarkdown,
  getSetting,
  importAll,
  resetAll,
  setSetting,
} from "@/lib/repo";
import { requestNotificationPermission } from "@/lib/tauri";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import {
  EIGENTIME_THEMES,
  CATEGORY_LABELS,
  applyTheme,
  getSavedThemeId,
  type ThemeConfig,
} from "@/lib/themes";
import { encryptData, decryptData } from "@/lib/crypto";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Full Settings & Preferences — EigenTime" },
      {
        name: "description",
        content:
          "Configure timer defaults, LTR/RTL layout, behavioral AI thresholds, goals, notifications, local offline data backups, and visual themes.",
      },
      { property: "og:title", content: "Full Settings & Preferences — EigenTime" },
      {
        property: "og:description",
        content: "Complete application control suite for EigenTime.",
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
        <SettingsSuite />
      </DataGate>
    </AppShell>
  );
}

function SettingsSuite() {
  const { t, lang, setLang } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const fileEncryptedRef = useRef<HTMLInputElement>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(getSavedThemeId);

  // Stored Settings
  const goal =
    useLiveQuery(
      () => getSetting("dailyGoalHours", DEFAULT_DAILY_GOAL_HOURS, z.number()),
      [],
      null,
    ) ?? DEFAULT_DAILY_GOAL_HOURS;
  const focusDuration =
    useLiveQuery(() => getSetting("defaultFocusDuration", 25, z.number()), [], null) ?? 25;
  const shortBreak =
    useLiveQuery(() => getSetting("defaultShortBreak", 5, z.number()), [], null) ?? 5;
  const longBreak =
    useLiveQuery(() => getSetting("defaultLongBreak", 15, z.number()), [], null) ?? 15;
  const autoStartBreaks =
    useLiveQuery(() => getSetting("autoStartBreaks", false, z.boolean()), [], null) ?? false;
  const fatigueSensitivity =
    useLiveQuery(() => getSetting("fatigueSensitivity", "medium", z.string()), [], null) ??
    "medium";
  const deepFlowThreshold =
    useLiveQuery(() => getSetting("deepFlowThreshold", 20, z.number()), [], null) ?? 20;
  const soundVolume = useLiveQuery(() => getSetting("soundVolume", 80, z.number()), [], null) ?? 80;
  const eyeBreakEnabled =
    useLiveQuery(() => getSetting("eyeBreakEnabled", false, z.boolean()), [], null) ?? false;
  const notificationsEnabled =
    useLiveQuery(() => getSetting("notificationsEnabled", true, z.boolean()), [], null) ?? true;
  const tickSoundEnabled =
    useLiveQuery(() => getSetting("tickSoundEnabled", false, z.boolean()), [], null) ?? false;
  const alwaysOnTop =
    useLiveQuery(() => getSetting("alwaysOnTop", false, z.boolean()), [], null) ?? false;
  const globalShortcutsEnabled =
    useLiveQuery(() => getSetting("globalShortcutsEnabled", true, z.boolean()), [], null) ?? true;

  const handleThemeSelect = (id: string) => {
    applyTheme(id);
    setActiveThemeId(id);
    void setSetting("themeId", id);
    toast.success(`Theme applied: ${EIGENTIME_THEMES.find((t) => t.id === id)?.name}`);
  };

  const download = async () => {
    const json = await exportAll();
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `eigentime-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup Downloaded", { description: "Full database exported as JSON." });
  };

  const downloadCsv = async () => {
    const csv = await exportCsv();
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `eigentime-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV Downloaded", { description: "Session history exported as CSV." });
  };

  const downloadMd = async () => {
    const md = await exportMarkdown();
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `eigentime-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown Downloaded", { description: "Data exported as Markdown." });
  };

  const upload = async (file: File) => {
    try {
      await importAll(await file.text());
      toast.success("Backup Restored", { description: "Application reloaded with imported data." });
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error("Import Failed", { description: "Invalid backup JSON file format." });
    }
  };

  const downloadEncrypted = async () => {
    const pwd = window.prompt("Enter a password to encrypt your backup:");
    if (!pwd) return;
    try {
      const json = await exportAll();
      const encrypted = await encryptData(json, pwd);
      const url = URL.createObjectURL(new Blob([encrypted], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `eigentime-backup-encrypted-${new Date().toISOString().slice(0, 10)}.enc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Encrypted Backup Downloaded", { description: "AES-GCM secured backup." });
    } catch (e) {
      toast.error("Encryption Failed", { description: String(e) });
    }
  };

  const uploadEncrypted = async (file: File) => {
    const pwd = window.prompt("Enter the password to decrypt your backup:");
    if (!pwd) return;
    try {
      const encText = await file.text();
      const json = await decryptData(encText, pwd);
      await importAll(json);
      toast.success("Backup Restored", { description: "Application reloaded with imported data." });
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast.error("Decryption Failed", { description: "Invalid password or corrupted backup." });
    }
  };

  // Group themes by category
  const categories = Array.from(
    new Set(EIGENTIME_THEMES.map((t) => t.category)),
  ) as ThemeConfig["category"][];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Appearance / Themes ─── */}
        <section className="glass space-y-6 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01] md:col-span-2">
          <div className="border-b border-border/50 pb-2">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("visualTheme")}
            </h2>
          </div>

          <div className="space-y-5">
            {categories.map((cat) => (
              <div key={cat} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {EIGENTIME_THEMES.filter((t) => t.category === cat).map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      isActive={activeThemeId === theme.id}
                      onSelect={() => handleThemeSelect(theme.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Custom Hex Theme Engine */}
            <div className="space-y-2 mt-6 border-t border-border/50 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                🖌️ Custom Engine
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center p-4 rounded-xl border border-border/40 bg-secondary/30">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Generate from Hex</p>
                  <p className="text-xs text-muted-foreground">
                    Pick a base color to dynamically generate a glassmorphic theme.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    onChange={(e) => {
                      applyTheme("custom", e.target.value, false);
                      setActiveThemeId("custom");
                      void setSetting("themeId", "custom");
                    }}
                    className="h-10 w-14 cursor-pointer rounded overflow-hidden border-0 bg-transparent p-0"
                    title="Choose a color for a custom Light theme"
                  />
                  <input
                    type="color"
                    onChange={(e) => {
                      applyTheme("custom", e.target.value, true);
                      setActiveThemeId("custom");
                      void setSetting("themeId", "custom");
                    }}
                    className="h-10 w-14 cursor-pointer rounded overflow-hidden border-0 bg-transparent p-0 opacity-80"
                    title="Choose a color for a custom Dark theme"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Language & Layout */}
        <section className="glass space-y-6 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01]">
          <div className="border-b border-border/50 pb-2">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("langDirection")}
            </h2>
          </div>
          <div className="flex gap-3">
            {(["en", "ar"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={
                  lang === l
                    ? "flex-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-4 py-2.5 text-sm font-semibold text-cyan-600 dark:text-cyan-400"
                    : "flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary/80"
                }
              >
                {l === "en" ? t("english") : t("arabic")}
              </button>
            ))}
          </div>
        </section>

        {/* Daily Goal Target */}
        <section className="glass space-y-6 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01]">
          <div className="border-b border-border/50 pb-2">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("dailyFocusTarget")}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={14}
              step={0.5}
              value={goal}
              onChange={(e) => void setSetting("dailyGoalHours", Number(e.target.value))}
              className="flex-1 accent-emerald-500"
            />
            <span className="tabular w-16 text-end font-mono text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {goal} {t("hPerDay")}
            </span>
          </div>
        </section>

        {/* Timer Defaults */}
        <section className="glass space-y-6 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01] md:col-span-2">
          <div className="border-b border-border/50 pb-2">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("timerDefaults")}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("focusDuration")}
              </span>
              <select
                value={focusDuration}
                onChange={(e) => void setSetting("defaultFocusDuration", Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none shadow-inner transition-all hover:border-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <option value={15}>15 {t("mins")}</option>
                <option value={25}>25 {t("minsPomodoro")}</option>
                <option value={45}>45 {t("minsUltradian")}</option>
                <option value={60}>60 {t("mins")}</option>
                <option value={90}>90 {t("minsDeepWork")}</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t("shortBreak")}</span>
              <select
                value={shortBreak}
                onChange={(e) => void setSetting("defaultShortBreak", Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none shadow-inner transition-all hover:border-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <option value={3}>3 {t("mins")}</option>
                <option value={5}>5 {t("mins")}</option>
                <option value={10}>10 {t("mins")}</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t("longBreak")}</span>
              <select
                value={longBreak}
                onChange={(e) => void setSetting("defaultLongBreak", Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none shadow-inner transition-all hover:border-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <option value={15}>15 {t("mins")}</option>
                <option value={20}>20 {t("mins")}</option>
                <option value={30}>30 {t("mins")}</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium">{t("autoStartBreaks")}</span>
            <input
              type="checkbox"
              checked={autoStartBreaks}
              onChange={(e) => void setSetting("autoStartBreaks", e.target.checked)}
              className="size-4 accent-purple-500"
            />
          </div>
        </section>

        {/* Timer Defaults */}
        <section className="glass space-y-6 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01] md:col-span-2">
          <div className="border-b border-border/50 pb-2">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("timerDefaults")}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("focusDuration")}
              </span>
              <select
                value={focusDuration}
                onChange={(e) => void setSetting("defaultFocusDuration", Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none shadow-inner transition-all hover:border-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <option value={15}>15 {t("mins")}</option>
                <option value={25}>25 {t("minsPomodoro")}</option>
                <option value={45}>45 {t("minsUltradian")}</option>
                <option value={60}>60 {t("mins")}</option>
                <option value={90}>90 {t("minsDeepWork")}</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t("shortBreak")}</span>
              <select
                value={shortBreak}
                onChange={(e) => void setSetting("defaultShortBreak", Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none shadow-inner transition-all hover:border-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <option value={3}>3 {t("mins")}</option>
                <option value={5}>5 {t("mins")}</option>
                <option value={10}>10 {t("mins")}</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t("longBreak")}</span>
              <select
                value={longBreak}
                onChange={(e) => void setSetting("defaultLongBreak", Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none shadow-inner transition-all hover:border-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <option value={15}>15 {t("mins")}</option>
                <option value={20}>20 {t("mins")}</option>
                <option value={30}>30 {t("mins")}</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium">{t("autoStartBreaks")}</span>
            <input
              type="checkbox"
              checked={autoStartBreaks}
              onChange={(e) => void setSetting("autoStartBreaks", e.target.checked)}
              className="size-4 accent-purple-500"
            />
          </div>
        </section>

        {/* Behavioral AI & Intelligence Thresholds */}
        <section className="glass space-y-6 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01] md:col-span-2">
          <div className="border-b border-border/50 pb-2">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("behavioralSettings")}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("fatigueSensitivity")}
              </span>
              <select
                value={fatigueSensitivity}
                onChange={(e) => void setSetting("fatigueSensitivity", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none shadow-inner transition-all hover:border-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <option value="low">{t("fatigueLow")}</option>
                <option value="medium">{t("fatigueMed")}</option>
                <option value="high">{t("fatigueHigh")}</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("deepFlowThreshold")}
              </span>
              <select
                value={deepFlowThreshold}
                onChange={(e) => void setSetting("deepFlowThreshold", Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none shadow-inner transition-all hover:border-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <option value={15}>{t("df15")}</option>
                <option value={20}>{t("df20")}</option>
                <option value={30}>{t("df30")}</option>
              </select>
            </label>
          </div>
        </section>

        {/* Audio & Sound Effects */}
        <section className="glass space-y-6 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01] md:col-span-2">
          <div className="border-b border-border/50 pb-2">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("sysNotif")}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">{t("desktopNotif")}</span>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  {t("desktopNotifSub")}
                  <button
                    onClick={() => requestNotificationPermission()}
                    className="text-orange-500 hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <BellRing className="size-3" /> Request System Permission
                  </button>
                </p>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => void setSetting("notificationsEnabled", e.target.checked)}
                className="size-4 accent-orange-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">20-20-20 Eye Break</span>
                <p className="text-xs text-muted-foreground">
                  Every 20 minutes, look 20 feet away for 20 seconds.
                </p>
              </div>
              <input
                type="checkbox"
                checked={eyeBreakEnabled}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  if (checked) {
                    let granted = await isPermissionGranted();
                    if (!granted) {
                      const res = await requestPermission();
                      granted = res === "granted";
                    }
                    if (!granted) {
                      toast.error("Notification permission denied. Cannot enable Eye Breaks.");
                      return;
                    }
                  }
                  void setSetting("eyeBreakEnabled", checked);
                }}
                className="size-4 accent-orange-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">{t("alwaysOnTop")}</span>
                <p className="text-xs text-muted-foreground">{t("alwaysOnTopSub")}</p>
              </div>
              <input
                type="checkbox"
                checked={alwaysOnTop}
                onChange={(e) => void setSetting("alwaysOnTop", e.target.checked)}
                className="size-4 accent-orange-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">{t("tickingSound")}</span>
                <p className="text-xs text-muted-foreground">{t("tickingSoundSub")}</p>
              </div>
              <input
                type="checkbox"
                checked={tickSoundEnabled}
                onChange={(e) => void setSetting("tickSoundEnabled", e.target.checked)}
                className="size-4 accent-orange-500"
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-medium text-muted-foreground">{t("alertVolume")}</span>
              <div className="flex items-center gap-4">
                <Volume2 className="size-4 text-muted-foreground" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={soundVolume}
                  onChange={(e) => void setSetting("soundVolume", Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <span className="tabular w-12 text-end font-mono text-sm font-semibold">
                  {soundVolume}%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* System Integration — Global Shortcuts */}
        <section className="glass space-y-6 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01] md:col-span-2">
          <div className="border-b border-border/50 pb-2">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              System Integration
            </h2>
          </div>

          <div className="space-y-5">
            {/* Global Shortcuts toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Global Keyboard Shortcuts</span>
                <p className="text-xs text-muted-foreground">
                  Control EigenTime from anywhere — even when minimized.
                </p>
              </div>
              <input
                type="checkbox"
                id="globalShortcutsEnabled"
                checked={globalShortcutsEnabled}
                onChange={(e) => void setSetting("globalShortcutsEnabled", e.target.checked)}
                className="size-4 accent-orange-500"
              />
            </div>

            {/* Shortcut reference table */}
            <div
              className={cn(
                "rounded-xl border border-border/50 overflow-hidden transition-opacity",
                !globalShortcutsEnabled && "opacity-40 pointer-events-none",
              )}
            >
              <div className="bg-secondary/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Registered Hotkeys
              </div>
              {(
                [
                  { label: "Play / Pause", combo: ["Ctrl", "Shift", "P"] },
                  { label: "Stop & Reset", combo: ["Ctrl", "Shift", "S"] },
                  { label: "Skip Phase", combo: ["Ctrl", "Shift", "N"] },
                  { label: "Zen Mode", combo: ["Ctrl", "Shift", "Z"] },
                ] as const
              ).map(({ label, combo }) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-t border-border/30 px-4 py-2.5"
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <div className="flex items-center gap-1">
                    {combo.map((key, i) => (
                      <span key={i}>
                        <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-semibold shadow-sm">
                          {key}
                        </kbd>
                        {i < combo.length - 1 && (
                          <span className="mx-0.5 text-muted-foreground text-xs">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tray info note */}
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">System Tray</span> is always active —
              right-click the tray icon for quick timer controls and to show/hide the window.
            </p>
          </div>
        </section>

        {/* Data & Offline Backup */}
        <section className="glass space-y-6 rounded-2xl p-6 sm:p-8 transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01] md:col-span-2">
          <div className="border-b border-border/50 pb-2">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("dataMgmt")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{t("offlineNote")}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => void download()}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <Download className="size-4 text-primary" />
              {t("exportJson")}
            </button>
            <button
              type="button"
              onClick={() => void downloadCsv()}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <Download className="size-4 text-emerald-500" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => void downloadMd()}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <Download className="size-4 text-indigo-500" />
              Markdown
            </button>
            <button
              type="button"
              onClick={() => void downloadEncrypted()}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <Download className="size-4 text-purple-500" />
              Encrypted Backup
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <Upload className="size-4 text-orange-500" />
              {t("importJson")}
            </button>
            <button
              type="button"
              onClick={() => fileEncryptedRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <Upload className="size-4 text-purple-500" />
              Import Encrypted
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
            <input
              ref={fileEncryptedRef}
              type="file"
              accept=".enc"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadEncrypted(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
            >
              <Trash2 className="size-4" />
              {t("resetAll")}
            </button>
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass max-w-md space-y-4 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-destructive">{t("confirmResetTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("confirmResetBody")}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                {t("cancelBtn")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void resetAll().then(() => window.location.reload());
                }}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-md transition-colors hover:bg-destructive/90"
              >
                {t("yesErase")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A small clickable card previewing a single theme */
function ThemeCard({
  theme,
  isActive,
  onSelect,
}: {
  theme: ThemeConfig;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={theme.name}
      className={cn(
        "relative flex flex-col gap-1.5 rounded-xl p-3 text-left transition-all hover:scale-[1.02]",
        isActive ? "ring-2 ring-offset-1" : "opacity-80 hover:opacity-100",
      )}
      style={{
        background: theme.colors.bgGlass,
        border: `1px solid ${theme.colors.borderGlass}`,
        boxShadow: isActive ? `0 0 16px ${theme.colors.accentGlow}` : "none",
      }}
    >
      {/* Color swatch strip */}
      <div className="flex gap-1">
        <span className="h-3 flex-1 rounded-full" style={{ background: theme.colors.bgPrimary }} />
        <span className="h-3 flex-1 rounded-full" style={{ background: theme.colors.accent }} />
        <span className="h-3 flex-1 rounded-full" style={{ background: theme.colors.textMuted }} />
      </div>
      <span
        className="text-[11px] font-semibold leading-tight"
        style={{ color: theme.colors.textMain }}
      >
        {theme.name}
      </span>
      {isActive && (
        <span
          className="absolute top-1.5 right-1.5 size-2 rounded-full"
          style={{ background: theme.colors.accent }}
        />
      )}
    </button>
  );
}
