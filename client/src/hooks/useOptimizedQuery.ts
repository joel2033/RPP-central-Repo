import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { API_ENDPOINTS } from '@/utils/constants';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  endpoint: string;
  params?: Record<string, any>;
  dependencies?: any[];
}

export function useOptimizedQuery<T>({
  endpoint,
  params = {},
  dependencies = [],
  ...options
}: OptimizedQueryOptions<T>) {
  const { isAuthenticated } = useAuth();

  const queryKey = [endpoint, ...dependencies, params];
  
  return useQuery<T>({
    queryKey,
    enabled: isAuthenticated && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
    refetchOnWindowFocus: false,
    ...options,
  });
}

// Specialized hooks for common endpoints
export const useClients = (params?: Record<string, any>) => {
  return useOptimizedQuery<any[]>({
    endpoint: API_ENDPOINTS.CLIENTS,
    params,
  });
};

export const useJobs = (params?: Record<string, any>) => {
  return useOptimizedQuery<any[]>({
    endpoint: API_ENDPOINTS.JOBS,
    params,
  });
};

export const useJobCards = (statusFilter?: string) => {
  return useOptimizedQuery<any[]>({
    endpoint: API_ENDPOINTS.JOB_CARDS,
    params: statusFilter ? { status: statusFilter } : {},
    dependencies: [statusFilter],
  });
};

export const useProducts = () => {
  return useOptimizedQuery<any[]>({
    endpoint: API_ENDPOINTS.PRODUCTS,
    staleTime: 15 * 60 * 1000, // Products change less frequently
  });
};