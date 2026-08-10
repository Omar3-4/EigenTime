import { getDb, type Session } from "./db";
import { getTotalXP } from "./repo";
import { notify } from "./tauri";

export const LEVEL_BASE_XP = 100;

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / LEVEL_BASE_XP)) + 1;
}

export function xpForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * LEVEL_BASE_XP;
}

export function xpForCurrentLevel(currentLevel: number): number {
  return Math.pow(currentLevel - 1, 2) * LEVEL_BASE_XP;
}

export async function evaluateSessionBadges(session: Session) {
  const db = getDb();
  const durationMin = session.durationSec / 60;

  // Badge: "deep_diver" (Single session > 120 mins)
  if (durationMin >= 120) {
    const hasDeepDiver = await db.badges.get("deep_diver");
    if (!hasDeepDiver) {
      await db.badges.put({ id: "deep_diver", unlockedAt: Date.now() });
      await notify("🏆 Badge Unlocked", "Deep Diver: Focus for over 2 hours in a single session.");
    }
  }

  // Badge: "iron_will" (Single session > 240 mins without pause)
  if (durationMin >= 240 && (session.pauseCount ?? 0) === 0) {
    const hasIronWill = await db.badges.get("iron_will");
    if (!hasIronWill) {
      await db.badges.put({ id: "iron_will", unlockedAt: Date.now() });
      await notify("🏆 Badge Unlocked", "Iron Will: Focus for over 4 hours without pausing.");
    }
  }
}

export async function processSessionCompletion(session: Session) {
  if (session.mode === "focus") {
    const totalXp = await getTotalXP();
    const oldLevel = calculateLevel(totalXp - (session.xp ?? 0));
    const newLevel = calculateLevel(totalXp);
    
    if (newLevel > oldLevel) {
      await notify(
        "🎉 Level Up!",
        `You reached Level ${newLevel}! Keep up the great work.`
      );
    }
  }

  await evaluateSessionBadges(session);
}
