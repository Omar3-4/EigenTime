import type { SubjectColor } from "@/lib/db";

export const subjectColorVar: Record<string, string> = {
  focus: "var(--focus)",
  subject: "var(--subject)",
  productivity: "var(--productivity)",
  elapsed: "var(--elapsed)",
  goal: "var(--goal)",
};

export const subjectSoftVar: Record<string, string> = {
  focus: "var(--focus-soft)",
  subject: "var(--subject-soft)",
  productivity: "var(--productivity-soft)",
  elapsed: "var(--elapsed-soft)",
  goal: "var(--goal-soft)",
};

export const subjectPresetSwatches = [
  { name: "Cyan Focus", value: "focus", color: "#06b6d4" },
  { name: "Purple Subject", value: "subject", color: "#a855f7" },
  { name: "Orange Metric", value: "productivity", color: "#f97316" },
  { name: "Blue Elapsed", value: "elapsed", color: "#3b82f6" },
  { name: "Emerald Goal", value: "goal", color: "#10b981" },
  { name: "Rose Accent", value: "#f43f5e", color: "#f43f5e" },
  { name: "Amber Glow", value: "#f59e0b", color: "#f59e0b" },
  { name: "Indigo Deep", value: "#6366f1", color: "#6366f1" },
];

export const subjectColors: SubjectColor[] = [
  "focus",
  "subject",
  "productivity",
  "elapsed",
  "goal",
];

export function getSubjectColor(color: string): string {
  if (color in subjectColorVar) return subjectColorVar[color] ?? color;
  return color;
}

export function getSubjectSoftColor(color: string): string {
  if (color in subjectSoftVar) return subjectSoftVar[color] ?? "rgba(168, 85, 247, 0.15)";
  if (color.startsWith("#")) {
    return `${color}20`; // 12% opacity soft background
  }
  return "rgba(168, 85, 247, 0.15)";
}
