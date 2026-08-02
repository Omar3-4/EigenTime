/**
 * EigenTime Theme System
 *
 * 15 hand-crafted themes across 5 categories.
 * Redesigned with a majority of soft, anti-glare light backgrounds (~90% brightness)
 * paired with deep, sharp text for comfortable extended focus sessions without eye strain.
 */

export interface ThemeConfig {
  id: string;
  name: string;
  category: 'dark' | 'dim' | 'warm' | 'cyber' | 'light';
  colors: {
    bgPrimary: string;
    bgGlass: string;
    borderGlass: string;
    textMain: string;
    textMuted: string;
    accent: string;
    accentGlow: string;
  };
}

export const EIGENTIME_THEMES: ThemeConfig[] = [
  // ─── 1. LIGHT — Soft Anti-Glare Light (90% Brightness) ─────────────────────
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    category: 'light',
    colors: {
      bgPrimary: '#e2e8f0',           // 90% soft slate ice
      bgGlass: 'rgba(255, 255, 255, 0.90)',
      borderGlass: 'rgba(51, 65, 85, 0.16)',
      textMain: '#0f172a',            // deep slate navy
      textMuted: '#475569',
      accent: '#2563eb',             // vivid sapphire
      accentGlow: 'rgba(37, 99, 235, 0.25)',
    },
  },
  {
    id: 'gradz-glassgreeny',
    name: 'Greeny Glass',
    category: 'light',
    colors: {
      bgPrimary: '#f8fafc',           // Warm Slate 50
      bgGlass: 'rgba(255, 255, 255, 0.7)',
      borderGlass: 'rgba(226, 232, 240, 0.8)',
      textMain: '#0f172a',            // Slate 900
      textMuted: '#64748b',           // Slate 500
      accent: '#059669',              // Emerald 600
      accentGlow: 'rgba(5, 150, 105, 0.25)',
    },
  },
  {
    id: 'soft-alabaster',
    name: 'Soft Alabaster',
    category: 'light',
    colors: {
      bgPrimary: '#e9ecef',           // 90% soft neutral alabaster
      bgGlass: 'rgba(255, 255, 255, 0.92)',
      borderGlass: 'rgba(30, 41, 59, 0.16)',
      textMain: '#1e293b',
      textMuted: '#64748b',
      accent: '#0ea5e9',             // electric sky blue
      accentGlow: 'rgba(14, 165, 233, 0.25)',
    },
  },
  {
    id: 'muted-sage',
    name: 'Muted Sage',
    category: 'light',
    colors: {
      bgPrimary: '#e2ebd8',           // 90% soft sage green
      bgGlass: 'rgba(255, 255, 255, 0.90)',
      borderGlass: 'rgba(20, 83, 45, 0.16)',
      textMain: '#064e3b',            // deep forest green
      textMuted: '#166534',
      accent: '#10b981',             // emerald accent
      accentGlow: 'rgba(16, 185, 129, 0.25)',
    },
  },

  // ─── 2. WARM — Soft Warm Paper & Sand (90% Brightness) ──────────────────────
  {
    id: 'warm-parchment',
    name: 'Warm Parchment',
    category: 'warm',
    colors: {
      bgPrimary: '#ebe5d8',           // 90% soft warm parchment
      bgGlass: 'rgba(255, 255, 255, 0.90)',
      borderGlass: 'rgba(120, 53, 15, 0.16)',
      textMain: '#451a03',            // deep mahogany
      textMuted: '#78350f',
      accent: '#d97706',             // rich amber
      accentGlow: 'rgba(217, 119, 6, 0.25)',
    },
  },
  {
    id: 'desert-sand',
    name: 'Desert Sand',
    category: 'warm',
    colors: {
      bgPrimary: '#eee6de',           // 90% soft desert sand
      bgGlass: 'rgba(255, 255, 255, 0.90)',
      borderGlass: 'rgba(154, 52, 18, 0.16)',
      textMain: '#431407',            // deep sienna
      textMuted: '#9a3412',
      accent: '#ea580c',             // ember orange
      accentGlow: 'rgba(234, 88, 12, 0.25)',
    },
  },
  {
    id: 'soft-rosewood',
    name: 'Soft Rosewood',
    category: 'warm',
    colors: {
      bgPrimary: '#f0e4e6',           // 90% soft dusty rose
      bgGlass: 'rgba(255, 255, 255, 0.90)',
      borderGlass: 'rgba(159, 18, 57, 0.16)',
      textMain: '#4c0519',            // deep burgundy
      textMuted: '#881337',
      accent: '#e11d48',             // rose accent
      accentGlow: 'rgba(225, 29, 72, 0.25)',
    },
  },

  // ─── 3. CYBER — Soft Cyber Pastel & Cyber Dark ─────────────────────────────
  {
    id: 'cyber-lavender',
    name: 'Cyber Lavender',
    category: 'cyber',
    colors: {
      bgPrimary: '#e7e0f2',           // 90% soft lavender mist
      bgGlass: 'rgba(255, 255, 255, 0.90)',
      borderGlass: 'rgba(109, 40, 217, 0.18)',
      textMain: '#2e1065',            // deep violet
      textMuted: '#5b21b6',
      accent: '#9333ea',             // vivid purple
      accentGlow: 'rgba(147, 51, 234, 0.30)',
    },
  },
  {
    id: 'cyan-ice',
    name: 'Cyan Ice',
    category: 'cyber',
    colors: {
      bgPrimary: '#deeff2',           // 90% soft cyan ice
      bgGlass: 'rgba(255, 255, 255, 0.90)',
      borderGlass: 'rgba(14, 116, 144, 0.18)',
      textMain: '#083344',            // deep cyan navy
      textMuted: '#155e75',
      accent: '#06b6d4',             // electric cyan
      accentGlow: 'rgba(6, 182, 212, 0.30)',
    },
  },
  {
    id: 'neon-synth',
    name: 'Neon Synth',
    category: 'cyber',
    colors: {
      bgPrimary: '#120924',           // deep synth dark
      bgGlass: 'rgba(28, 14, 52, 0.92)',
      borderGlass: 'rgba(232, 121, 249, 0.40)',
      textMain: '#fae8ff',
      textMuted: '#f0abfc',
      accent: '#e879f9',
      accentGlow: 'rgba(232, 121, 249, 0.60)',
    },
  },

  // ─── 4. DIM — Soft Mid-Tone Neutrals ─────────────────────────────────────────
  {
    id: 'slate-fog',
    name: 'Slate Fog',
    category: 'dim',
    colors: {
      bgPrimary: '#dbe2e9',           // 90% soft slate fog
      bgGlass: 'rgba(255, 255, 255, 0.90)',
      borderGlass: 'rgba(71, 85, 105, 0.18)',
      textMain: '#1e293b',
      textMuted: '#475569',
      accent: '#4f46e5',             // indigo
      accentGlow: 'rgba(79, 70, 229, 0.25)',
    },
  },
  {
    id: 'muted-steel',
    name: 'Muted Steel',
    category: 'dim',
    colors: {
      bgPrimary: '#e5e7eb',           // 90% soft neutral steel
      bgGlass: 'rgba(255, 255, 255, 0.92)',
      borderGlass: 'rgba(55, 65, 81, 0.18)',
      textMain: '#111827',
      textMuted: '#4b5563',
      accent: '#3b82f6',             // royal blue
      accentGlow: 'rgba(59, 130, 246, 0.25)',
    },
  },
  {
    id: 'dusk-slate-dark',
    name: 'Dusk Slate Dark',
    category: 'dim',
    colors: {
      bgPrimary: '#1e2430',           // dimmed slate dark
      bgGlass: 'rgba(35, 43, 56, 0.92)',
      borderGlass: 'rgba(148, 163, 184, 0.25)',
      textMain: '#f8fafc',
      textMuted: '#cbd5e1',
      accent: '#60a5fa',
      accentGlow: 'rgba(96, 165, 250, 0.40)',
    },
  },

  // ─── 5. DARK — Ultra Dark & OLED ─────────────────────────────────────────────
  {
    id: 'oled-black',
    name: 'OLED Pitch Black',
    category: 'dark',
    colors: {
      bgPrimary: '#000000',
      bgGlass: 'rgba(18, 18, 22, 0.92)',
      borderGlass: 'rgba(255, 255, 255, 0.18)',
      textMain: '#ffffff',
      textMuted: '#a1a1aa',
      accent: '#3b82f6',
      accentGlow: 'rgba(59, 130, 246, 0.50)',
    },
  },
  {
    id: 'elysium-night',
    name: 'Elysium Night',
    category: 'dark',
    colors: {
      bgPrimary: '#070a13',
      bgGlass: 'rgba(15, 22, 38, 0.92)',
      borderGlass: 'rgba(59, 130, 246, 0.35)',
      textMain: '#f8fafc',
      textMuted: '#94a3b8',
      accent: '#3b82f6',
      accentGlow: 'rgba(59, 130, 246, 0.50)',
    },
  },
  {
    id: 'midnight-emerald',
    name: 'Midnight Emerald',
    category: 'dark',
    colors: {
      bgPrimary: '#02120b',
      bgGlass: 'rgba(6, 32, 22, 0.92)',
      borderGlass: 'rgba(16, 185, 129, 0.35)',
      textMain: '#ecfdf5',
      textMuted: '#6ee7b7',
      accent: '#10b981',
      accentGlow: 'rgba(16, 185, 129, 0.50)',
    },
  },
];

