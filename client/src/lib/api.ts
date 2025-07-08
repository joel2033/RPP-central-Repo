import { apiRequest } from './queryClient';

export const clientApi = {
  getAll: () => apiRequest('/api/clients'),
  getById: (id: number) => apiRequest(`/api/clients/${id}`),
  create: (data: any) => apiRequest('/api/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest(`/api/clients/${id}`, {
    method: 'DELETE',
  }),
};

export const jobApi = {
  getAll: (params?: any) => {
    const searchParams = new URLSearchParams(params);
    return apiRequest(`/api/jobs?${searchParams}`);
  },
  getById: (id: number) => apiRequest(`/api/jobs/${id}`),
  updateStatus: (id: number, status: string) => apiRequest(`/api/jobs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  getFiles: (id: number) => apiRequest(`/api/jobs/${id}/files`),
  getActivity: (id: number) => apiRequest(`/api/jobs/${id}/activity`),
};

export const bookingApi = {
  getAll: () => apiRequest('/api/bookings'),
  create: (data: any) => apiRequest('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};