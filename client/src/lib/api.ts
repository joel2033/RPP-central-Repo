import { apiRequest } from './queryClient';

export const clientApi = {
  getAll: async () => {
    return await apiRequest('GET', '/api/clients');
  },
  getById: async (id: number) => {
    return await apiRequest('GET', `/api/clients/${id}`);
  },
  create: async (data: any) => {
    return await apiRequest('POST', '/api/clients', data);
  },
  update: async (id: number, data: any) => {
    return await apiRequest('PUT', `/api/clients/${id}`, data);
  },
  delete: async (id: number) => {
    return await apiRequest('DELETE', `/api/clients/${id}`);
  },
};

export const jobApi = {
  getAll: async (params?: any) => {
    const searchParams = new URLSearchParams(params);
    return await apiRequest('GET', `/api/jobs?${searchParams}`);
  },
  getById: async (id: number) => {
    return await apiRequest('GET', `/api/jobs/${id}`);
  },
  updateStatus: async (id: number, status: string) => {
    return await apiRequest('PATCH', `/api/jobs/${id}`, { status });
  },
  getFiles: async (id: number) => {
    return await apiRequest('GET', `/api/jobs/${id}/files`);
  },
  getActivity: async (id: number) => {
    return await apiRequest('GET', `/api/jobs/${id}/activity`);
  },
};

export const bookingApi = {
  getAll: async () => {
    return await apiRequest('GET', '/api/bookings');
  },
  create: async (data: any) => {
    return await apiRequest('POST', '/api/bookings', data);
  },
};

export const officeApi = {
  getAll: async () => {
    return await apiRequest('GET', '/api/offices');
  },
  getById: async (id: number) => {
    return await apiRequest('GET', `/api/offices/${id}`);
  },
  create: async (data: any) => {
    return await apiRequest('POST', '/api/offices', data);
  },
  update: async (id: number, data: any) => {
    return await apiRequest('PUT', `/api/offices/${id}`, data);
  },
  delete: async (id: number) => {
    return await apiRequest('DELETE', `/api/offices/${id}`);
  },
};