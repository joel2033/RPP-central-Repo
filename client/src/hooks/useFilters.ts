import { useState, useMemo } from 'react';
import { useDebounce } from './useDebounce';

interface FilterOptions {
  searchTerm: string;
  statusFilter: string;
  dateFilter?: string;
  [key: string]: any;
}

export function useFilters<T>(
  data: T[] | undefined,
  filterFn: (item: T, filters: FilterOptions) => boolean,
  debounceDelay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [customFilters, setCustomFilters] = useState<Record<string, any>>({});

  const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);

  const filteredData = useMemo(() => {
    if (!data) return [];

    const filters: FilterOptions = {
      searchTerm: debouncedSearchTerm,
      statusFilter,
      dateFilter,
      ...customFilters,
    };

    return data.filter(item => filterFn(item, filters));
  }, [data, debouncedSearchTerm, statusFilter, dateFilter, customFilters, filterFn]);

  const setFilter = (key: string, value: any) => {
    setCustomFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('');
    setCustomFilters({});
  };

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    customFilters,
    setFilter,
    clearFilters,
    filteredData,
  };
}