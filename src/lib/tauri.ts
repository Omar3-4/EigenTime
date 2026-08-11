import { isTauri } from "@tauri-apps/api/core";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { playChime } from "./audio";
import { register } from "@tauri-apps/plugin-global-shortcut";

export { unregisterAll, register } from "@tauri-apps/plugin-global-shortcut";

export function checkIsTauri() {
  return isTauri();
}

export async function notify(title: string, body: string) {
  if (isTauri()) {
    try {
      await sendNotification({ title, body });
    } catch (err) {
      console.warn("Native notification failed:", err);
    }
  } else if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

/**
 * Phase-specific notification for Pomodoro timer transitions.
 * Fired when a Focus or Break phase completes.
 */
export async function notifyPhaseComplete(phase: "focus" | "break") {
  const isFocusDone = phase === "focus";
  const title = isFocusDone ? "🎯 Deep Work Session Finished!" : "⚡ Break Over — Back to Flow!";
  const body = isFocusDone
    ? "You crushed it. Time for a well-deserved break."
    : "Ready to step back into your flow state?";
  await notify(title, body);
  playChime().catch(console.warn);
}

/**
 * Daily target achievement notification — fired once per day when the user
 * meets their focus hour goal.
 */
export async function notifyDailyGoalAchieved(hours: number) {
  const title = "🏆 Daily Goal Achieved!";
  const body = `Incredible — you've hit your ${hours}h focus target for today. Outstanding work!`;
  await notify(title, body);
  playChime().catch(console.warn);
}

export async function requestNotificationPermission() {
  if (isTauri()) {
    let permissionGranted = false;
    try {
      const { isPermissionGranted, requestPermission } =
        await import("@tauri-apps/plugin-notification");
      permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }
    } catch (e) {
      console.warn("Tauri notification permission check failed", e);
    }
    return permissionGranted;
  } else if ("Notification" in window) {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }
  return false;
}

export async function registerGlobalShortcut(shortcut: string, handler: () => void) {
  if (isTauri()) {
    try {
      await register(shortcut, (event) => {
        if (event.state === "Pressed") {
          handler();
        }
      });
    } catch (err) {
      console.warn(`Failed to register global shortcut ${shortcut}`, err);
    }
  }
}
