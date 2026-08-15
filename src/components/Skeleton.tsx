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

/**
 * 화면 머리글(제목 + 설명 [+ 오른쪽 버튼]) 자리.
 *
 * ⚠️ **`Suspense` 폴백은 목록만 그리면 안 된다.** 목록 화면은 거의 모두
 *    `머리글 → 필터 바 → 목록` 순인데, 폴백이 목록만 그리면 표가 화면 맨 위에 붙었다가
 *    실제 화면이 뜨는 순간 머리글 · 필터 바 높이만큼(대개 100~250px) **통째로 내려앉는다.**
 *    자리를 먼저 잡아 두면 목록만 조용히 채워진다.
 *
 * 높이는 **부르는 쪽이 정한다** — 화면마다 제목 크기가 다르다
 * (`text-heading-m` 18px → `h-[26px]` · `text-logo` 22px → `h-8`).
 * 실제 화면의 글자 크기 × 줄높이를 그대로 넘겨야 자리가 어긋나지 않는다.
 */
export function SkeletonPageHeader({
  titleClassName,
  descriptionClassName,
  /** 제목과 설명 사이 간격. 실제 화면의 `mt-*` 를 그대로 넘긴다 */
  gapClassName = 'mt-1.5',
  /** 오른쪽 끝 버튼 자리 (예: `등록` · `일괄 등록`) */
  action,
  className = 'mb-6',
}: {
  titleClassName: string;
  descriptionClassName: string;
  gapClassName?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <Skeleton className={titleClassName} />
        <Skeleton className={`${gapClassName} ${descriptionClassName}`} />
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  );
}

/**
 * 필터 바 자리. 실제 화면의 `gap` · 컨트롤 높이를 그대로 넘겨 받는다.
 *
 * 컨트롤 하나하나를 흉내 내지 않고 **높이가 같은 막대**만 늘어놓는다 —
 * 자리(높이 · 아래 여백)만 맞으면 목록이 위아래로 밀리지 않는다.
 */
export function SkeletonFilterBar({
  widths,
  controlClassName = 'h-9',
  trailing,
  className = 'mb-4',
}: {
  widths: string[];
  controlClassName?: string;
  /** `ml-auto` 로 오른쪽 끝에 붙는 버튼 자리 */
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* 같은 폭이 두 번 나올 수 있어 key 에 자리(index)를 함께 쓴다 */}
      {widths.map((width, index) => (
        <Skeleton
          key={`${width}-${index}`}
          className={`${controlClassName} ${width} rounded-lg`}
        />
      ))}
      {trailing && <div className="ml-auto flex gap-2">{trailing}</div>}
    </div>
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
