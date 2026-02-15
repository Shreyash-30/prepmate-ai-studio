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
    // Only handle 401 for protected routes, not auth endpoints
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  signup: (data: { name: string; email: string; password: string }) => api.post('/auth/signup', data),
  logout: () => api.post('/auth/logout', {}),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, data: { password: string; confirmPassword: string }) => 
    api.post(`/auth/reset-password/${token}`, data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: Record<string, unknown>) => api.put('/auth/profile', data),
  updatePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => 
    api.put('/auth/update-password', data),
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
  // Get all connected platforms and their status
  getStatus: () => api.get('/integrations/status'),
  
  // Connect a new platform account
  connect: (platform: string, username: string) => 
    api.post('/integrations/connect', { platform, username }),
  
  // Manually trigger resync for a platform
  resync: (platform: string) => api.post(`/integrations/resync/${platform}`),
  
  // Disconnect from a platform
  disconnect: (platform: string) => api.delete(`/integrations/${platform}`),
};

export default api;
