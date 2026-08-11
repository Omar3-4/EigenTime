import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getCurrentStreak } from "@/lib/streaks";
import { getDb } from "@/lib/db";
import { getTotalXP } from "@/lib/repo";
import { calculateLevel, xpForNextLevel, xpForCurrentLevel } from "@/lib/gamification";
import { Trophy, Flame, Star, Medal } from "lucide-react";

export function GamificationProfile() {
  const [streak, setStreak] = useState({ streak: 0, highest: 0 });

  const xp = useLiveQuery(() => getTotalXP(), []) ?? 0;
  const badges = useLiveQuery(() => getDb().badges.toArray(), []) ?? [];

  useEffect(() => {
    async function load() {
      const st = await getCurrentStreak();
      setStreak(st);
    }
    load();
  }, []);

  const level = calculateLevel(xp);
  const currentLevelXp = xpForCurrentLevel(level);
  const nextLevelXp = xpForNextLevel(level);
  const progressPercent = Math.max(
    0,
    Math.min(100, ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100),
  );

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Level & XP */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Star size={24} />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold text-lg text-card-foreground">Scholar Lv. {level}</h3>
            <span className="text-xs text-muted-foreground">{xp.toFixed(0)} XP</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streaks */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
          <Flame size={24} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Current Streak</h3>
          <p className="text-2xl font-bold text-card-foreground">
            {streak.streak} <span className="text-sm font-normal text-muted-foreground">Days</span>
          </p>
        </div>
        <div className="ml-auto text-right">
          <h3 className="text-xs font-medium text-muted-foreground">Highest</h3>
          <p className="text-sm font-bold text-card-foreground">{streak.highest}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
          <Trophy size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-muted-foreground">Badges Unlocked</h3>
          <p className="text-2xl font-bold text-card-foreground">{badges.length}</p>
        </div>
        <div className="flex gap-1">
          {badges.map((b) => (
            <div key={b.id} title={b.id} className="text-yellow-500">
              <Medal size={20} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
