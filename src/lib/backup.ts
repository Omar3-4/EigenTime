import { exportAll, getSetting, setSetting } from "./repo";
import { writeTextFile, BaseDirectory, mkdir, exists } from "@tauri-apps/plugin-fs";
import { z } from "zod";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function performAutomatedBackup(): Promise<void> {
  try {
    const lastBackupTime = await getSetting("lastBackupTimestamp", 0, z.number());
    const now = Date.now();

    if (now - lastBackupTime > SEVEN_DAYS_MS) {
      console.log("Starting automated weekly backup...");
      
      const backupData = await exportAll();
      const dateString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const fileName = `eigentime-backup-${dateString}.json`;
      const backupDirPath = "EigenTime_Backups";
      
      // Ensure the directory exists
      const dirExists = await exists(backupDirPath, { baseDir: BaseDirectory.Document });
      if (!dirExists) {
        await mkdir(backupDirPath, { baseDir: BaseDirectory.Document, recursive: true });
      }

      const filePath = `${backupDirPath}/${fileName}`;
      await writeTextFile(filePath, backupData, { baseDir: BaseDirectory.Document });
      
      await setSetting("lastBackupTimestamp", now);
      console.log(`Automated backup successful: ${filePath}`);
    }
  } catch (error) {
    console.error("Failed to perform automated backup:", error);
    // Silent fail in background, can be checked in logs.
  }
}
