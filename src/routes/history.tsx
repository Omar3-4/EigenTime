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

function EditSessionModal({ session, onClose }: { session: Session; onClose: () => void }) {
  // We use local state strings for input fields
  // To deal with timezone offsets for datetime-local, we build local ISO string manually
  const toLocalISOString = (timestamp: number) => {
    const d = new Date(timestamp);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  
  const [startStr, setStartStr] = useState(() => toLocalISOString(session.startedAt));
  const [endStr, setEndStr] = useState(() => toLocalISOString(session.endedAt));
  const [durationMin, setDurationMin] = useState(() => String(Math.round(session.durationSec / 60)));

  // If user modifies start or end, update duration
  const handleStartChange = (v: string) => {
    setStartStr(v);
    const s = new Date(v).getTime();
    const e = new Date(endStr).getTime();
    if (s && e && e > s) {
      setDurationMin(String(Math.round((e - s) / 60000)));
    }
  };

  const handleEndChange = (v: string) => {
    setEndStr(v);
    const s = new Date(startStr).getTime();
    const e = new Date(v).getTime();
    if (s && e && e > s) {
      setDurationMin(String(Math.round((e - s) / 60000)));
    }
  };

  // If user modifies duration, update end based on start
  const handleDurationChange = (v: string) => {
    setDurationMin(v);
    const mins = parseInt(v, 10);
    const s = new Date(startStr).getTime();
    if (!isNaN(mins) && s) {
      const newEnd = new Date(s + mins * 60000);
      setEndStr(toLocalISOString(newEnd.getTime()));
    }
  };

  const handleSave = async () => {
    const sTime = new Date(startStr).getTime();
    const eTime = new Date(endStr).getTime();
    let dSec = parseInt(durationMin, 10) * 60;
    
    if (isNaN(sTime) || isNaN(eTime) || isNaN(dSec) || dSec < 0) {
      toast.error("Invalid session times.");
      return;
    }

    // Ensure the duration matches the math strictly if we want to be exact, 
    // or just trust the duration input. We will explicitly update endedAt to match start + duration.
    const finalEndedAt = sTime + dSec * 1000;

    await updateSession(session.id, {
      startedAt: sTime,
      endedAt: finalEndedAt,
      durationSec: dSec,
    });
    toast.success("Session updated successfully");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Clock className="size-5 text-focus" /> Edit Session
        </h2>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest ml-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={startStr}
              onChange={(e) => handleStartChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-medium focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest ml-1">
              End Time
            </label>
            <input
              type="datetime-local"
              value={endStr}
              onChange={(e) => handleEndChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-medium focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus"
            />
          </div>
          
          <div className="space-y-1 pt-2 border-t border-white/10">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest ml-1">
              Total Duration (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={durationMin}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-mono focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-focus px-5 py-2 text-sm font-medium text-focus-foreground shadow transition-transform hover:scale-105 active:scale-95"
          >
            <Save className="size-4" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
