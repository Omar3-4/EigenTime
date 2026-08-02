import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

type Dict = Record<string, { en: string; ar: string }>;

const dict: Dict = {
  appName: { en: "EigenTime", ar: "EigenTime" },
  tagline: { en: "Offline focus system", ar: "نظام تركيز بدون اتصال" },
  dashboard: { en: "Dashboard", ar: "الرئيسية" },
  timer: { en: "Timer", ar: "المؤقت" },
  subjects: { en: "Subjects", ar: "المواد" },
  tasks: { en: "Tasks", ar: "المهام" },
  analytics: { en: "Analytics", ar: "التحليلات" },
  settings: { en: "Settings", ar: "الإعدادات" },

  dailyGoal: { en: "Daily goal", ar: "الهدف اليومي" },
  totalFocused: { en: "Total focused hours", ar: "إجمالي ساعات التركيز" },
  todaySessions: { en: "Today's sessions", ar: "جلسات اليوم" },
  topSubject: { en: "Top subject", ar: "المادة الأكثر دراسة" },
  completionRate: { en: "Productivity rate", ar: "معدل الإنتاجية" },
  todayChecklist: { en: "Today's checklist", ar: "مهام اليوم" },
  schedule: { en: "Daily schedule", ar: "الجدول اليومي" },
  activity: { en: "Activity feed", ar: "سجل النشاط" },
  noneYet: { en: "Nothing yet", ar: "لا يوجد شيء بعد" },

  start: { en: "Start", ar: "بدء" },
  pause: { en: "Pause", ar: "إيقاف مؤقت" },
  resume: { en: "Resume", ar: "متابعة" },
  skip: { en: "Skip", ar: "تخطي" },
  reset: { en: "Reset", ar: "إعادة ضبط" },
  undo: { en: "Undo", ar: "تراجع" },
  redo: { en: "Redo", ar: "إعادة" },
  finish: { en: "Finish", ar: "إنهاء" },
  countUp: { en: "Count up", ar: "تصاعدي" },
  countdown: { en: "Countdown", ar: "تنازلي" },
  focusMode: { en: "Focus", ar: "التركيز" },
  restMode: { en: "Rest", ar: "الراحة" },
  selectSubject: { en: "Select a subject", ar: "اختر مادة" },
  difficulty: { en: "Difficulty", ar: "مستوى الصعوبة" },
  ofGoal: { en: "of goal", ar: "من الهدف" },
  elapsed: { en: "Elapsed", ar: "المنقضي" },
  remaining: { en: "Remaining", ar: "المتبقي" },

  addSubject: { en: "Add subject", ar: "إضافة مادة" },
  subjectName: { en: "Subject name", ar: "اسم المادة" },
  weeklyTarget: { en: "Weekly target (h)", ar: "الهدف الأسبوعي (ساعات)" },
  thisWeek: { en: "This week", ar: "هذا الأسبوع" },
  archive: { en: "Archive", ar: "أرشفة" },
  unarchive: { en: "Unarchive", ar: "إلغاء الأرشفة" },
  remove: { en: "Delete", ar: "حذف" },
  addTask: { en: "Add task", ar: "إضافة مهمة" },
  taskTitle: { en: "What needs doing?", ar: "ما الذي يجب إنجازه؟" },
  noSubject: { en: "No subject", ar: "بدون مادة" },
  done: { en: "Done", ar: "مكتمل" },
  open: { en: "Open", ar: "مفتوح" },

  brainDump: { en: "Brain Dump", ar: "تفريغ الأفكار" },
  activitySuggestion: { en: "Activity Suggestion", ar: "اقتراح نشاط" },

  language: { en: "Language", ar: "اللغة" },
  data: { en: "Data", ar: "البيانات" },
  exportJson: { en: "Export Full Database (JSON)", ar: "تصدير قاعدة البيانات (JSON)" },
  importJson: { en: "Import Backup (JSON)", ar: "استيراد نسخة احتياطية (JSON)" },
  resetAll: { en: "Reset & Purge All Data", ar: "مسح جميع البيانات نهائياً" },
  offlineNote: {
    en: "EigenTime runs completely offline on your device using Dexie.js. Your focus logs, subjects, and analytics are never sent to external servers.",
    ar: "يعمل التطبيق بشكل كامل دون اتصال بالإنترنت. لا يتم إرسال سجلات تركيزك أو موادك أو تحليلاتك إلى أي خوادم خارجية.",
  },
  
  // Settings Page Keys
  visualTheme: { en: "Visual Theme", ar: "المظهر البصري" },
  langDirection: { en: "Language & Direction", ar: "اللغة والاتجاه" },
  english: { en: "English (LTR)", ar: "English (LTR)" },
  arabic: { en: "العربية (RTL)", ar: "العربية (RTL)" },
  dailyFocusTarget: { en: "Daily Focus Target", ar: "هدف التركيز اليومي" },
  hPerDay: { en: "h / day", ar: "س / يوم" },
  timerDefaults: { en: "Timer & Chronograph Defaults", ar: "الإعدادات الافتراضية للمؤقت" },
  focusDuration: { en: "Focus Duration", ar: "مدة التركيز" },
  shortBreak: { en: "Short Break", ar: "استراحة قصيرة" },
  longBreak: { en: "Long Break", ar: "استراحة طويلة" },
  mins: { en: "Minutes", ar: "دقائق" },
  minsPomodoro: { en: "Minutes (Pomodoro)", ar: "دقيقة (بومودورو)" },
  minsUltradian: { en: "Minutes (Ultradian)", ar: "دقيقة (ألتراديان)" },
  minsDeepWork: { en: "Minutes (Deep Work)", ar: "دقيقة (عمل عميق)" },
  autoStartBreaks: { en: "Auto-start Breaks upon Focus Completion", ar: "بدء الاستراحة تلقائياً عند انتهاء التركيز" },
  behavioralSettings: { en: "Behavioral & Predictive Intelligence Settings", ar: "إعدادات الذكاء السلوكي والتنبؤي" },
  fatigueSensitivity: { en: "Predictive Fatigue Early Warning Sensitivity", ar: "حساسية إنذار الإرهاق التنبؤي" },
  fatigueLow: { en: "Low (Alert only after long continuous sessions)", ar: "منخفض (تنبيه بعد الجلسات الطويلة فقط)" },
  fatigueMed: { en: "Medium (Balanced energy drop prediction)", ar: "متوسط (تنبؤ متوازن بانخفاض الطاقة)" },
  fatigueHigh: { en: "High (Proactive early warnings)", ar: "مرتفع (إنذارات استباقية مبكرة)" },
  deepFlowThreshold: { en: "Deep Flow Cyan Glow Activation Threshold", ar: "حد تفعيل التوهج السماوي لحالة التدفق" },
  df15: { en: "15 Minutes of Uninterrupted Focus", ar: "15 دقيقة من التركيز المتواصل" },
  df20: { en: "20 Minutes (Default)", ar: "20 دقيقة (الافتراضي)" },
  df30: { en: "30 Minutes (Deep Concentration)", ar: "30 دقيقة (تركيز عميق)" },
  sysNotif: { en: "System & Notifications", ar: "النظام والإشعارات" },
  desktopNotif: { en: "Desktop Notifications", ar: "إشعارات سطح المكتب" },
  desktopNotifSub: { en: "Show system alerts when a phase completes", ar: "عرض تنبيهات النظام عند انتهاء الجلسة" },
  alwaysOnTop: { en: "Always on Top", ar: "دائماً في المقدمة" },
  alwaysOnTopSub: { en: "Keep the app above other windows", ar: "إبقاء التطبيق فوق النوافذ الأخرى" },
  tickingSound: { en: "Ticking Sound", ar: "صوت التكتكة" },
  tickingSoundSub: { en: "Play a soft tick while the timer runs", ar: "تشغيل صوت تكتكة خفيف أثناء عمل المؤقت" },
  alertVolume: { en: "Alert Volume", ar: "مستوى صوت التنبيه" },
  dataMgmt: { en: "Data Management & 100% Offline Privacy", ar: "إدارة البيانات وخصوصية 100% بدون إنترنت" },
  confirmResetTitle: { en: "Confirm Database Reset", ar: "تأكيد مسح قاعدة البيانات" },
  confirmResetBody: { en: "Are you sure you want to permanently erase all focus sessions, subjects, tasks, and settings? This action cannot be undone.", ar: "هل أنت متأكد أنك تريد مسح جميع الجلسات والمواد والمهام والإعدادات نهائياً؟ هذا الإجراء لا يمكن التراجع عنه." },
  cancelBtn: { en: "Cancel", ar: "إلغاء" },
  yesErase: { en: "Yes, Erase Everything", ar: "نعم، امسح كل شيء" },
  
  heatmapTitle: { en: "365-day activity", ar: "نشاط 365 يوماً" },
  activeDays: { en: "active days", ar: "أيام نشطة" },
  sessions: { en: "sessions", ar: "جلسات" },
  less: { en: "Less", ar: "أقل" },
  more: { en: "More", ar: "أكثر" },
  hoverHint: { en: "Hover a day to see hours and subject breakdown.", ar: "مرر مؤشر الماوس فوق أي يوم لرؤية الساعات وتفاصيل المواد." },
  waveTitle: { en: "Performance wave", ar: "موجة الأداء" },
  waveSub: { en: "Focus energy fluctuation over time", ar: "تقلبات طاقة التركيز بمرور الوقت" },
  weekly: { en: "Weekly", ar: "أسبوعياً" },
  monthly: { en: "Monthly", ar: "شهرياً" },
  focusHours: { en: "Focus hours", ar: "ساعات التركيز" },
  energy: { en: "Energy", ar: "الطاقة" },
  donutTitle: { en: "Subject distribution", ar: "توزيع المواد" },
  donutSub: { en: "Share of total focused time", ar: "نسبة إجمالي وقت التركيز" },
  biorhythm: { en: "Biorhythm & focus periodicity", ar: "الإيقاع الحيوي ودورية التركيز" },
  peakHour: { en: "Peak hour", ar: "ساعة الذروة" },
  lowHour: { en: "Low hour", ar: "ساعة الخمول" },
  periodicity: { en: "Periodicity", ar: "الدورية" },
  flowDriver: { en: "Flow state driver", ar: "محفز حالة التدفق" },
  driver_timeOfDay: { en: "Driven by time of day", ar: "يتأثر بوقت اليوم" },
  driver_subject: { en: "Driven by subject", ar: "يتأثر بالمادة" },
  driver_difficulty: { en: "Driven by difficulty", ar: "يتأثر بمستوى الصعوبة" },
  driver_duration: { en: "Driven by session length", ar: "يتأثر بمدة الجلسة" },
  driver_none: { en: "Not enough data", ar: "بيانات غير كافية" },
  needMoreData: { en: "Log a few more sessions to unlock this model.", ar: "سجل بضع جلسات إضافية لتفعيل هذا النموذج." },
  medianSession: { en: "Median session", ar: "متوسط الجلسة" },
  longestSession: { en: "Longest", ar: "الأطول" },
  stability: { en: "Cognitive stability index", ar: "مؤشر الاستقرار الذهني" },
  dispersion: { en: "Dispersion", ar: "التشتت" },
  dailyAverage: { en: "Daily average", ar: "المتوسط اليومي" },
};

interface I18nValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dict | string) => string;
}

const I18nContext = createContext<I18nValue>({
  lang: "en",
  dir: "ltr",
  setLang: () => {},
  t: (k) => dict[k]?.en ?? String(k),
});

const STORAGE_KEY = "eigentime.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") setLangState(stored);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      t: (key: string) => dict[key]?.[lang] ?? key,
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
