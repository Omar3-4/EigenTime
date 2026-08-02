import type { SubjectColor } from "@/lib/db";

export const subjectColorVar: Record<SubjectColor, string> = {
  focus: "var(--focus)",
  subject: "var(--subject)",
  productivity: "var(--productivity)",
  elapsed: "var(--elapsed)",
  goal: "var(--goal)",
};

export const subjectSoftVar: Record<SubjectColor, string> = {
  focus: "var(--focus-soft)",
  subject: "var(--subject-soft)",
  productivity: "var(--productivity-soft)",
  elapsed: "var(--elapsed-soft)",
  goal: "var(--goal-soft)",
};

export const subjectColors: SubjectColor[] = [
  "focus",
  "subject",
  "productivity",
  "elapsed",
  "goal",
];
