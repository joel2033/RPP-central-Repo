import { useMemo } from 'react';

interface UseVirtualizationOptions {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const useVirtualization = ({ 
  items, 
  itemHeight, 
  containerHeight, 
  overscan = 5 
}: UseVirtualizationOptions) => {
  return useMemo(() => {
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const totalHeight = items.length * itemHeight;
    
    const getVisibleRange = (scrollTop: number) => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        startIndex + visibleItemCount + overscan,
        items.length - 1
      );
      
      const visibleStartIndex = Math.max(0, startIndex - overscan);
      
      return {
        startIndex: visibleStartIndex,
        endIndex,
        visibleItems: items.slice(visibleStartIndex, endIndex + 1),
        offsetY: visibleStartIndex * itemHeight,
      };
    };
    
    return {
      totalHeight,
      itemHeight,
      getVisibleRange,
    };
  }, [items, itemHeight, containerHeight, overscan]);
};