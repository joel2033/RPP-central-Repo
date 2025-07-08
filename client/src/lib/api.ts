import { apiRequest } from './queryClient';

export const clientApi = {
  getAll: async () => {
    const response = await apiRequest('GET', '/api/clients');
    return response.json();
  },
  getById: async (id: number) => {
    const response = await apiRequest('GET', `/api/clients/${id}`);
    return response.json();
  },
  create: async (data: any) => {
    const response = await apiRequest('POST', '/api/clients', data);
    return response.json();
  },
  update: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/clients/${id}`, data);
    return response.json();
  },
  delete: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/clients/${id}`);
    return response.json();
  },
};

export const jobApi = {
  getAll: async (params?: any) => {
    const searchParams = new URLSearchParams(params);
    const response = await apiRequest('GET', `/api/jobs?${searchParams}`);
    return response.json();
  },
  getById: async (id: number) => {
    const response = await apiRequest('GET', `/api/jobs/${id}`);
    return response.json();
  },
  updateStatus: async (id: number, status: string) => {
    const response = await apiRequest('PATCH', `/api/jobs/${id}`, { status });
    return response.json();
  },
  getFiles: async (id: number) => {
    const response = await apiRequest('GET', `/api/jobs/${id}/files`);
    return response.json();
  },
  getActivity: async (id: number) => {
    const response = await apiRequest('GET', `/api/jobs/${id}/activity`);
    return response.json();
  },
};

export const bookingApi = {
  getAll: async () => {
    const response = await apiRequest('GET', '/api/bookings');
    return response.json();
  },
  create: async (data: any) => {
    const response = await apiRequest('POST', '/api/bookings', data);
    return response.json();
  },
};

export const officeApi = {
  getAll: async () => {
    const response = await apiRequest('GET', '/api/offices');
    return response.json();
  },
  getById: async (id: number) => {
    const response = await apiRequest('GET', `/api/offices/${id}`);
    return response.json();
  },
  create: async (data: any) => {
    const response = await apiRequest('POST', '/api/offices', data);
    return response.json();
  },
  update: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/offices/${id}`, data);
    return response.json();
  },
  delete: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/offices/${id}`);
    return response.json();
  },
};