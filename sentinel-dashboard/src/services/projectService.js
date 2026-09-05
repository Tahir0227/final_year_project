import api from './api';

export const projectService = {
  create:         (data)             => api.post('/api/projects', data).then(r => r.data),
  getAll:         ()                 => api.get('/api/projects').then(r => r.data),
  getById:        (id)               => api.get(`/api/projects/${id}`).then(r => r.data),
  update:         (id, data)         => api.put(`/api/projects/${id}`, data).then(r => r.data),
  delete:         (id)               => api.delete(`/api/projects/${id}`).then(r => r.data),
  rescan:         (id)               => api.post(`/api/projects/${id}/rescan`).then(r => r.data),
  getHealthHistory: (id, days = 30)  => api.get(`/api/projects/${id}/health-history?days=${days}`).then(r => r.data),
  getAlerts:      (id, limit = 10)   => api.get(`/api/projects/${id}/alerts?limit=${limit}`).then(r => r.data),
  getPrescriptions: (id, limit = 10) => api.get(`/api/projects/${id}/prescriptions?limit=${limit}`).then(r => r.data),
  testCredential: (type, data)       => api.post('/api/projects/test-credential', { type, ...data }).then(r => r.data),
};
