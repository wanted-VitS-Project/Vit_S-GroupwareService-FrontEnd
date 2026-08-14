'use client';

/**
 * 스텝 이름 **왼쪽**에 서는 블록 새로고침 버튼.
 *
 * 페이지 전체를 다시 그리지 않는다 — 블록 목록 하나만 다시 읽는다.
 * 서버가 변경을 밀어주는 통로가 없어(WebSocket · SSE 없음) **같은 화면에 머무는 동안**
 * 남이 바꾼 것을 가져올 방법이 이 버튼뿐이다.
 *
 * ⚠️ 처음 불러오는 중에는 **잠그지 않는다.** 첫 화면부터 회색 버튼이 놓여 있으면
 *    "고장 난 버튼" 으로 학습된다. 중복 요청은 react-query 가 합쳐 준다.
 */
export default function RefreshBlocksButton({
  isRefreshing,
  isDisabled = false,
  onRefresh,
}: {
  /** 사용자가 눌러서 도는 중 — 아이콘이 돌고 그동안만 잠긴다 */
  isRefreshing: boolean;
  /** 배치 편집 중 — 목록이 갈리면 편집 기준까지 어긋난다 */
  isDisabled?: boolean;
  onRefresh: () => void;
}) {
  return (
    <button
      type="button"
      // 아이콘만 있는 버튼이라 이름을 따로 준다 (스크린 리더)
      aria-label="블록 새로고침"
      // 툴팁은 **못 누르는 이유**까지 말해 준다 — 회색 버튼만 보이면 이유를 알 수 없다
      title={
        isDisabled ? '배치 편집 중에는 새로고침할 수 없어요' : '블록 새로고침'
      }
      aria-busy={isRefreshing}
      disabled={isDisabled || isRefreshing}
      onClick={onRefresh}
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border-default bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RefreshIcon className={isRefreshing ? 'animate-spin' : undefined} />
    </button>
  );
}

/** 화살표가 원을 그리는 표준 새로고침 표시 */
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`size-3.5 shrink-0 ${className ?? ''}`}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
