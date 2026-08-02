import { useState } from "react";
import { Calculator, Play, Plus, Trash2, X } from "lucide-react";
import type { Subject } from "@/lib/db";
import { cn } from "@/lib/utils";

export interface PlaylistConfig {
  subjectId: string | null;
  mode: "stopwatch" | "pomodoro";
  pomoFocusSec?: number;
  pomoBreakSec?: number;
  pomoRounds?: number;
  targetSec?: number;
}

export function BlockGeneratorModal({
  subjects,
  onGenerate,
  onClose,
}: {
  subjects: Subject[];
  onGenerate: (playlist: PlaylistConfig[]) => void;
  onClose: () => void;
}) {
  const [totalMinutes, setTotalMinutes] = useState(240);
  const [sliceStyle, setSliceStyle] = useState<"25_5" | "50_10">("25_5");
  
  const [selected, setSelected] = useState<{ subjectId: string; weight: number }[]>([]);

  const addSubject = (id: string) => {
    if (selected.find(s => s.subjectId === id)) return;
    setSelected([...selected, { subjectId: id, weight: 1 }]);
  };

  const removeSubject = (id: string) => {
    setSelected(selected.filter(s => s.subjectId !== id));
  };

  const updateWeight = (id: string, weight: number) => {
    setSelected(selected.map(s => s.subjectId === id ? { ...s, weight: Math.max(1, weight) } : s));
  };

  const handleGenerate = () => {
    if (selected.length === 0) return;
    
    const totalWeight = selected.reduce((sum, s) => sum + s.weight, 0);
    
    // 1. Proportional distribution
    let allocations = selected.map(s => ({
      subjectId: s.subjectId,
      rawMinutes: (s.weight / totalWeight) * totalMinutes,
      finalMinutes: 0
    }));

    // 2. Quantization (snap to 10 mins)
    allocations.forEach(a => {
      a.finalMinutes = Math.round(a.rawMinutes / 10) * 10;
    });

    // 3. Reconcile remainders < 15 mins by folding into the largest block
    const allocatedSum = allocations.reduce((sum, a) => sum + a.finalMinutes, 0);
    let remainder = totalMinutes - allocatedSum;
    
    if (Math.abs(remainder) > 0 && Math.abs(remainder) < 15) {
      // Find largest block
      allocations.sort((a, b) => b.finalMinutes - a.finalMinutes);
      if (allocations[0]) if (allocations[0]) if (allocations[0]) allocations[0].finalMinutes += remainder;
    } else if (Math.abs(remainder) >= 15) {
      // If remainder is large, just give it to the largest block or distribute (for simplicity, give to largest)
      allocations.sort((a, b) => b.finalMinutes - a.finalMinutes);
      if (allocations[0]) allocations[0].finalMinutes += remainder;
    }

    // Sort back to original order
    const orderMap = new Map(selected.map((s, i) => [s.subjectId, i]));
    allocations.sort((a, b) => orderMap.get(a.subjectId)! - orderMap.get(b.subjectId)!);

    // 4. Slicing into Pomodoros
    const playlist: PlaylistConfig[] = allocations.filter(a => a.finalMinutes > 0).map(a => {
      const focusMin = sliceStyle === "25_5" ? 25 : 50;
      const breakMin = sliceStyle === "25_5" ? 5 : 10;
      const cycleMin = focusMin + breakMin;
      
      const rounds = Math.max(1, Math.round(a.finalMinutes / cycleMin));
      
      return {
        subjectId: a.subjectId,
        mode: "pomodoro",
        pomoFocusSec: focusMin * 60,
        pomoBreakSec: breakMin * 60,
        pomoRounds: rounds,
        targetSec: a.finalMinutes * 60, // approximate total length
      };
    });

    onGenerate(playlist);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calculator className="size-5 text-emerald-500" />
            Block Generator Pipeline
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Total Time */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Available Time (Minutes)
            </label>
            <input 
              type="number"
              min={10}
              step={10}
              value={totalMinutes}
              onChange={e => setTotalMinutes(Number(e.target.value))}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 outline-none focus:border-[var(--focus)] transition-colors"
            />
          </div>

          {/* Slicing Style */}
          <div>
             <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Pomodoro Slicing Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setSliceStyle("25_5")}
                className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition-colors", sliceStyle === "25_5" ? "bg-[var(--focus-soft)] text-[var(--focus-foreground)] border border-[var(--focus)]" : "bg-secondary text-muted-foreground")}
              >
                25m Focus + 5m Break
              </button>
              <button 
                onClick={() => setSliceStyle("50_10")}
                className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition-colors", sliceStyle === "50_10" ? "bg-[var(--focus-soft)] text-[var(--focus-foreground)] border border-[var(--focus)]" : "bg-secondary text-muted-foreground")}
              >
                50m Focus + 10m Break
              </button>
            </div>
          </div>

          {/* Subjects */}
          <div>
             <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Subjects & Relative Weights
            </label>
            <div className="space-y-2 mb-3">
              {selected.map(s => {
                const sub = subjects.find(x => x.id === s.subjectId);
                return (
                  <div key={s.subjectId} className="flex items-center gap-2 bg-secondary/50 p-2 rounded-xl border border-border">
                    <span className="flex-1 text-sm font-medium pl-2 truncate">{sub?.name}</span>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-muted-foreground">Weight:</span>
                       <input 
                         type="number" 
                         min={1} 
                         value={s.weight} 
                         onChange={e => updateWeight(s.subjectId, Number(e.target.value))}
                         className="w-16 bg-background rounded-lg px-2 py-1 text-sm text-center border outline-none"
                       />
                       <button onClick={() => removeSubject(s.subjectId)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg">
                         <Trash2 className="size-4" />
                       </button>
                    </div>
                  </div>
                )
              })}
              {selected.length === 0 && <p className="text-sm text-muted-foreground py-2 italic">No subjects added to pipeline.</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              {subjects.filter(s => !selected.find(sel => sel.subjectId === s.id)).map(s => (
                <button 
                  key={s.id}
                  onClick={() => addSubject(s.id)}
                  className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-muted-foreground text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border"
                >
                  <Plus className="size-3" /> {s.name}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            onClick={handleGenerate}
            disabled={selected.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            style={{ background: "var(--gradient-focus)" }}
          >
            <Play className="size-4" /> Generate & Queue Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}
