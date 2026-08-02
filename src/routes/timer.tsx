import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ArcTimer } from "@/components/arc-timer";
import { DataGate } from "@/components/data-gate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/timer")({
  head: () => ({
    meta: [
      { title: "Chronograph Timer — EigenTime" },
      {
        name: "description",
        content:
          "Arc ring chronograph with count-up and countdown modes, subject tagging, difficulty scoring and full play, pause, skip, reset, undo controls.",
      },
      { property: "og:title", content: "Chronograph Timer — EigenTime" },
      {
        property: "og:description",
        content: "Precision arc ring focus timer that survives reloads and works fully offline.",
      },
    ],
  }),
  component: TimerPage,
});

function TimerPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("timer")}>
      <DataGate>
        <ArcTimer />
      </DataGate>
    </AppShell>
  );
}
