import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CheckSquare,
  Gauge,
  LayoutDashboard,
  Layers,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  Languages,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/timer", key: "timer", icon: TimerIcon },
  { to: "/subjects", key: "subjects", icon: Layers },
  { to: "/tasks", key: "tasks", icon: CheckSquare },
  { to: "/analytics", key: "analytics", icon: BarChart3 },
  { to: "/settings", key: "settings", icon: SettingsIcon },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { t, lang, setLang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [today, setToday] = useState("");

  // Rendered after hydration only — the server clock can be on a different day.
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString(lang === "ar" ? "ar" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short",
      }),
    );
  }, [lang]);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 p-4 md:flex">
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-4">
          <div
            className="flex size-10 items-center justify-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-focus)" }}
          >
            <Gauge className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">{t("appName")}</p>
            <p className="truncate text-xs text-muted-foreground">{t("tagline")}</p>
          </div>
        </div>

        <nav className="glass flex flex-1 flex-col gap-1 rounded-2xl p-3">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-focus-soft text-focus-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{t(item.key)}</span>
              </Link>
            );
          })}
          <div className="mt-auto rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
            {t("offlineNote")}
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 px-4 pt-4">
          <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <h1 className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{title}</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">
              {today}
            </p>
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary"
            >
              <Languages className="size-4" />
              {lang === "en" ? "العربية" : "English"}
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4">{children}</main>

        <nav className="glass sticky bottom-0 z-20 m-4 flex items-center justify-between rounded-2xl p-2 md:hidden">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium",
                  active ? "bg-focus-soft text-focus-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
