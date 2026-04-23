import { Priority, Subtask, Task, TaskStatus } from '@/types';
import { api } from './client';

export const tasksApi = {
  list: (filters: { status?: TaskStatus; priority?: Priority; search?: string } = {}) =>
    api<{ tasks: Task[] }>('/tasks', { query: filters }),
  get: (id: string) => api<{ task: Task }>(`/tasks/${id}`),
  create: (input: Partial<Task>) =>
    api<{ task: Task }>('/tasks', { method: 'POST', body: input }),
  update: (id: string, input: Partial<Task>) =>
    api<{ task: Task }>(`/tasks/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => api<{ ok: true }>(`/tasks/${id}`, { method: 'DELETE' }),
  reorder: (ids: string[]) =>
    api<{ ok: true }>('/tasks/reorder', { method: 'POST', body: { ids } }),
};

export const subtasksApi = {
  list: (taskId: string) =>
    api<{ subtasks: Subtask[] }>(`/tasks/${taskId}/subtasks`),
  create: (taskId: string, input: { title: string; estimateHours?: number }) =>
    api<{ subtask: Subtask }>(`/tasks/${taskId}/subtasks`, { method: 'POST', body: input }),
  update: (id: string, input: Partial<Subtask>) =>
    api<{ subtask: Subtask }>(`/subtasks/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => api<{ ok: true }>(`/subtasks/${id}`, { method: 'DELETE' }),
};

export const aiApi = {
  split: (input: { taskId?: string; title?: string; description?: string; apply?: boolean }) =>
    api<{ subtasks: { title: string; description?: string; estimateHours?: number }[] }>('/ai/split', {
      method: 'POST',
      body: input,
    }),
  estimate: (input: { taskId?: string; title?: string; description?: string }) =>
    api<{ hours: number; confidence: number }>('/ai/estimate', { method: 'POST', body: input }),
  prioritize: (taskIds?: string[]) =>
    api<{ order: string[] }>('/ai/prioritize', { method: 'POST', body: { taskIds } }),
  parseText: (text: string) =>
    api<{ title: string; dueDate: string | null; priority: Priority | null; confidence: number }>(
      '/ai/parse-text',
      { method: 'POST', body: { text } },
    ),
  extractTags: (text: string) =>
    api<{ tags: string[]; confidence: number }>('/ai/extract-tags', { method: 'POST', body: { text } }),
  patterns: () =>
    api<{ patterns: { category: string; avgHours: number; count: number }[]; insights: string[]; prediction: { hours: number; confidence: number } }>(
      '/ai/patterns',
    ),
  coach: () =>
    api<{ insights: { type: string; message: string; recommendation: string }[] }>('/ai/coach'),
  weeklyReport: () =>
    api<{ summary: { done: number; inProgress: number; todo: number; topTasks: { title: string; priority: string }[] }; recommendations: string[] }>(
      '/ai/weekly-report',
    ),
  importText: (text: string) =>
    api<{ drafts: { title: string; status: TaskStatus }[] }>('/ai/import-text', { method: 'POST', body: { text } }),
  parseVoice: (text: string) =>
    api<{ title: string; dueDate: string | null; priority: string; subtasks: string[]; confidence: number }>(
      '/ai/parse-voice', { method: 'POST', body: { text } }
    ),
  checkComplexity: (title: string, description?: string) =>
    api<{ isComplex: boolean; reason: string; confidence: number }>('/ai/check-complexity', { method: 'POST', body: { title, description } }),
  suggestTasks: () =>
    api<{ suggestions: { title: string; priority: string; reason: string }[] }>('/ai/suggest-tasks'),
  predictTime: (title: string, description?: string) =>
    api<{ hours: number; confidence: number; basedOn: string }>('/ai/predict-time', { method: 'POST', body: { title, description } }),
  deadlineRisk: () =>
    api<{ risks: { id: string; risk: 'high' | 'medium' | 'low'; reason: string }[] }>('/ai/deadline-risk'),
  stuckTasks: () =>
    api<{ tasks: { id: string; title: string; daysSinceUpdate: number }[] }>('/ai/stuck-tasks'),
  ocr: (imageBase64: string, mimeType: string) =>
    api<{ tasks: { title: string; status: string }[] }>('/ai/ocr', { method: 'POST', body: { imageBase64, mimeType } }),
  smartGoal: (title: string, description?: string) =>
    api<{ smart: { specific: string; measurable: string; achievable: string; relevant: string; timeBound: string }; goal: string; dueDate: string | null }>(
      '/ai/smart-goal', { method: 'POST', body: { title, description } }
    ),
};

export const analyticsApi = {
  dashboard: () =>
    api<{
      total: number;
      byStatus: Record<TaskStatus, number>;
      byPriority: Record<Priority, number>;
      weekly: { day: string; completed: number }[];
      tags: Record<string, number>;
      completionRate: number;
      points: number;
    }>('/analytics/dashboard'),
};

export const searchApi = {
  semantic: (query: string, limit = 10) =>
    api<{ results: { id: string; title: string; similarity: number }[] }>('/search/semantic', {
      method: 'POST',
      body: { query, limit },
    }),
};

export const commentsApi = {
  list: (taskId: string) =>
    api<{ id: string; taskId: string; userId: string; text: string; createdAt: string }[]>(`/tasks/${taskId}/comments`),
  add: (taskId: string, text: string) =>
    api<{ id: string; taskId: string; userId: string; text: string; createdAt: string }>(
      `/tasks/${taskId}/comments`,
      { method: 'POST', body: { text } },
    ),
  remove: (taskId: string, commentId: string) =>
    api<{ ok: true }>(`/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' }),
};

export const usersApi = {
  getPreferences: () => api<Record<string, unknown>>('/users/preferences'),
  setPreferences: (body: Record<string, unknown>) =>
    api<Record<string, unknown>>('/users/preferences', { method: 'PUT', body }),
  setEmail: (email: string | null) => api<{ email: string | null }>('/users/email', { method: 'PUT', body: { email } }),
  quota: () => api<{ isPremium: boolean; used: number; limit: number | null; remaining?: number }>('/users/quota'),
  activatePremium: (code: string) => api<{ isPremium: boolean; alreadyActive: boolean }>('/users/activate-premium', { method: 'POST', body: { code } }),
  achievements: () =>
    api<{ id: string; badge: string; title: string; description?: string; points: number; unlockedAt: string }[]>(
      '/users/achievements',
    ),
  points: () => api<{ points: number }>('/users/points'),
  deadlineCheck: () => api<{ sent: number }>('/users/notifications/deadline-check', { method: 'POST' }),
  outbox: () =>
    api<{ items: { to: string; subject: string; html: string; text: string }[] }>('/users/notifications/outbox'),
};

export const totpApi = {
  setup: () => api<{ secret: string; qr: string }>('/auth/2fa/setup', { method: 'POST' }),
  verify: (code: string) => api<{ enabled: boolean; backupCodes: string[] }>('/auth/2fa/verify', { method: 'POST', body: { code } }),
  disable: (password: string) => api<{ disabled: boolean }>('/auth/2fa/disable', { method: 'POST', body: { password } }),
};
