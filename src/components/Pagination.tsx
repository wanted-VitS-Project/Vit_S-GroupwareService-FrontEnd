'use client';

interface PaginationProps {
  /** 0-based — 백엔드 페이징이 0부터 센다 */
  page: number;
  totalPages: number;
  totalElements: number;
  /** 세는 단위. 사람이 아닌 목록은 바꿔 넘긴다 (예: '건') */
  unit?: string;
  /** 전체 건수를 감춘다 — 화면에 이미 같은 수가 있으면 중복이다 */
  showTotal?: boolean;
  /** 요청이 도는 동안 잠근다 — 연달아 누르면 응답 순서가 뒤집힌다 */
  disabled?: boolean;
  onChange: (page: number) => void;
}

/**
 * 목록 하단 페이지 이동.
 *
 * ⭐ **번호를 직접 누른다.** 화살표만 있으면 5페이지 뒤로 가려고 다섯 번을 눌러야 하고,
 *    지금이 몇 번째인지도 `3 / 12` 처럼 읽어야 안다. 번호가 늘어서 있으면 위치와 이동이
 *    한눈에 들어온다.
 * ℹ️ 페이지가 많아도 버튼이 늘어나지 않는다 — 처음 · 끝 · 지금 주변만 남기고 `…` 로 접는다.
 *    폭이 고정이라 페이지를 옮겨도 버튼 줄의 길이가 흔들리지 않는다.
 */
export default function Pagination({
  page,
  totalPages,
  totalElements,
  unit = '명',
  showTotal = true,
  disabled = false,
  onChange,
}: PaginationProps) {
  const lastPage = Math.max(totalPages, 1);
  /** 응답이 줄어 마지막 장을 넘어섰을 때를 대비해 범위 안으로 넣는다 */
  const currentPage = Math.min(Math.max(page, 0), lastPage - 1);
  const items = pageItemsOf(currentPage, lastPage);

  return (
    /**
     * 세 칸 격자로 나눈다 — 양옆 칸의 폭이 같아야 가운데 번호줄이 **화면 한가운데**에 선다.
     * `justify-between` 으로 두면 전체 건수 글자 길이에 따라 번호줄이 좌우로 밀린다.
     */
    <div className="grid grid-cols-1 items-center gap-2 border-t border-border-default px-5 py-3 md:grid-cols-[1fr_auto_1fr] md:gap-4">
      {/* 감춰도 자리는 남겨야 번호줄이 가운데에 그대로 있는다 */}
      <p className="text-center text-detail text-text-secondary md:text-left">
        {showTotal && `전체 ${totalElements.toLocaleString('ko-KR')}${unit}`}
      </p>

      <nav
        aria-label="페이지 이동"
        className="flex flex-wrap items-center justify-center gap-1"
      >
        <PageButton
          label="이전 페이지"
          disabled={disabled || currentPage <= 0}
          onClick={() => onChange(currentPage - 1)}
        >
          이전
        </PageButton>

        {items.map((item) =>
          item.type === 'gap' ? (
            <span
              key={item.key}
              aria-hidden
              className="flex h-8 min-w-8 items-center justify-center text-detail text-text-muted"
            >
              …
            </span>
          ) : (
            <PageButton
              key={item.page}
              label={`${item.page + 1}페이지`}
              // 지금 보고 있는 장은 스크린리더도 알아야 한다
              isCurrent={item.page === currentPage}
              disabled={disabled}
              onClick={() => onChange(item.page)}
            >
              {item.page + 1}
            </PageButton>
          ),
        )}

        <PageButton
          label="다음 페이지"
          disabled={disabled || currentPage >= lastPage - 1}
          onClick={() => onChange(currentPage + 1)}
        >
          다음
        </PageButton>
      </nav>

      {/* 오른쪽 빈 칸 — 왼쪽과 폭을 맞춰 가운데 정렬을 만든다 (좁은 화면에는 칸이 하나뿐이라 없다) */}
      <span className="hidden md:block" />
    </div>
  );
}

/** 지금 페이지 양옆으로 몇 개까지 펼칠지 */
const SIBLING_COUNT = 2;

/** 이 수 이하면 접지 않고 전부 보여준다 (`처음 … 주변 … 끝` 이 오히려 길어진다) */
const COLLAPSE_FROM = 7;

type PageItem = { type: 'page'; page: number } | { type: 'gap'; key: string };

/**
 * 그릴 번호 목록. 처음과 끝은 늘 남기고, 지금 주변만 펼친다.
 * 예) 12장 중 7번째 → `1 … 5 6 7 8 9 … 12`
 */
function pageItemsOf(currentPage: number, lastPage: number): PageItem[] {
  if (lastPage <= COLLAPSE_FROM) {
    return Array.from({ length: lastPage }, (_, index) => ({
      type: 'page',
      page: index,
    }));
  }

  const first = 0;
  const last = lastPage - 1;
  const start = Math.max(1, currentPage - SIBLING_COUNT);
  const end = Math.min(last - 1, currentPage + SIBLING_COUNT);

  const items: PageItem[] = [{ type: 'page', page: first }];

  if (start > 1) items.push({ type: 'gap', key: 'gap-start' });

  for (let page = start; page <= end; page += 1) {
    items.push({ type: 'page', page });
  }

  if (end < last - 1) items.push({ type: 'gap', key: 'gap-end' });

  items.push({ type: 'page', page: last });

  return items;
}

function PageButton({
  label,
  isCurrent = false,
  disabled,
  onClick,
  children,
}: {
  label: string;
  isCurrent?: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={isCurrent ? 'page' : undefined}
      /** 높이 · 최소 폭을 고정한다 — 한 자리에서 두 자리로 넘어가도 줄 길이가 안 흔들린다 */
      className={`h-8 min-w-8 cursor-pointer rounded-button-md border px-2 text-detail font-semibold transition-colors disabled:cursor-not-allowed ${
        isCurrent
          ? 'border-btn-primary bg-btn-primary text-text-white'
          : 'border-border-default bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:text-text-muted disabled:hover:bg-bg-card'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 페이지 이동 줄의 **자리표시**.
 *
 * ⭐ 목록이 뜬 **뒤에** 페이지 줄이 붙으면 표 아래가 한 번 늘어나 화면이 밀린다.
 *    받아오는 동안 같은 높이를 잡아 두면 결과가 와도 아래가 움직이지 않는다.
 * ⚠️ 버튼을 그리지 않는다 — 눌러도 아무 일이 없는 버튼은 고장으로 읽힌다. 막대만 둔다.
 */
export function PaginationPlaceholder() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 items-center gap-2 border-t border-border-default px-5 py-3 md:grid-cols-[1fr_auto_1fr] md:gap-4"
    >
      <span className="h-4 w-20 rounded-button-sm bg-bg-hover" />

      <div className="flex items-center justify-center gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            className={`h-8 rounded-button-md bg-bg-hover ${
              index === 2 ? 'w-11' : 'w-9'
            }`}
          />
        ))}
      </div>

      <span className="hidden md:block" />
    </div>
  );
}
