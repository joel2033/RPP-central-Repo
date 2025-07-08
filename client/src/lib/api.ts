import { apiRequest } from './queryClient';
import type {
  ApiResponse,
  PaginatedResponse,
  ClientQueryParams,
  JobQueryParams,
  BookingQueryParams,
  CreateClientRequest,
  UpdateClientRequest,
  CreateBookingRequest,
  UpdateBookingRequest,
} from '@/types/api';
import type { Client, JobCard, Booking, Product } from '@shared/schema';
import { API_ENDPOINTS } from '@/utils/constants';

// Utility function to build query string
const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

// Client API
export const clientApi = {
  getAll: async (params?: ClientQueryParams): Promise<PaginatedResponse<Client>> => {
    const queryString = params ? `?${buildQueryString(params)}` : '';
    return apiRequest('GET', `${API_ENDPOINTS.CLIENTS}${queryString}`);
  },

  getById: async (id: number): Promise<Client> => {
    return apiRequest('GET', `${API_ENDPOINTS.CLIENTS}/${id}`);
  },

  create: async (data: CreateClientRequest): Promise<Client> => {
    return apiRequest('POST', API_ENDPOINTS.CLIENTS, data);
  },

  update: async (id: number, data: UpdateClientRequest): Promise<Client> => {
    return apiRequest('PUT', `${API_ENDPOINTS.CLIENTS}/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest('DELETE', `${API_ENDPOINTS.CLIENTS}/${id}`);
  },
};

// Job API
export const jobApi = {
  getAll: async (params?: JobQueryParams): Promise<PaginatedResponse<JobCard>> => {
    const queryString = params ? `?${buildQueryString(params)}` : '';
    return apiRequest('GET', `${API_ENDPOINTS.JOBS}${queryString}`);
  },

  getById: async (id: number): Promise<JobCard> => {
    return apiRequest('GET', `${API_ENDPOINTS.JOBS}/${id}`);
  },

  updateStatus: async (id: number, status: string): Promise<JobCard> => {
    return apiRequest('PATCH', `${API_ENDPOINTS.JOBS}/${id}`, { status });
  },
};

// Booking API
export const bookingApi = {
  getAll: async (params?: BookingQueryParams): Promise<PaginatedResponse<Booking>> => {
    const queryString = params ? `?${buildQueryString(params)}` : '';
    return apiRequest('GET', `${API_ENDPOINTS.BOOKINGS}${queryString}`);
  },

  getById: async (id: number): Promise<Booking> => {
    return apiRequest('GET', `${API_ENDPOINTS.BOOKINGS}/${id}`);
  },

  create: async (data: CreateBookingRequest): Promise<Booking> => {
    return apiRequest('POST', API_ENDPOINTS.BOOKINGS, data);
  },

  update: async (id: number, data: UpdateBookingRequest): Promise<Booking> => {
    return apiRequest('PUT', `${API_ENDPOINTS.BOOKINGS}/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest('DELETE', `${API_ENDPOINTS.BOOKINGS}/${id}`);
  },
};

// Product API
export const productApi = {
  getAll: async (): Promise<Product[]> => {
    return apiRequest('GET', API_ENDPOINTS.PRODUCTS);
  },

  getById: async (id: string): Promise<Product> => {
    return apiRequest('GET', `${API_ENDPOINTS.PRODUCTS}/${id}`);
  },

  create: async (data: any): Promise<Product> => {
    return apiRequest('POST', API_ENDPOINTS.PRODUCTS, data);
  },

  update: async (id: string, data: any): Promise<Product> => {
    return apiRequest('PUT', `${API_ENDPOINTS.PRODUCTS}/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest('DELETE', `${API_ENDPOINTS.PRODUCTS}/${id}`);
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<any> => {
    return apiRequest('GET', `${API_ENDPOINTS.DASHBOARD}/stats`);
  },
};