import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'list' | 'kanban' | 'calendar' | 'stats';
export type ThemeMode = 'light' | 'dark' | 'system';
export type CalendarMode = 'day' | 'twoDays' | 'week' | 'month' | 'year' | 'custom';
export type InterfaceSize = 'sm' | 'md' | 'lg';
export type Density = 'comfortable' | 'compact';
export type Language = 'en' | 'ru' | 'es';
export type WeekStart = 'mon' | 'sun';
export type TimeFormat = '12h' | '24h';

export const accentMap: Record<string, { base: string; hover: string; label: string; hex: string }> = {
  blue: { base: '37 99 235', hover: '29 78 216', label: 'Blue', hex: '#2563eb' },
  green: { base: '22 163 74', hover: '21 128 61', label: 'Green', hex: '#16a34a' },
  amber: { base: '217 119 6', hover: '180 83 9', label: 'Amber', hex: '#d97706' },
  rose: { base: '225 29 72', hover: '190 18 60', label: 'Rose', hex: '#e11d48' },
};

const applyTheme = (theme: ThemeMode) => {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
};

const applyUiPrefs = (size: InterfaceSize, density: Density, colorScheme: string) => {
  const accent = accentMap[colorScheme] ?? accentMap.blue;
  document.documentElement.dataset.uiSize = size;
  document.documentElement.dataset.density = density;
  document.documentElement.style.setProperty('--color-brand', accent.base);
  document.documentElement.style.setProperty('--color-brand-hover', accent.hover);
};

const applyLanguage = (language: Language) => {
  document.documentElement.lang = language;
};

interface UiState {
  theme: ThemeMode;
  view: ViewMode;
  sidebarOpen: boolean;
  compact: boolean;
  language: Language;
  calendarMode: CalendarMode;
  calendarRange: { start: string; end: string };
  interfaceSize: InterfaceSize;
  density: Density;
  timeFormat: TimeFormat;
  weekStart: WeekStart;
  emailNotify: boolean;
  colorScheme: string;
  selectedTaskId: string | null;
  setTheme: (t: ThemeMode) => void;
  setView: (v: ViewMode) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setCompact: (c: boolean) => void;
  setLanguage: (v: Language) => void;
  setCalendarMode: (v: CalendarMode) => void;
  setCalendarRange: (range: { start: string; end: string }) => void;
  setInterfaceSize: (v: InterfaceSize) => void;
  setDensity: (v: Density) => void;
  setTimeFormat: (v: TimeFormat) => void;
  setWeekStart: (v: WeekStart) => void;
  setEmailNotify: (v: boolean) => void;
  setColorScheme: (v: string) => void;
  selectTask: (id: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      view: 'list',
      sidebarOpen: false,
      compact: false,
      language: 'en',
      calendarMode: 'month',
      calendarRange: { start: '', end: '' },
      interfaceSize: 'md',
      density: 'comfortable',
      timeFormat: '24h',
      weekStart: 'mon',
      emailNotify: true,
      colorScheme: 'blue',
      selectedTaskId: null,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setView: (view) => set({ view }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
      setCompact: (compact) => {
        const density = compact ? 'compact' : 'comfortable';
        applyUiPrefs(get().interfaceSize, density, get().colorScheme);
        set({ compact, density });
      },
      setLanguage: (language) => {
        applyLanguage(language);
        set({ language });
      },
      setCalendarMode: (calendarMode) => set({ calendarMode }),
      setCalendarRange: (calendarRange) => set({ calendarRange }),
      setInterfaceSize: (interfaceSize) => {
        applyUiPrefs(interfaceSize, get().density, get().colorScheme);
        set({ interfaceSize });
      },
      setDensity: (density) => {
        applyUiPrefs(get().interfaceSize, density, get().colorScheme);
        set({ density, compact: density === 'compact' });
      },
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setWeekStart: (weekStart) => set({ weekStart }),
      setEmailNotify: (emailNotify) => set({ emailNotify }),
      setColorScheme: (colorScheme) => {
        applyUiPrefs(get().interfaceSize, get().density, colorScheme);
        set({ colorScheme });
      },
      selectTask: (selectedTaskId) => set({ selectedTaskId }),
    }),
    {
      name: 'task-ai-ui',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.compact && state.density !== 'compact') state.density = 'compact';
        applyTheme(state.theme);
        applyLanguage(state.language);
        applyUiPrefs(state.interfaceSize, state.density, state.colorScheme);
      },
    },
  ),
);
