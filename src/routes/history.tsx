import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DataGate } from "@/components/data-gate";
import { useLiveQuery } from "dexie-react-hooks";
import { allSessions, deleteSession, updateSession, listSubjects } from "@/lib/repo";
import { useI18n } from "@/lib/i18n";
import { useState, useMemo } from "react";
import type { Session, Subject } from "@/lib/db";
import { Trash2, Edit2, Clock, X, Save } from "lucide-react";
import { formatHoursShort, formatHMS } from "@/lib/time";
import { getSubjectColor, getSubjectSoftColor } from "@/lib/subject-colors";
import { toast } from "sonner";
import { EditSessionModal } from "@/components/edit-session-modal";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [{ title: "Session History — EigenTime" }],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("history") || "Session History"}>
      <DataGate>
        <HistoryBody />
      </DataGate>
    </AppShell>
  );
}

function HistoryBody() {
  const { lang } = useI18n();
  const sessions = useLiveQuery(() => allSessions(), [], []);
  const subjects = useLiveQuery(() => listSubjects(), [], []);

  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    if (subjects) {
      for (const s of subjects) map.set(s.id, s);
    }
    return map;
  }, [subjects]);

  const grouped = useMemo(() => {
    if (!sessions) return [];
    const groups: { dateStr: string; dateVal: number; items: Session[] }[] = [];
    let currentGroup: { dateStr: string; dateVal: number; items: Session[] } | null = null;

    for (const s of sessions) {
      const d = new Date(s.startedAt);
      const dateStr = d.toLocaleDateString(lang === "ar" ? "ar" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      
      // We assume sessions is already sorted by startedAt descending (from repo)
      if (!currentGroup || currentGroup.dateStr !== dateStr) {
        currentGroup = { dateStr, dateVal: d.getTime(), items: [s] };
        groups.push(currentGroup);
      } else {
        currentGroup.items.push(s);
      }
    }
    return groups;
  }, [sessions, lang]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this session? This will recalculate all analytics.")) {
      await deleteSession(id);
      toast.success("Session deleted");
    }
  };

  if (!sessions) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {grouped.map((group) => (
        <div key={group.dateStr} className="space-y-3">
          <h2 className="sticky top-16 z-10 bg-background/80 py-2 backdrop-blur-md text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {group.dateStr}
          </h2>
          <div className="glass overflow-hidden rounded-2xl">
            {group.items.map((session, idx) => {
              const subj = session.subjectId ? subjectMap.get(session.subjectId) : undefined;
              const color = subj?.color ?? "slate";
              
              const start = new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(session.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div 
                  key={session.id} 
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 transition-colors hover:bg-white/5 ${idx !== group.items.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold"
                      style={{
                        backgroundColor: getSubjectSoftColor(color),
                        color: getSubjectColor(color),
                      }}
                    >
                      {subj?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="font-semibold">{subj?.name || "Uncategorized"}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="capitalize">{session.mode}</span>
                        <span>•</span>
                        <span className="font-mono">{start} - {end}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="font-mono font-medium text-lg">
                        {formatHMS(session.durationSec)}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        Duration
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingSession(session)}
                        className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                        title="Edit Session"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(session.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {editingSession && (
        <EditSessionModal 
          session={editingSession} 
          onClose={() => setEditingSession(null)} 
        />
      )}
    </div>
  );
}


