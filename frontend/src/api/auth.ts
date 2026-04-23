import { api } from './client';
import { User } from '@/types';

export type AuthTokens = { accessToken: string; refreshToken: string; user: User };

export const authApi = {
  register: (phone: string, password: string) =>
    api<{ userId: string; phone: string; codeSent: boolean }>('/auth/register', {
      method: 'POST',
      body: { phone, password },
      auth: false,
    }),
  verifySms: (phone: string, code: string) =>
    api<AuthTokens>('/auth/verify-sms', {
      method: 'POST',
      body: { phone, code },
      auth: false,
    }),
  resendSms: (phone: string) =>
    api<{ codeSent: boolean; attemptsLeft: number }>('/auth/resend-sms', {
      method: 'POST',
      body: { phone },
      auth: false,
    }),
  login: (phone: string, password: string, totpCode?: string) =>
    api<AuthTokens>('/auth/login', {
      method: 'POST',
      body: { phone, password, ...(totpCode ? { totpCode } : {}) },
      auth: false,
    }),
  refresh: (refreshToken: string) =>
    api<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }),
  me: () => api<{ user: User }>('/auth/me'),
};
