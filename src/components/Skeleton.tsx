import type { HTMLAttributes, ReactNode } from 'react';

export function Skeleton({
  shape = 'rectangle',
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  shape?: 'rectangle' | 'circle';
}) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={`block animate-pulse bg-bg-hover ${
        shape === 'circle' ? 'rounded-pill' : 'rounded-button-md'
      } ${className}`}
    />
  );
}

export function SkeletonGroup({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={className}
    >
      {children}
    </div>
  );
}

export interface SkeletonTableColumn {
  label: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: number) => ReactNode;
}

export function SkeletonTable({
  label,
  columns,
  rows = 8,
  tableClassName = 'w-full table-fixed border-collapse text-left',
  wrapperClassName = 'max-h-[60vh] overflow-y-auto',
}: {
  label: string;
  columns: SkeletonTableColumn[];
  rows?: number;
  tableClassName?: string;
  wrapperClassName?: string;
}) {
  return (
    <SkeletonGroup label={label} className={wrapperClassName}>
      <table className={tableClassName}>
        <thead className="sticky top-0 bg-bg-card">
          <tr className="border-b border-border-default text-detail text-text-secondary">
            {columns.map((column) => (
              <th
                key={column.label}
                className={column.headerClassName ?? 'px-5 py-3 font-medium'}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr
              key={row}
              className="border-b border-border-default last:border-b-0"
            >
              {columns.map((column) => (
                <td
                  key={column.label}
                  className={column.cellClassName ?? 'px-5 py-3.5'}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SkeletonGroup>
  );
}

export function SkeletonField({ width = 'w-full' }: { width?: string }) {
  return (
    <div>
      <Skeleton className="mb-1.5 h-3 w-16" />
      <Skeleton className={`h-[34px] ${width}`} />
    </div>
  );
}
