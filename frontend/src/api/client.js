import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('fileoracle_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fileoracle_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;

// Auth
export const register = (data) => client.post('/api/v1/auth/register', data);
export const login = (data) => client.post('/api/v1/auth/login/json', data);

// Users
export const getProfile = () => client.get('/api/v1/users/me');
export const updateProfile = (data) => client.patch('/api/v1/users/me', data);

// Files
export const listFiles = (params) => client.get('/api/v1/files', { params });
export const getFile = (id) => client.get(`/api/v1/files/${id}`);
export const previewFile = (id) => `${API_BASE}/api/v1/files/${id}/preview?token=${localStorage.getItem('fileoracle_token')}`;
export const toggleFavorite = (id) => client.post(`/api/v1/files/${id}/favorite`);
export const setTags = (id, tags) => client.put(`/api/v1/files/${id}/tags`, { tags });
export const bulkRename = (data) => client.post('/api/v1/files/bulk-rename', data);
export const uploadFiles = (destination, formData) =>
  client.post(`/api/v1/files/upload?destination=${encodeURIComponent(destination)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// AI-powered endpoints
export const listCategories = () => client.get('/api/v1/files/categories');
export const listByCategory = (category, params) => client.get(`/api/v1/files/category/${category}`, { params });
export const listBySubcategory = (subcategory, params) => client.get(`/api/v1/files/subcategory/${subcategory}`, { params });
export const listImages = (params) => client.get('/api/v1/files/images', { params });
export const listVideos = (params) => client.get('/api/v1/files/videos', { params });
export const listAudio = (params) => client.get('/api/v1/files/audio', { params });
export const aiSearch = (q, params) => client.get('/api/v1/files/search', { params: { q, ...params } });
export const reclassifyFiles = (fileIds) => client.post('/api/v1/files/reclassify', null, { params: { file_ids: fileIds } });
export const updateSubcategory = (id, subcategory) => client.patch(`/api/v1/files/${id}/subcategory?subcategory=${encodeURIComponent(subcategory)}`);

// Scan
export const scanFolder = (data) => client.post('/api/v1/scan', data);
export const organizeFolder = (data) => client.post('/api/v1/scan/organize', data);

// Duplicates
export const getDuplicates = () => client.get('/api/v1/duplicates');
export const deleteDuplicates = (data) => client.post('/api/v1/duplicates/delete', data);

// Search
export const searchFiles = (data) => client.post('/api/v1/search', data);

// Chat
export const sendChat = (message) => client.post('/api/v1/chat', { message });
export const getChatHistory = () => client.get('/api/v1/chat/history');
export const clearChatHistory = () => client.delete('/api/v1/chat/history');

// Analytics
export const getDashboard = () => client.get('/api/v1/analytics/dashboard');
export const getAnalytics = () => client.get('/api/v1/analytics/full');
export const getRecommendations = () => client.get('/api/v1/analytics/recommendations');
export const exportReport = () =>
  client.get('/api/v1/analytics/export/pdf', { responseType: 'blob' });

// Recycle
export const listRecycle = (params) => client.get('/api/v1/recycle', { params });
export const restoreFile = (id) => client.post(`/api/v1/recycle/${id}/restore`);
export const softDeleteFile = (id) => client.delete(`/api/v1/recycle/${id}`);
export const permanentDelete = (id) => client.delete(`/api/v1/recycle/${id}/permanent`);

// Settings
export const getSettings = () => client.get('/api/v1/settings');
export const updateSettings = (data) => client.patch('/api/v1/settings', data);
export const listRules = () => client.get('/api/v1/settings/rules');
export const createRule = (data) => client.post('/api/v1/settings/rules', data);
export const deleteRule = (id) => client.delete(`/api/v1/settings/rules/${id}`);

// Activity
export const getActivity = () => client.get('/api/v1/activity');
