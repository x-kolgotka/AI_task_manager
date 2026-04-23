import { useAuthStore } from '@/store/auth';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | undefined>;
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = true, query } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const qs = query
    ? '?' +
      new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined) as [string, string][],
      ).toString()
    : '';
  const res = await fetch(`${BASE}${path}${qs}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    let msg = data.detail ?? data.error ?? res.statusText;
    if (typeof msg === 'string' && msg.startsWith('daily_limit_reached:')) {
      const limit = msg.split(':')[1];
      msg = `Daily AI limit reached (${limit} requests). Upgrade to Premium for unlimited access.`;
    }
    throw new ApiError(res.status, msg, data.details);
  }
  return data as T;
}
