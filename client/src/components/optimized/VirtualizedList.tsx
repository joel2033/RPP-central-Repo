import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T[] }) => React.ReactElement;
  className?: string;
}

function VirtualizedList<T>({ 
  items, 
  height, 
  itemHeight, 
  renderItem, 
  className 
}: VirtualizedListProps<T>) {
  const memoizedItems = useMemo(() => items, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <List
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={memoizedItems}
      >
        {renderItem}
      </List>
    </div>
  );
}

export default memo(VirtualizedList) as typeof VirtualizedList;