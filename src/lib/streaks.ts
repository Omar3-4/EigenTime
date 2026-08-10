import { getDb } from "@/lib/db";
import { dayKey } from "@/lib/time";

export async function getCurrentStreak(): Promise<{ streak: number; highest: number }> {
  const db = getDb();
  const allStats = await db.dailyStats.orderBy("day").reverse().toArray();
  
  if (allStats.length === 0) return { streak: 0, highest: 0 };

  let currentStreak = 0;
  let highest = 0;
  let tempStreak = 0;

  // Track highest streak overall
  // and track current streak going backwards from today
  const today = dayKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split("T")[0] as string;

  let expectedNextDay: string | null = null;
  let isCurrentStreakValid = true;

  // We sort ascending for highest streak calculation
  const ascendingStats = [...allStats].reverse();
  let tempHighStreak = 0;
  let lastDaySeen: string | null = null;

  for (const stat of ascendingStats) {
    if (stat.totalSec >= 3600) { // arbitrary 1 hour minimum for streak? Or just any focus?
      // Let's say any focus time counts
      if (!lastDaySeen) {
        tempHighStreak = 1;
      } else {
        const prev = new Date(lastDaySeen);
        prev.setDate(prev.getDate() + 1);
        if (prev.toISOString().split("T")[0] as string === stat.day) {
          tempHighStreak++;
        } else {
          tempHighStreak = 1;
        }
      }
      lastDaySeen = stat.day;
      if (tempHighStreak > highest) highest = tempHighStreak;
    }
  }

  // Calculate current streak
  for (const stat of allStats) {
    if (stat.totalSec > 0) {
      if (!expectedNextDay) {
        if (stat.day === today || stat.day === yesterday) {
          currentStreak = 1;
          const prev = new Date(stat.day);
          prev.setDate(prev.getDate() - 1);
          expectedNextDay = prev.toISOString().split("T")[0] as string;
        } else {
          isCurrentStreakValid = false;
        }
      } else if (isCurrentStreakValid) {
        if (stat.day === expectedNextDay) {
          currentStreak++;
          const prev = new Date(stat.day);
          prev.setDate(prev.getDate() - 1);
          expectedNextDay = prev.toISOString().split("T")[0] as string;
        } else {
          isCurrentStreakValid = false;
        }
      }
    }
  }

  return { streak: currentStreak, highest };
}
