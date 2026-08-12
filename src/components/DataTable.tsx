'use client';

import { Skeleton, SkeletonGroup } from './Skeleton';

/**
 * 목록 표 공용 컴포넌트.
 *
 * 사원 · 부서 · 직급 · 그룹 · 페이지 권한 · 카테고리 · 입찰 공고가 거의 같은 표를
 * 각자 그리고 있었다. 모양이 조금씩 갈리는 것보다 **로딩 · 빈 상태 · 실패가 표마다
 * 다르게 처리되던 것**이 더 문제였다 — 여기서 한 번에 정한다.
 *
 * 통일 기준 (2026-08-12)
 * | 항목        | 값                                                     |
 * | ----------- | ------------------------------------------------------ |
 * | 가로 여백   | `px-5` (7개 중 6개가 쓰던 값)                            |
 * | 본문 글자   | `text-label`(14px) — 설정 표들이 쓰던 크기. 입찰만 12px 였다 |
 * | 세로 여백   | 헤더 `py-3` · 본문 `py-3.5` (원래 전부 같았다)           |
 * | sticky 헤더 | `maxHeight` 를 준 표만 — 세로 스크롤이 있을 때만 의미 있다 |
 * | 빈 상태     | `…없습니다` 체 (기존 다수)                                |
 *
 * ⚠️ 색 · 글자 크기는 `globals.css` 토큰만 쓴다. 여기서 새 스타일을 만들지 않는다.
 */

/**
 * 로딩 폴백(`Suspense`)에서 쓰는 열 정의.
 *
 * 실제 화면의 열과 **폭 · 순서 · 스켈레톤 폭만** 맞추면 되므로 `cell` 을 요구하지 않는다.
 * `DataTable` 에 `rows={null}` 로 넘기면 같은 껍데기가 나오고,
 * 그래서 폴백이 실제 표로 바뀔 때 열이 튀지 않는다.
 */
export type DataTableSkeletonColumn = Omit<DataTableColumn<never>, 'cell'> & {
  cell?: never;
};

export interface DataTableColumn<T> {
  /** React key 이자 개발 경고에 쓰는 식별자 */
  key: string;
  header: React.ReactNode;
  /**
   * 열 폭. `'37%'` · `'11rem'` 처럼 CSS 값을 그대로 준다 (`<colgroup>` 으로 나간다).
   * ⚠️ `%` 로 줄 거면 **합이 100 이어야 한다** — 넘으면 브라우저가 비율을 다시 나눠
   *    헤더와 본문이 어긋난다. 개발 모드에서 합계를 검사해 콘솔로 알린다.
   */
  width?: string;
  align?: 'left' | 'right' | 'center';
  /** `index` 는 순번 · 위아래 이동처럼 **자리**가 의미를 갖는 열에서 쓴다 */
  cell: (row: T, index: number) => React.ReactNode;
  /** 로딩 스켈레톤 막대 폭 (기본 `w-24`) */
  skeletonWidth?: string;
  /**
   * 이 칸을 눌러도 `onRowClick` 이 돌지 않게 한다.
   * 체크박스 · 케밥처럼 **칸 자체에 다른 동작**이 있는 열에 쓴다.
   */
  stopRowClick?: boolean;
}

