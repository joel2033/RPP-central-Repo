import { useCallback, useRef } from 'react';

// Throttle function for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Hook for throttled callbacks
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): (...args: Parameters<T>) => void {
  const throttledFn = useRef<ReturnType<typeof throttle>>();
  
  return useCallback((...args: Parameters<T>) => {
    if (!throttledFn.current) {
      throttledFn.current = throttle(callback, delay);
    }
    throttledFn.current(...args);
  }, [callback, delay, ...deps]);
}

// Performance monitoring utilities
export const performanceMonitor = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    if (typeof performance !== 'undefined') {
      try {
        const measure = performance.measure(name, startMark, endMark);
        console.log(`Performance: ${name} took ${measure.duration.toFixed(2)}ms`);
        return measure.duration;
      } catch (error) {
        console.warn(`Performance measurement failed for ${name}:`, error);
      }
    }
    return 0;
  },
  
  clearMarks: () => {
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
};

// Component performance wrapper
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    performanceMonitor.mark(`${componentName}-start`);
    
    const result = <Component {...props} />;
    
    performanceMonitor.mark(`${componentName}-end`);
    performanceMonitor.measure(
      `${componentName}-render`,
      `${componentName}-start`,
      `${componentName}-end`
    );
    
    return result;
  };
}

// Memory optimization utilities
export const memoryUtils = {
  // Clean up large objects
  cleanup: (obj: any) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        delete obj[key];
      });
    }
  },
  
  // Check memory usage (Chrome only)
  getMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576),
        total: Math.round(memory.totalJSHeapSize / 1048576),
        limit: Math.round(memory.jsHeapSizeLimit / 1048576),
      };
    }
    return null;
  }
};