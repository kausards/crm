import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, cols = 5, className = '' }: TableSkeletonProps) {
  return (
    <div className={`overflow-hidden divide-y divide-border ${className}`}>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={`h-4 bg-muted rounded animate-pulse ${
                colIdx === 0
                  ? 'w-24 shrink-0'
                  : colIdx === cols - 1
                  ? 'w-20 ml-auto shrink-0'
                  : 'flex-1 min-w-[60px]'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default TableSkeleton;
