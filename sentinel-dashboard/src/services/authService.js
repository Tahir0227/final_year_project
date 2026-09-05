import api from './api';

export const authService = {
  register: (data) => api.post('/api/auth/register', data).then(r => r.data),
  login:    (data) => api.post('/api/auth/login', data).then(r => r.data),
  me:       ()     => api.get('/api/auth/me').then(r => r.data),
  changePassword: (data) => api.post('/api/auth/change-password', data).then(r => r.data),
  updateProfile:  (data) => api.put('/api/auth/profile', data).then(r => r.data),
  logout:   ()     => api.post('/api/auth/logout').then(r => r.data),
};
