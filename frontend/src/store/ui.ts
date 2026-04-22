import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'list' | 'kanban' | 'calendar' | 'stats';

interface UiState {
  theme: 'light' | 'dark';
  view: ViewMode;
  sidebarOpen: boolean;
  compact: boolean;
  selectedTaskId: string | null;
  setTheme: (t: 'light' | 'dark') => void;
  setView: (v: ViewMode) => void;
  toggleSidebar: () => void;
  setCompact: (c: boolean) => void;
  selectTask: (id: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'light',
      view: 'list',
      sidebarOpen: true,
      compact: false,
      selectedTaskId: null,
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
      setView: (view) => set({ view }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setCompact: (compact) => set({ compact }),
      selectTask: (selectedTaskId) => set({ selectedTaskId }),
    }),
    { name: 'task-ai-ui' },
  ),
);
