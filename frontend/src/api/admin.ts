import { useAdminStore } from '@/store/admin';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

async function adminApi<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = useAdminStore.getState().token;
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.detail ?? data.error ?? res.statusText);
  return data as T;
}

export type AdminUser = {
  id: string;
  phone: string;
  phoneVerified: boolean;
  isPremium: boolean;
  points: number;
  aiCallsToday: number;
  taskCount: number;
  createdAt: string;
};

export type AdminStats = {
  totalUsers: number;
  premiumUsers: number;
  verifiedUsers: number;
  aiCallsToday: number;
  totalTasks: number;
};

export const adminRequests = {
  login: (phone: string, password: string) =>
    adminApi<{ accessToken: string }>('/admin/login', { method: 'POST', body: { phone, password } }),
  stats: () => adminApi<AdminStats>('/admin/stats'),
  users: (params: { search?: string; premium?: boolean; offset?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.premium !== undefined) q.set('premium', String(params.premium));
    if (params.offset) q.set('offset', String(params.offset));
    if (params.limit) q.set('limit', String(params.limit));
    return adminApi<{ users: AdminUser[]; total: number }>(`/admin/users?${q}`);
  },
  setPremium: (id: string, isPremium: boolean) =>
    adminApi<AdminUser>(`/admin/users/${id}/premium`, { method: 'PUT', body: { isPremium } }),
  deleteUser: (id: string) =>
    adminApi<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string, password: string) =>
    adminApi<{ ok: boolean }>(`/admin/users/${id}/password`, { method: 'PUT', body: { password } }),
  disable2fa: (id: string) =>
    adminApi<{ ok: boolean }>(`/admin/users/${id}/disable-2fa`, { method: 'POST' }),
};
