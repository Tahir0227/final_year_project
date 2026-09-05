import api from './api';

export const dashboardService = {
  getSummary:        ()               => api.get('/api/dashboard/summary').then(r => r.data),
  getNotifications:  (params = {})    => api.get('/api/dashboard/notifications', { params }).then(r => r.data),
  markRead:          (id)             => api.put(`/api/dashboard/notifications/${id}/read`).then(r => r.data),
  markAllRead:       ()               => api.put('/api/dashboard/notifications/read-all').then(r => r.data),
  deleteNotification:(id)             => api.delete(`/api/dashboard/notifications/${id}`).then(r => r.data),
};
