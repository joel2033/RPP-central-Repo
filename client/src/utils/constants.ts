// Application constants
export const APP_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/quicktime'],
  SUPPORTED_DOCUMENT_TYPES: ['application/pdf'],
  PAGINATION_LIMIT: 20,
  DEBOUNCE_DELAY: 300,
} as const;

export const JOB_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
  delivered: 'bg-gray-100 text-gray-800',
} as const;

export const PRODUCTION_STATUS_COLORS = {
  unassigned: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  editing: 'bg-purple-100 text-purple-800',
  ready_for_qa: 'bg-green-100 text-green-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  in_revision: 'bg-orange-100 text-orange-800',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  PHOTOGRAPHER: 'photographer',
  VA: 'va',
  LICENSEE: 'licensee',
  EDITOR: 'editor',
} as const;

export const SERVICE_TYPES = {
  PHOTOGRAPHY: 'photography',
  DRONE: 'drone',
  FLOOR_PLANS: 'floor_plans',
  VIDEO: 'video',
  VIRTUAL_TOUR: 'virtual_tour',
} as const;

export const ROUTES = {
  DASHBOARD: '/',
  CLIENTS: '/clients',
  BOOKINGS: '/bookings',
  CALENDAR: '/calendar',
  JOBS: '/jobs',
  PRODUCTION: '/production',
  UPLOAD_TO_EDITOR: '/upload-to-editor',
  EDITOR: '/editor',
  QA_REVIEW: '/qa-review',
  DELIVERY: '/delivery',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  PRODUCTS: '/products',
  EDITOR_PORTAL: '/editor-portal',
  EDITOR_SERVICES: '/editor-services',
  SERVICE_TEMPLATES: '/service-templates',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    USER: '/api/auth/user',
    LOGIN: '/api/login',
    LOGOUT: '/api/logout',
  },
  CLIENTS: '/api/clients',
  BOOKINGS: '/api/bookings',
  JOBS: '/api/jobs',
  JOB_CARDS: '/api/job-cards',
  PRODUCTS: '/api/products',
  PHOTOGRAPHERS: '/api/photographers',
  EDITORS: '/api/editors',
  CALENDAR: '/api/calendar',
  DASHBOARD: '/api/dashboard',
  EDITOR_SERVICES: '/api/editor-services',
  SERVICE_TEMPLATES: '/api/service-templates',
  SERVICE_CHANGE_LOGS: '/api/service-change-logs',
} as const;