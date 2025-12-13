import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export interface Habit {
  id: number;
  title: string;
  content?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type HabitPayload = Pick<Habit, 'title' | 'content' | 'is_active'>;

export interface HabitLog {
  id: number;
  habit: number;
  date: string;
  done: boolean;
  created_at?: string;
  updated_at?: string;
}

export type HabitLogPayload = Pick<HabitLog, 'habit' | 'date' | 'done'>;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 習慣関連のAPI
export const habitsAPI = {
  getAll: () => api.get<Habit[]>('/habits/'),
  create: (habit: HabitPayload) => api.post<Habit>('/habits/', habit),
  get: (habitId: number) => api.get<Habit>(`/habits/${habitId}/`),
  update: (habitId: number, habit: Partial<HabitPayload>) =>
    api.patch<Habit>(`/habits/${habitId}/`, habit),
  delete: (habitId: number) => api.delete(`/habits/${habitId}`),
};

// 週間ログ関連のAPI
export const habitLogsAPI = {
  getAll: () => api.get<HabitLog[]>('/habit-logs/'),
  create: (habitLog: HabitLogPayload) => api.post<HabitLog>('/habit-logs/', habitLog),
  get: (logId: number) => api.get<HabitLog>(`/habit-logs/${logId}/`),
  update: (logId: number, habitLog: Partial<HabitLogPayload>) =>
    api.patch<HabitLog>(`/habit-logs/${logId}/`, habitLog),
  delete: (logId: number) => api.delete(`/habit-logs/${logId}/`),
};

export const ping = () => api.get('/ping/');
