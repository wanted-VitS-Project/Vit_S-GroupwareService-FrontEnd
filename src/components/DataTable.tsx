'use client';

import { Fragment } from 'react';

import { Skeleton, SkeletonGroup } from './Skeleton';
import LoadingSpinner from './Spinner';

/**
 * 목록 표 공용 컴포넌트.
 *
 * 사원 · 부서 · 직급 · 그룹 · 페이지 권한 · 카테고리 · 입찰 공고가 거의 같은 표를
 * 각자 그리고 있었다. 모양이 조금씩 갈리는 것보다 **로딩 · 빈 상태 · 실패가 표마다
 * 다르게 처리되던 것**이 더 문제였다 — 여기서 한 번에 정한다.
 *
 * 통일 기준 (2026-08-13 갱신)
 * | 항목          | 값                                                          |
 * | ------------- | ----------------------------------------------------------- |
 * | 가로 여백     | `px-5` · 열이 많으면 `dense` 로 `px-3`                        |
 * | 본문 글자     | `text-label`(14px) — 설정 표들이 쓰던 크기. 입찰만 12px 였다  |
 * | 세로 여백     | 헤더 `py-3` · 본문 `py-3.5`                                  |
 * | 세로 정렬     | `align-middle` — 한 칸이 두 줄이어도 나머지가 가운데를 잡는다 |
 * | 가로 스크롤   | **기본 없음** — `minWidth` 를 준 표만 흐른다                  |
 * | sticky 헤더   | `maxHeight` 를 준 표만 — 세로 스크롤이 있을 때만 의미 있다    |
 * | 빈 상태       | `…없습니다` 체 (기존 다수)                                    |
 *
 * ⚠️ 색 · 글자 크기는 `globals.css` 토큰만 쓴다. 여기서 새 스타일을 만들지 않는다.
 * ⚠️ 칸 안에서 **글자를 잘라 감추지 않는다** — 넘치면 줄바꿈으로 흐르게 둔다.
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
  /**
   * 열이 많아 좁은 화면에서 가로로 흘려야 하는 표 (예: `840`).
   *
   * ⚠️ **기본은 가로 스크롤 없음이다.** 주지 않으면 표가 화면 폭 안에서 나뉜다.
   *    꼭 필요한 표(열이 아주 많고 값이 줄일 수 없는 경우)에만 준다.
   */
  minWidth?: number;
  /**
   * 촘촘한 표 — 가로 여백을 `px-5`(40px) 대신 `px-3`(24px) 으로 줄인다.
   *
   * 열이 8개를 넘어가면 여백만 300px 이 넘어 글자 자리가 사라진다.
   * 가로 스크롤을 만들지 않으려면 여백부터 줄여야 한다.
   */
  dense?: boolean;
  /** 주면 세로 스크롤 + **헤더 고정** (예: `'60vh'`) */
  maxHeight?: string;
  skeletonRows?: number;
  /**
   * 불러오는 동안 **회색 막대를 그리지 않는다.**
   *
   * 몇 줄이 올지 모르는 표에서는 막대가 실제 결과와 어긋나, 응답이 오는 순간 표가
   * 늘었다 줄며 화면이 튄다. 자리(높이)만 잡고 비워 두는 편이 조용하다.
   */
  showSkeleton?: boolean;
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
  /**
   * 행 **바로 아래**에 펼칠 내용. 값을 돌려주는 행에만 줄이 하나 더 붙는다.
   *
   * ⭐ 목록 끝이 아니라 **누른 자리**에서 열려야 한다 — 표가 길면 끝에 열린 내용은
   *    화면 밖이라 아무 일도 안 일어난 것처럼 보인다.
   * ℹ️ 좁은 화면(카드)에서는 그 카드 아래에 놓인다.
   */
  renderExpanded?: (row: T) => React.ReactNode;
  /**
   * 불러오는 동안 **머리글은 남기고** 본문 자리에 스피너를 둔다.
   *
   * 열이 많은 표는 자리표시 막대가 실제 줄과 어긋나 결과가 오는 순간 표가 흔들린다.
   * 머리글이 남아 있으면 무엇을 기다리는지 보이고, 표의 자리도 그대로 유지된다.
   * ⚠️ 주면 `showSkeleton` 보다 **이쪽이 이긴다.**
   */
  loadingLabel?: string;
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
       * `maxHeight` 는 인라인으로 준다 — Tailwind 임의값(`max-h-[60vh]`)을 쓰면
       * 호출부마다 문자열이 흩어지고 빌드 시점에 없는 값은 클래스가 생성되지 않는다.
       *
       * ⚠️ 축을 하나만 열면 `maxHeight` + `minWidth` 를 함께 준 표에서 **오른쪽 열이 잘린다.**
       *    두 축을 모두 `auto` 로 두면 필요한 쪽만 스크롤바가 생긴다.
       */
      style={maxHeight ? { maxHeight } : undefined}
      /**
       * ⚠️ `minWidth` 를 준 표만 가로로 흐른다. 안 준 표는 **가로 스크롤을 막는다** —
       *    칸 안의 `whitespace-nowrap` 한 줄이 열보다 길면 스크롤바가 생겨,
       *    분명 `minWidth` 를 뺐는데도 표가 옆으로 밀리는 일이 있었다.
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
                     * 막대를 **글자 한 줄과 같은 높이의 상자**에 담는다.
                     *
                     * 그냥 두면 12px 막대가 21px 글자보다 낮아 로딩 행이 데이터 행보다
                     * 짧고, 응답이 오는 순간 표 전체가 아래로 늘어나 화면이 튄다.
                     * 틀을 먼저 고정하고 안의 내용만 바뀌게 한다.
                     *
                     * ⚠️ 막대도 **칸의 정렬을 따른다.** 오른쪽 · 가운데 정렬 열인데 막대만
                     *    왼쪽에 붙어 있으면, 값이 도착하는 순간 글자가 반대쪽으로 건너뛴다.
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
                        /**
                         * 세로는 **가운데**다 — 한 칸이 두 줄이 되어 행이 높아져도
                         * 나머지 칸이 위에 매달려 있지 않고 가운데에서 균형을 잡는다.
                         */
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
   * ⭐ **좁은 화면에서는 표를 카드로 바꾼다.**
   *
   * 열이 6~8개인 표를 폰 폭에 밀어 넣으면 글자가 한 자씩 끊기거나 가로로 흘러 읽을 수 없다.
   * 열 정의(`header` + `cell`)를 그대로 재사용해 **`이름: 값`** 으로 세로로 쌓으면
   * 화면마다 따로 만들지 않아도 목록 전부가 함께 좁은 화면을 지원한다.
   *
   * ℹ️ 첫 열은 제목처럼 크게 놓는다 — 어느 줄인지 먼저 알아야 나머지 값이 의미를 갖는다.
   * ℹ️ 이름이 없는 열(동작 버튼 · 체크박스)은 이름 없이 값만 놓는다.
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
    ) : (
      <>
        {/* 768px 미만은 카드, 이상은 표 — 한쪽만 그린다 */}
        <div className="hidden md:block">{table}</div>
        <div className="md:hidden">{cards}</div>
      </>
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
    <div className="overflow-hidden rounded-base border border-border-default bg-bg-card">
      {children}
    </div>
  );
}

/** 빈 상태 · 실패 안내가 표 자리에 대신 놓인다 */
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-20 text-center">{children}</div>;
}
