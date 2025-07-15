import { format, formatDistance, parseISO } from 'date-fns';

// Date formatting utilities
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    return format(dateObj, 'MMM dd, yyyy');
  } catch (error) {
    return '';
  }
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const formatDateTime = (date: string | Date, time?: string): string => {
  const dateStr = formatDate(date);
  return time ? `${dateStr} at ${formatTime(time)}` : dateStr;
};

export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
};

// Currency formatting
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(numAmount);
};

// Text formatting utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatServiceName = (service: string): string => {
  return service.replace(/_/g, ' ').split(' ').map(capitalize).join(' ');
};

// File size formatting
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Phone number formatting
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

// Australian phone number formatting
export const formatAustralianPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  // Australian mobile numbers (04XX XXX XXX)
  if (cleaned.length === 10 && cleaned.startsWith('04')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  // Australian landline numbers with area code (0X XXXX XXXX)
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }
  
  // International format starting with +61
  if (cleaned.length === 11 && cleaned.startsWith('61')) {
    const withoutCountryCode = cleaned.slice(2);
    if (withoutCountryCode.startsWith('4')) {
      return `+61 ${withoutCountryCode.slice(0, 3)} ${withoutCountryCode.slice(3, 6)} ${withoutCountryCode.slice(6)}`;
    } else {
      return `+61 ${withoutCountryCode.slice(0, 1)} ${withoutCountryCode.slice(1, 5)} ${withoutCountryCode.slice(5)}`;
    }
  }
  
  return phone;
};

// Status formatting
export const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').split(' ').map(capitalize).join(' ');
};