// ─── Category Labels ──────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ThemeConfig['category'], string> = {
  light: '☀️ Soft Light (90% Anti-Glare)',
  warm:  '🌅 Warm Paper & Sand',
  cyber: '⚡ Cyber Pastel',
  dim:   '🌘 Dimmed Neutrals',
  dark:  '🌑 Ultra Dark / OLED',
};

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY    = 'eigentime-theme';
const DEFAULT_THEME  = 'nordic-frost';

export function applyTheme(themeId: string): void {
  const theme = EIGENTIME_THEMES.find((t) => t.id === themeId) ?? EIGENTIME_THEMES[0]!;
  const root  = document.documentElement;

  const isDark = theme.category === 'dark' || theme.id === 'neon-synth' || theme.id === 'dusk-slate-dark';
  const primaryFg = isDark ? '#000000' : '#ffffff';
  const secondary = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const muted = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

  root.style.cssText = `
    --bg-primary: ${theme.colors.bgPrimary};
    --bg-glass: ${theme?.colors.bgGlass};
    --border-glass: ${theme?.colors.borderGlass};
    --text-main: ${theme?.colors.textMain};
    --text-muted: ${theme?.colors.textMuted};
    --accent: ${theme?.colors.accent};
    --accent-glow: ${theme?.colors.accentGlow};
    
    --background: ${theme?.colors.bgPrimary};
    --foreground: ${theme?.colors.textMain};
    --muted-foreground: ${theme?.colors.textMuted};
    --card: ${theme?.colors.bgGlass};
    --card-foreground: ${theme?.colors.textMain};
    --popover: ${theme?.colors.bgGlass};
    --popover-foreground: ${theme?.colors.textMain};
    --border: ${theme?.colors.borderGlass};
    --input: ${theme?.colors.borderGlass};
    --primary: ${theme?.colors.accent};
    --primary-foreground: ${primaryFg};
    --ring: ${theme?.colors.accent};
    --focus: ${theme?.colors.accent};
    
    --glass: ${theme?.colors.bgGlass};
    --glass-border: ${theme?.colors.borderGlass};
    
    --secondary: ${secondary};
    --secondary-foreground: ${theme?.colors.textMain};
    --muted: ${muted};
  `;

  root.setAttribute('data-theme',          theme?.id);
  root.setAttribute('data-theme-category', theme?.category);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  try { localStorage.setItem(STORAGE_KEY, theme.id); } catch { /* SSR guard */ }
}

export function getSavedThemeId(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}

export function getThemeById(id: string): ThemeConfig {
  return EIGENTIME_THEMES.find((t) => t.id === id) ?? EIGENTIME_THEMES[0]!;
}
