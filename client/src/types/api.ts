// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

// Query parameters
export interface BaseQueryParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ClientQueryParams extends BaseQueryParams {
  status?: 'active' | 'inactive';
}

export interface JobQueryParams extends BaseQueryParams {
  status?: string;
  clientId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface BookingQueryParams extends BaseQueryParams {
  status?: string;
  photographerId?: number;
  dateFrom?: string;
  dateTo?: string;
}

// Request types
export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  editingPreferences?: string;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {}

export interface CreateBookingRequest {
  clientId: number;
  propertyAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  services: string[];
  notes?: string;
  price: string;
  photographerId?: number;
}

export interface UpdateBookingRequest extends Partial<CreateBookingRequest> {
  status?: string;
}

// Filter types
export interface FilterState {
  search: string;
  status: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  [key: string]: any;
}