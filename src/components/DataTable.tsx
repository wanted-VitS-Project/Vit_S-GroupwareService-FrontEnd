'use client';

import { Fragment, useCallback, useSyncExternalStore } from 'react';

import { Skeleton, SkeletonGroup } from './Skeleton';
import LoadingSpinner from './Spinner';

/**
 * 목록 표 공용 컴포넌트. 로딩 · 빈 상태 · 실패 처리를 여기서 한 번에 정한다.
 * 색 · 글자 크기는 globals.css 토큰만 쓰고, 칸 안에서 글자를 잘라 감추지 않는다.
 */

/**
 * 로딩 폴백에서 쓰는 열 정의. 폭 · 순서만 맞추면 되므로 `cell` 을 요구하지 않는다.
 */
export type DataTableSkeletonColumn = Omit<DataTableColumn<never>, 'cell'> & {
  cell?: never;
};

export interface DataTableColumn<T> {
  /** React key 이자 개발 경고에 쓰는 식별자 */
  key: string;
  header: React.ReactNode;
  /**
   * 열 폭. CSS 값을 그대로 준다. `%` 는 합이 100 이어야 헤더와 본문이 어긋나지 않는다.
   */
  width?: string;
  align?: 'left' | 'right' | 'center';
  /** `index` 는 순번 · 위아래 이동처럼 **자리**가 의미를 갖는 열에서 쓴다 */
  cell: (row: T, index: number) => React.ReactNode;
  /** 로딩 스켈레톤 막대 폭 (기본 `w-24`) */
  skeletonWidth?: string;
  /** 칸 자체에 다른 동작이 있는 열(체크박스 · 케밥)에서 `onRowClick` 을 막는다 */
  stopRowClick?: boolean;
}

interface DataTableProps<T> {
  /** 로딩만 그릴 때는 `cell` 없는 `DataTableSkeletonColumn[]` 도 받는다 */
  columns: (DataTableColumn<T> | DataTableSkeletonColumn)[];
  /** `null` 이면 로딩으로 본다 — 빈 배열(`[]`)과 구분된다 */
  rows: T[] | null;
  /**
   * 행의 React key. 서버에서 렌더되는 `Suspense` 폴백에는 함수를 넘길 수 없어 선택 값이다.
   */
  rowKey?: (row: T) => string | number;
  /** 스크린리더용 표 설명. 로딩 안내 문구로도 쓴다 */
  caption: string;
  /**
   * 가로로 흘려야 하는 표에만 준다. 기본은 가로 스크롤 없이 화면 폭 안에서 나뉜다.
   */
  minWidth?: number;
  /**
   * 촘촘한 표. 열이 8개를 넘으면 여백만 300px 이 넘어 글자 자리가 사라진다.
   */
  dense?: boolean;
  /** 주면 세로 스크롤 + **헤더 고정** (예: `'60vh'`) */
  maxHeight?: string;
  skeletonRows?: number;
  /**
   * 몇 줄이 올지 모르는 표는 막대를 그리지 않는다 — 결과가 오면 표가 늘었다 줄며 튄다.
   */
  showSkeleton?: boolean;
  /** 조회는 됐지만 결과가 없을 때 */
  emptyMessage?: string;
  /** 빈 상태 아래에 놓을 버튼 (필터 초기화 등) */
  emptyAction?: React.ReactNode;
  /** 빈 상태를 통째로 그릴 때. 주면 `emptyMessage` · `emptyAction` 은 무시된다 */
  emptyState?: React.ReactNode;
  /** 조회 자체가 실패했을 때. 주면 표 대신 이 안내가 놓인다 */
  errorMessage?: string;
  onRetry?: () => void;
  /** 행마다 다른 배경 · 강조가 필요할 때 */
  rowClassName?: (row: T) => string;
  /** 행 전체를 눌러 상세로 보낸다. 키보드용 링크를 셀 안에 함께 두어야 한다 */
  onRowClick?: (row: T) => void;
  /**
   * 행 바로 아래에 펼칠 내용. 목록 끝에서 열면 화면 밖이라 누른 자리에서 연다.
   */
  renderExpanded?: (row: T) => React.ReactNode;
  /**
   * 머리글은 남기고 본문 자리에 스피너를 둔다. 주면 `showSkeleton` 보다 이쪽이 이긴다.
   */
  loadingLabel?: string;
}

/** 표로 그릴 폭인지 (`md` 이상). 서버 렌더에서는 표를 기준으로 둔다 */
const WIDE_SCREEN_QUERY = '(min-width: 768px)';

