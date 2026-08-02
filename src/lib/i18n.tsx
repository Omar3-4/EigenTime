import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

type Dict = Record<string, { en: string; ar: string }>;

const dict: Dict = {
  appName: { en: "EigenTime", ar: "آيجن تايم" },
  tagline: { en: "Offline focus system", ar: "نظام تركيز بلا إنترنت" },
  dashboard: { en: "Dashboard", ar: "الرئيسية" },
  timer: { en: "Timer", ar: "المؤقّت" },
  subjects: { en: "Subjects", ar: "المواد" },
  tasks: { en: "Tasks", ar: "المهام" },
  analytics: { en: "Analytics", ar: "التحليلات" },
  settings: { en: "Settings", ar: "الإعدادات" },

  dailyGoal: { en: "Daily goal", ar: "الهدف اليومي" },
  totalFocused: { en: "Total focused hours", ar: "مجموع ساعات التركيز" },
  todaySessions: { en: "Today's sessions", ar: "جلسات اليوم" },
  topSubject: { en: "Top subject", ar: "المادة الأبرز" },
  completionRate: { en: "Productivity rate", ar: "نسبة الإنتاجية" },
  todayChecklist: { en: "Today's checklist", ar: "قائمة اليوم" },
  schedule: { en: "Daily schedule", ar: "جدول اليوم" },
  activity: { en: "Activity feed", ar: "سجل النشاط" },
  noneYet: { en: "Nothing yet", ar: "لا يوجد بعد" },

  start: { en: "Start", ar: "ابدأ" },
  pause: { en: "Pause", ar: "إيقاف مؤقت" },
  resume: { en: "Resume", ar: "استئناف" },
  skip: { en: "Skip", ar: "تخطّي" },
  reset: { en: "Reset", ar: "تصفير" },
  undo: { en: "Undo", ar: "تراجع" },
  redo: { en: "Redo", ar: "إعادة" },
  finish: { en: "Finish", ar: "إنهاء" },
  countUp: { en: "Count up", ar: "تصاعدي" },
  countdown: { en: "Countdown", ar: "تنازلي" },
  focusMode: { en: "Focus", ar: "تركيز" },
  restMode: { en: "Rest", ar: "راحة" },
  selectSubject: { en: "Select a subject", ar: "اختر مادة" },
  difficulty: { en: "Difficulty", ar: "الصعوبة" },
  ofGoal: { en: "of goal", ar: "من الهدف" },
  elapsed: { en: "Elapsed", ar: "المنقضي" },
  remaining: { en: "Remaining", ar: "المتبقي" },

  addSubject: { en: "Add subject", ar: "إضافة مادة" },
  subjectName: { en: "Subject name", ar: "اسم المادة" },
  weeklyTarget: { en: "Weekly target (h)", ar: "الهدف الأسبوعي (س)" },
  thisWeek: { en: "This week", ar: "هذا الأسبوع" },
  archive: { en: "Archive", ar: "أرشفة" },
  unarchive: { en: "Unarchive", ar: "إلغاء الأرشفة" },
  remove: { en: "Delete", ar: "حذف" },
  addTask: { en: "Add task", ar: "إضافة مهمة" },
  taskTitle: { en: "What needs doing?", ar: "ما الذي يجب إنجازه؟" },
  noSubject: { en: "No subject", ar: "بدون مادة" },
  done: { en: "Done", ar: "مكتمل" },
  open: { en: "Open", ar: "مفتوح" },

  language: { en: "Language", ar: "اللغة" },
  data: { en: "Data", ar: "البيانات" },
  exportJson: { en: "Export JSON", ar: "تصدير JSON" },
  importJson: { en: "Import JSON", ar: "استيراد JSON" },
  resetAll: { en: "Erase all data", ar: "مسح كل البيانات" },
  offlineNote: {
    en: "All data lives on this device. Nothing is ever sent to a server.",
    ar: "كل البيانات محفوظة على هذا الجهاز ولا تُرسل إلى أي خادم.",
  },
  heatmapTitle: { en: "365-day activity", ar: "نشاط 365 يومًا" },
  activeDays: { en: "active days", ar: "أيام نشطة" },
  sessions: { en: "sessions", ar: "جلسات" },
  less: { en: "Less", ar: "أقل" },
  more: { en: "More", ar: "أكثر" },
  hoverHint: { en: "Hover a day to see hours and subject breakdown.", ar: "مرّر فوق يوم لعرض الساعات وتوزيع المواد." },
  waveTitle: { en: "Performance wave", ar: "موجة الأداء" },
  waveSub: { en: "Focus energy fluctuation over time", ar: "تذبذب طاقة التركيز عبر الزمن" },
  weekly: { en: "Weekly", ar: "أسبوعي" },
  monthly: { en: "Monthly", ar: "شهري" },
  focusHours: { en: "Focus hours", ar: "ساعات التركيز" },
  energy: { en: "Energy", ar: "الطاقة" },
  donutTitle: { en: "Subject distribution", ar: "توزيع المواد" },
  donutSub: { en: "Share of total focused time", ar: "نسبة إجمالي وقت التركيز" },
  biorhythm: { en: "Biorhythm & focus periodicity", ar: "الإيقاع الحيوي ودورية التركيز" },
  peakHour: { en: "Peak hour", ar: "ساعة الذروة" },
  lowHour: { en: "Low hour", ar: "أضعف ساعة" },
  periodicity: { en: "Periodicity", ar: "الدورية" },
  flowDriver: { en: "Flow state driver", ar: "محرّك حالة التدفق" },
  driver_timeOfDay: { en: "Driven by time of day", ar: "يتأثر بوقت اليوم" },
  driver_subject: { en: "Driven by subject", ar: "يتأثر بالمادة" },
  driver_difficulty: { en: "Driven by difficulty", ar: "يتأثر بالصعوبة" },
  driver_duration: { en: "Driven by session length", ar: "يتأثر بطول الجلسة" },
  driver_none: { en: "Not enough data", ar: "بيانات غير كافية" },
  needMoreData: { en: "Log a few more sessions to unlock this model.", ar: "سجّل المزيد من الجلسات لتفعيل هذا النموذج." },
  medianSession: { en: "Median session", ar: "وسيط الجلسة" },
  longestSession: { en: "Longest", ar: "الأطول" },
  stability: { en: "Cognitive stability index", ar: "مؤشر الاستقرار الذهني" },
  dispersion: { en: "Dispersion", ar: "التشتت" },
  dailyAverage: { en: "Daily average", ar: "المتوسط اليومي" },
  fatigue: { en: "Predictive fatigue warning", ar: "إنذار الإرهاق التنبؤي" },
  fatigue_low: { en: "Low risk — capacity available", ar: "خطر منخفض — طاقة متاحة" },
  fatigue_moderate: { en: "Moderate — schedule a rest block", ar: "متوسط — خطّط لفترة راحة" },
  fatigue_high: { en: "High — stop and recover", ar: "مرتفع — توقّف واسترح" },
  todayLoad: { en: "Today", ar: "اليوم" },
  threeDayLoad: { en: "3-day load", ar: "حمل 3 أيام" },
  withinDayDecline: { en: "Decline", ar: "الانحدار" },
  nextTask: { en: "Next-task predictor", ar: "توقّع المهمة التالية" },
  reason_hourAffinity: { en: "Matches this hour's focus pattern", ar: "يطابق نمط التركيز في هذه الساعة" },
  reason_subjectMomentum: { en: "Momentum on this subject", ar: "زخم على هذه المادة" },
  reason_dueToday: { en: "Due today", ar: "مستحق اليوم" },
  reason_queue: { en: "Next in your queue", ar: "التالي في قائمتك" },
  reason_none: { en: "—", ar: "—" },
  confidence: { en: "Confidence", ar: "الثقة" },
  noOpenTasks: { en: "No open tasks — add one to get a prediction.", ar: "لا توجد مهام مفتوحة — أضف مهمة للحصول على توقّع." },
  analyticsIntro: { en: "Every model below is computed on-device from your local session log.", ar: "تُحسب كل النماذج أدناه على جهازك من سجل جلساتك المحلي." },
  analyticsSoon: { en: "Behavioral analytics", ar: "التحليلات السلوكية" },
  analyticsSoonBody: {
    en: "EigenTime is already recording every session, task and schedule block these models need. The predictive layer lands in the next phase.",
    ar: "يسجّل التطبيق كل جلسة ومهمة وكتلة زمنية تحتاجها هذه النماذج. طبقة التنبؤ ستصل في المرحلة القادمة.",
  },
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
