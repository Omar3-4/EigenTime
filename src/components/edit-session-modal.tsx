import { useState } from "react";
import type { Session } from "@/lib/db";
import { updateSession } from "@/lib/repo";
import { Clock, Save, X } from "lucide-react";
import { toast } from "sonner";

export function EditSessionModal({ session, onClose }: { session: Session; onClose: () => void }) {
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
