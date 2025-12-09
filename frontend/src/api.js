import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 習慣関連のAPI
export const habitsAPI = {
  getAll: () => api.get('/habits/'),
  create: (habit) => api.post('/habits/', habit),
  get: (habitId) => api.get(`/habits/${habitId}/`),
  update: (habitId, habit) => api.patch(`/habits/${habitId}/`, habit),
  delete: (habitId) => api.delete(`/habits/${habitId}`),
};

// 週間ログ関連のAPI
export const habitLogsAPI = {
  getAll: () => api.get('/habit-logs/'),
  create: (habitLog) => api.post('/habit-logs/', habitLog),
  get: (logId) => api.get(`/habit-logs/${logId}/`),
  update:(logId, habitLog) => api.patch(`/habit-logs/${logId}/`, habitLog),
  delete: (logId) => api.delete(`/habit-logs/${logId}/`),
};

export const ping = () => api.get('/ping/');
