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
};
