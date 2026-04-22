import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingPhone: string | null;
  setTokens: (a: string, r: string, u?: User) => void;
  setUser: (u: User) => void;
  setPendingPhone: (p: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      pendingPhone: null,
      setTokens: (accessToken, refreshToken, user) =>
        set((s) => ({ accessToken, refreshToken, user: user ?? s.user })),
      setUser: (user) => set({ user }),
      setPendingPhone: (pendingPhone) => set({ pendingPhone }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, pendingPhone: null }),
    }),
    { name: 'task-ai-auth' },
  ),
);