interface DataTableProps<T> {
  /** 로딩만 그릴 때는 `cell` 없는 `DataTableSkeletonColumn[]` 도 받는다 */
  columns: (DataTableColumn<T> | DataTableSkeletonColumn)[];
  /** `null` 이면 로딩으로 본다 — 빈 배열(`[]`)과 구분된다 */
  rows: T[] | null;
  /**
   * 행의 React key.
   *
   * ⚠️ 로딩만 그리는 **`Suspense` 폴백에서는 넘기지 않는다** — 폴백은 서버 컴포넌트에서
   *    렌더되는데, 함수는 서버에서 클라이언트 컴포넌트로 넘어가지 못해 화면이 통째로 비어 버린다.
   *    행이 없으면 key 도 필요 없으므로 선택 값으로 둔다.
   */
  rowKey?: (row: T) => string | number;
  /** 스크린리더용 표 설명. 로딩 안내 문구로도 쓴다 */
  caption: string;
  /** 열이 많아 좁은 화면에서 가로로 흘려야 하는 표 (예: `840`) */
  minWidth?: number;
  /** 주면 세로 스크롤 + **헤더 고정** (예: `'60vh'`) */
  maxHeight?: string;
  skeletonRows?: number;
  /** 조회는 됐지만 결과가 없을 때 */
  emptyMessage?: string;
  /** 빈 상태 아래에 놓을 버튼 (필터 초기화 등) */
  emptyAction?: React.ReactNode;
  /**
   * 빈 상태를 통째로 그릴 때 (아이콘 + 설명 두 줄 + 버튼 등).
   * 주면 `emptyMessage` · `emptyAction` 은 무시된다 — 자리(가운데 · 여백)만 공용으로 잡는다.
   */
  emptyState?: React.ReactNode;
  /** 조회 자체가 실패했을 때. 주면 표 대신 이 안내가 놓인다 */
  errorMessage?: string;
  onRetry?: () => void;
  /** 행마다 다른 배경 · 강조가 필요할 때 */
  rowClassName?: (row: T) => string;
  /**
   * 행 전체를 눌러 상세로 보내는 표에 쓴다.
   * ⚠️ 이것만으로는 **키보드로 갈 수 없다** — 셀 안에 링크를 함께 두어야 한다.
   */
  onRowClick?: (row: T) => void;
}

const ALIGN_CLASS = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

/**
 * `%` 폭의 합을 검사한다. 개발 모드에서만 돌고 화면에는 영향이 없다.
 * 실제로 합계 103% 때문에 열이 어긋난 적이 있어 넣어 둔다.
 */
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
  emptyMessage = '표시할 내용이 없습니다.',
  emptyAction,
  emptyState,
  errorMessage,
  onRetry,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  warnIfWidthsBroken(columns);

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

  const body = (
    <div
      /**
       * `maxHeight` 는 인라인으로 준다 — Tailwind 임의값(`max-h-[60vh]`)을 쓰면
       * 호출부마다 문자열이 흩어지고 빌드 시점에 없는 값은 클래스가 생성되지 않는다.
       *
       * ⚠️ 축을 하나만 열면 `maxHeight` + `minWidth` 를 함께 준 표에서 **오른쪽 열이 잘린다.**
       *    두 축을 모두 `auto` 로 두면 필요한 쪽만 스크롤바가 생긴다.
       */
      style={maxHeight ? { maxHeight } : undefined}
      className="overflow-auto"
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
                className={`px-5 py-3 font-medium ${ALIGN_CLASS[column.align ?? 'left']}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows === null
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={index} className="border-b border-border-default">
                  {columns.map((column) => (
                    <td key={column.key} className="px-5 py-3.5">
                      <Skeleton
                        className={`h-3 ${column.skeletonWidth ?? 'w-24'}`}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row, index) => (
                <tr
                  key={rowKey?.(row) ?? index}
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
                      className={`px-5 py-3.5 ${ALIGN_CLASS[column.align ?? 'left']}`}
                    >
                      {column.cell?.(row, index)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );

  // 로딩 중에는 스크린리더가 "불러오는 중" 을 읽도록 묶어 준다
  return (
    <Shell>
      {rows === null ? (
        <SkeletonGroup label={`${caption} 불러오는 중`}>{body}</SkeletonGroup>
      ) : (
        body
      )}
    </Shell>
  );
}

/**
 * 표 바깥 테두리.
 * ⚠️ `overflow-hidden` 이 없으면 sticky 헤더의 각진 배경이 둥근 모서리 위로 튀어나온다.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-bg-card">
      {children}
    </div>
  );
}

/** 빈 상태 · 실패 안내가 표 자리에 대신 놓인다 */
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-20 text-center">{children}</div>;
}
