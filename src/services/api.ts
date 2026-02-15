import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  signup: (data: { name: string; email: string; password: string }) => api.post('/auth/signup', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: Record<string, unknown>) => api.put('/auth/profile', data),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getMasteryHeatmap: () => api.get('/dashboard/mastery-heatmap'),
  getWeakTopics: () => api.get('/dashboard/weak-topics'),
  getReadinessScore: () => api.get('/dashboard/readiness'),
  getTodayTasks: () => api.get('/dashboard/today-tasks'),
  getPerformanceTrend: () => api.get('/dashboard/performance-trend'),
};

export const practiceService = {
  getSubjects: () => api.get('/practice/subjects'),
  getTopics: (subjectId: string) => api.get(`/practice/subjects/${subjectId}/topics`),
  getTopicIntelligence: (topicId: string) => api.get(`/practice/topics/${topicId}/intelligence`),
  getQuestions: (topicId: string, difficulty?: string) => api.get(`/practice/topics/${topicId}/questions`, { params: { difficulty } }),
  submitSolution: (questionId: string, data: Record<string, unknown>) => api.post(`/practice/questions/${questionId}/submit`, data),
};

export const revisionService = {
  getSubjects: () => api.get('/revision/subjects'),
  getTopicRevision: (topicId: string) => api.get(`/revision/topics/${topicId}`),
  getRevisionSet: (topicId: string) => api.get(`/revision/topics/${topicId}/set`),
  completeRevision: (topicId: string) => api.post(`/revision/topics/${topicId}/complete`),
};

export const mockInterviewService = {
  startInterview: (config: Record<string, unknown>) => api.post('/mock-interview/start', config),
  submitAnswer: (interviewId: string, data: Record<string, unknown>) => api.post(`/mock-interview/${interviewId}/submit`, data),
  getReport: (interviewId: string) => api.get(`/mock-interview/${interviewId}/report`),
};

export const plannerService = {
  getTasks: (date?: string) => api.get('/planner/tasks', { params: { date } }),
  toggleTask: (taskId: string) => api.patch(`/planner/tasks/${taskId}/toggle`),
};

export const integrationsService = {
  getConnections: () => api.get('/integrations'),
  connect: (platform: string, data: Record<string, unknown>) => api.post(`/integrations/${platform}/connect`, data),
  sync: (platform: string) => api.post(`/integrations/${platform}/sync`),
};

export default api;