function useIsWideScreen() {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(WIDE_SCREEN_QUERY);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_SCREEN_QUERY).matches,
    // 서버에는 창 폭이 없다 — 표로 그려 두고 마운트 후 실제 폭으로 맞춘다
    () => true,
  );
}

const ALIGN_CLASS = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

/** `%` 폭의 합을 검사한다. 개발 모드 전용이고 화면에는 영향이 없다 */
function warnIfWidthsBroken(columns: { key: string; width?: string }[]) {
  if (process.env.NODE_ENV !== 'development') return;

  const percents = columns
    .map((column) => column.width)
    .filter((width): width is string => width?.endsWith('%') === true)
    .map((width) => Number.parseFloat(width));

  if (percents.length === 0) return;

  const total = percents.reduce((sum, value) => sum + value, 0);
  if (Math.round(total) === 100) return;

  console.warn(
    `[DataTable] 열 폭 합계가 ${total}% 입니다. 100% 가 아니면 브라우저가 비율을 다시 나눠 ` +
      '헤더와 본문 열이 어긋나 보입니다.',
  );
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  minWidth,
  maxHeight,
  skeletonRows = 8,
  showSkeleton = true,
  dense = false,
  emptyMessage = '표시할 내용이 없습니다.',
  emptyAction,
  emptyState,
  errorMessage,
  onRetry,
  rowClassName,
  onRowClick,
  renderExpanded,
  loadingLabel,
}: DataTableProps<T>) {
  /*
    표와 카드 중 한쪽만 그린다. CSS 숨김은 렌더를 막지 못해 조회가 두 번 나갔다.
  */
  const isWide = useIsWideScreen();
  warnIfWidthsBroken(columns);

  /** 헤더 · 본문 · 빈 상태가 같은 값을 써야 열이 어긋나지 않는다 */
  const padX = dense ? 'px-3' : 'px-5';

  // 세로 스크롤이 있는 표만 헤더를 고정한다 — 없으면 고정할 이유가 없다
  const isSticky = maxHeight !== undefined;

  if (errorMessage) {
    return (
      <Shell>
        <Centered>
          <p className="text-caption text-text-secondary">{errorMessage}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-sm btn-gray-outlined mt-3"
            >
              다시 시도
            </button>
          )}
        </Centered>
      </Shell>
    );
  }

  if (rows !== null && rows.length === 0) {
    return (
      <Shell>
        <Centered>
          {emptyState ?? (
            <>
              <p className="text-caption text-text-secondary">{emptyMessage}</p>
              {emptyAction && <div className="mt-3">{emptyAction}</div>}
            </>
          )}
        </Centered>
      </Shell>
    );
  }

  const table = (
    <div
      /**
       * `maxHeight` 는 인라인으로 준다 — 빌드 시점에 없는 임의값은 클래스가 안 생긴다.
       * 두 축을 모두 `auto` 로 둬야 `minWidth` 를 함께 준 표에서 열이 잘리지 않는다.
       */
      style={maxHeight ? { maxHeight } : undefined}
      /**
       * `minWidth` 를 준 표만 가로로 흐른다. 안 준 표는 `nowrap` 때문에 밀리지 않게 막는다.
       */
      className={
        minWidth ? 'overflow-auto' : 'overflow-x-hidden overflow-y-auto'
      }
    >
      <table
        style={minWidth ? { minWidth: `${minWidth}px` } : undefined}
        className="w-full table-fixed border-collapse text-left"
      >
        <caption className="sr-only">{caption}</caption>

        {/* 폭은 열 정의 한 곳에서만 정한다 — th · td 에 나눠 쓰면 어긋난다 */}
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
        </colgroup>

        <thead
          className={`bg-bg-surface ${isSticky ? 'sticky top-0 z-10' : ''}`}
        >
          <tr className="border-b border-border-default text-detail text-text-secondary">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`${padX} py-3 font-medium ${ALIGN_CLASS[column.align ?? 'left']}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows === null && loadingLabel ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                <LoadingSpinner label={loadingLabel} className="py-16" />
              </td>
            </tr>
          ) : rows === null ? (
            Array.from({ length: skeletonRows }, (_, index) => (
              <tr
                key={index}
                // 본문과 같은 글자 크기를 얹어야 아래 `h-[1.5em]` 이 같은 값이 된다
                className="border-b border-border-default text-label"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${padX} py-3.5 ${ALIGN_CLASS[column.align ?? 'left']}`}
                  >
                    {/**
                     * 막대를 글자 한 줄 높이의 상자에 담아 로딩 행과 데이터 행 높이를 맞춘다.
                     * 막대도 칸의 정렬을 따라야 값이 도착할 때 글자가 건너뛰지 않는다.
                     */}
                    <span
                      className={`flex h-[1.5em] items-center ${
                        column.align === 'right'
                          ? 'justify-end'
                          : column.align === 'center'
                            ? 'justify-center'
                            : ''
                      }`}
                    >
                      <Skeleton
                        className={`h-3 ${column.skeletonWidth ?? 'w-24'}`}
                      />
                    </span>
                  </td>
                ))}
              </tr>
            ))
          ) : (
            rows.map((row, index) => {
              const expanded = renderExpanded?.(row);

              return (
                <Fragment key={rowKey?.(row) ?? index}>
                  <tr
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`group border-b border-border-default text-label last:border-b-0 hover:bg-bg-surface ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${rowClassName?.(row) ?? ''}`}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        // 칸 자체에 동작이 있는 열은 행 클릭으로 새지 않게 막는다
                        onClick={
                          column.stopRowClick
                            ? (event) => event.stopPropagation()
                            : undefined
                        }
                        /* 한 칸이 두 줄이 되어도 나머지 칸이 가운데에서 균형을 잡는다 */
                        className={`${padX} py-3.5 align-middle ${ALIGN_CLASS[column.align ?? 'left']}`}
                      >
                        {column.cell?.(row, index)}
                      </td>
                    ))}
                  </tr>

                  {expanded && (
                    <tr className="border-b border-border-default last:border-b-0">
                      <td colSpan={columns.length} className="p-0">
                        {expanded}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  /**
   * 좁은 화면에서는 열 정의를 그대로 재사용해 `이름: 값` 카드로 쌓는다.
   * 첫 열은 제목처럼 크게, 이름이 없는 열(동작 버튼)은 값만 놓는다.
   */
  const cards = (
    <ul className="flex flex-col gap-2 p-3">
      {rows === null && loadingLabel ? (
        <li>
          <LoadingSpinner label={loadingLabel} className="py-12" />
        </li>
      ) : rows === null ? (
        Array.from({ length: Math.min(skeletonRows, 4) }, (_, index) => (
          <li
            key={index}
            className="rounded-lg border border-border-default p-4"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </li>
        ))
      ) : (
        rows.map((row, index) => {
          const [first, ...rest] = columns;

          return (
            <li key={rowKey?.(row) ?? index}>
              <div
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`rounded-lg border border-border-default p-4 ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${rowClassName?.(row) ?? ''}`}
              >
                <div className="text-label font-semibold text-text-primary">
                  {first.cell?.(row, index)}
                </div>

                <dl className="mt-2 flex flex-col gap-1.5">
                  {rest.map((column) => (
                    <div
                      key={column.key}
                      onClick={
                        column.stopRowClick
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                      className="flex items-start justify-between gap-3 text-caption"
                    >
                      {column.header ? (
                        <dt className="shrink-0 text-text-secondary">
                          {column.header}
                        </dt>
                      ) : (
                        <dt className="sr-only">동작</dt>
                      )}
                      <dd className="min-w-0 text-right text-text-primary">
                        {column.cell?.(row, index)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {renderExpanded?.(row)}
            </li>
          );
        })
      )}
    </ul>
  );

  const body =
    rows === null && !showSkeleton && !loadingLabel ? (
      // 자리만 남긴다 — 무엇이 몇 줄 올지 모르는 표에서는 막대가 오히려 화면을 흔든다
      <div className="min-h-40" />
    ) : isWide ? (
      table
    ) : (
      cards
    );

  /*
    로딩 중 낭독용 묶음. `loadingLabel` 은 스피너가 이미 `role="status"` 라 묶지 않는다.
  */
  return (
    <Shell>
      {rows === null && !loadingLabel ? (
        <SkeletonGroup label={`${caption} 불러오는 중`}>{body}</SkeletonGroup>
      ) : (
        body
      )}
    </Shell>
  );
}

/** 표 바깥 테두리. `overflow-hidden` 이 없으면 sticky 헤더가 둥근 모서리 위로 튀어나온다 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-base border border-border-default bg-bg-card">
      {children}
    </div>
  );
}

/** 빈 상태 · 실패 안내가 표 자리에 대신 놓인다 */
/**
 * 빈 상태 · 오류 안내 자리. `svg` 는 블록이라 아이콘에는 `mx-auto` 를 함께 준다.
 */
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-20 text-center">{children}</div>;
}
