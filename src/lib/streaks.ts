import { getDb, DailyStat } from "@/lib/db";
import { dayKey } from "@/lib/time";

function getPreviousDay(dayStr: string): string {
  const d = new Date(dayStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0] as string;
}

function getNextDay(dayStr: string): string {
  const d = new Date(dayStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0] as string;
}

function calculateHighestStreak(ascendingStats: DailyStat[]): number {
  let highest = 0;
  let tempHighStreak = 0;
  let lastDaySeen: string | null = null;

  for (const stat of ascendingStats) {
    if (stat.totalSec >= 3600) {
      if (!lastDaySeen) {
        tempHighStreak = 1;
      } else {
        if (getNextDay(lastDaySeen) === stat.day) {
          tempHighStreak++;
        } else {
          tempHighStreak = 1;
        }
      }
      lastDaySeen = stat.day;
      if (tempHighStreak > highest) highest = tempHighStreak;
    }
  }
  return highest;
}

function calculateCurrentStreak(descendingStats: DailyStat[]): number {
  let currentStreak = 0;
  const today = dayKey();
  const yesterday = getPreviousDay(new Date().toISOString().split("T")[0] as string);
  let expectedNextDay: string | null = null;
  let isCurrentStreakValid = true;

  for (const stat of descendingStats) {
    if (stat.totalSec > 0) {
      if (!expectedNextDay) {
        if (stat.day === today || stat.day === yesterday) {
          currentStreak = 1;
          expectedNextDay = getPreviousDay(stat.day);
        } else {
          isCurrentStreakValid = false;
        }
      } else if (isCurrentStreakValid) {
        if (stat.day === expectedNextDay) {
          currentStreak++;
          expectedNextDay = getPreviousDay(stat.day);
        } else {
          isCurrentStreakValid = false;
        }
      }
    }
  }
  return currentStreak;
}

export async function getCurrentStreak(): Promise<{ streak: number; highest: number }> {
  const db = getDb();
  const allStats = await db.dailyStats.orderBy("day").reverse().toArray();

  if (allStats.length === 0) return { streak: 0, highest: 0 };

  const ascendingStats = [...allStats].reverse();
  const highest = calculateHighestStreak(ascendingStats);
  const currentStreak = calculateCurrentStreak(allStats);

  return { streak: currentStreak, highest };
}
