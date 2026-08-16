/**
 * 좁은 화면(1024px 미만)에서 사이드바를 **떠 있는 판**으로 바꾼다.
 * - 기준선 **1024px** — 이보다 좁으면 사이드바(280px)가 본문을 반 이상 먹는다
 * - 여는 버튼은 왼쪽 아래 고정 · 판은 가운데 · 뒤는 어둡게 덮는다
 * ⚠️ 두 벌을 만들지 않고 **같은 `<aside>`** 에 클래스만 갈아 끼운다.
 */
export const mobileSidebarClasses = {
  /** 여는 버튼 — 화면 왼쪽 아래. `env(safe-area-inset-bottom)` 은 아이폰 홈 바를 피한다 */
  toggleButton:
    'fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-4 z-[1100] flex size-14 cursor-pointer items-center justify-center rounded-pill border border-bg-sidebar-hover bg-bg-sidebar text-text-white shadow-lg min-[1024px]:hidden',

  /** 열린 판 — 화면 가운데. 높이는 화면을 넘지 않게 잡고 안에서 스크롤한다 */
  asideOpen:
    'max-[1023px]:fixed max-[1023px]:top-1/2 max-[1023px]:left-1/2 max-[1023px]:z-[1000] max-[1023px]:max-h-[min(80dvh,640px)] max-[1023px]:w-[min(320px,calc(100dvw-32px))] max-[1023px]:-translate-x-1/2 max-[1023px]:-translate-y-1/2 max-[1023px]:overflow-y-auto max-[1023px]:rounded-base max-[1023px]:shadow-2xl',

  /** 닫힌 판 — 좁은 화면에서는 아예 없앤다 (자리를 차지하면 본문이 밀린다) */
  asideClosed: 'max-[1023px]:hidden',

  /** 뒤를 덮는 판 — 누르면 닫힌다 */
  backdrop:
    'fixed inset-0 z-[900] cursor-default bg-black/40 min-[1024px]:hidden',
} as const;
