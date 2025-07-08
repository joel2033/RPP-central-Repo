import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits');
export const priceSchema = z.number().min(0, 'Price must be positive');
export const requiredStringSchema = z.string().min(1, 'This field is required');

// File validation
export const fileSchema = z.object({
  name: z.string(),
  size: z.number().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
  type: z.string(),
});

// Date validation
export const dateSchema = z.string().refine(
  (date) => !isNaN(Date.parse(date)),
  'Invalid date format'
);

export const timeSchema = z.string().regex(
  /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  'Invalid time format (HH:MM)'
);

// Common validation functions
export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

export const validatePhone = (phone: string): boolean => {
  return phoneSchema.safeParse(phone).success;
};

export const validatePrice = (price: number): boolean => {
  return priceSchema.safeParse(price).success;
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

// Form validation helpers
export const getFieldError = (errors: Record<string, any>, fieldName: string): string | undefined => {
  return errors[fieldName]?.message;
};

export const hasFormErrors = (errors: Record<string, any>): boolean => {
  return Object.keys(errors).length > 0;
};