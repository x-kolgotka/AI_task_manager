export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  estimateHours: number | null;
  position: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  tags: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
  subtasks?: Subtask[];
}

export interface User {
  id: string;
  phone: string;
  phoneVerified: boolean;
  totpEnabled: boolean;
  isPremium: boolean;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface Preferences {
  theme: 'light' | 'dark';
  language: 'en' | 'ru' | 'es';
  timezone: string;
  timeFormat: '12h' | '24h';
  weekStart: 'mon' | 'sun';
  colorScheme: string;
  compactList: boolean;
  emailNotify: boolean;
}
