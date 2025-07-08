import memoize from 'memoizee';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Memoized cache for database queries
export const createMemoizedQuery = <T extends (...args: any[]) => any>(
  fn: T,
  options?: {
    ttl?: number;
    maxSize?: number;
    normalizer?: (...args: Parameters<T>) => string;
  }
): T => {
  return memoize(fn, {
    promise: true,
    maxAge: options?.ttl || CACHE_TTL,
    max: options?.maxSize || MAX_CACHE_SIZE,
    normalizer: options?.normalizer,
  }) as T;
};

// Cache invalidation helpers
export const createCacheKey = (prefix: string, ...parts: (string | number)[]): string => {
  return `${prefix}:${parts.join(':')}`;
};

// Simple in-memory cache for quick access
class SimpleCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private defaultTTL: number;

  constructor(defaultTTL: number = CACHE_TTL) {
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expires });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new SimpleCache();

// Cleanup expired cache entries every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);