/**
 * 좁은 화면(1024px 미만)에서 사이드바를 **떠 있는 판**으로 바꾼다.
 * - 기준선 **1024px** — 이보다 좁으면 사이드바(280px)가 본문을 반 이상 먹는다
 * - 여는 버튼은 왼쪽 아래 고정 · 판은 가운데 · 뒤는 어둡게 덮는다
 * ⚠️ 두 벌을 만들지 않고 **같은 `<aside>`** 에 클래스만 갈아 끼운다.
 */
/**
 * 기준선 **1024px** — 이 아래에서 사이드바가 떠 있는 판이 된다.
 *
 * ⚠️ 아래 클래스 문자열의 `max-[1023px]` · `min-[1024px]` 와 **같은 값이어야 한다.**
 *    판이 모달로 동작해야 하는지(`useNarrowScreen`)를 JS 가 판정할 때 이 값을 쓴다 —
 *    CSS 와 JS 가 서로 다른 폭을 보면, 화면은 판인데 초점은 갇히지 않는 상태가 생긴다.
 */
export const MOBILE_SIDEBAR_MAX_WIDTH = 1023;

export const mobileSidebarClasses = {
  /**
   * 여는 버튼 — 화면 왼쪽 아래. `env(safe-area-inset-bottom)` 은 아이폰 홈 바를 피한다.
   *
   * 44px(`size-11`) 이 **하한선**이다 — 더 줄이면 손가락으로 정확히 짚기 어렵다
   * (WCAG 2.5.8 Target Size 최소 24px, 애플 · 구글 권장 44px).
   */
  toggleButton:
    'fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-4 z-[1100] flex size-11 cursor-pointer items-center justify-center rounded-pill border border-bg-sidebar-hover bg-bg-sidebar text-text-white shadow-lg min-[1024px]:hidden',

  /**
   * 열린 판 — 화면 가운데. 높이는 화면을 넘지 않게 잡는다.
   *
   * ⚠️ **스크롤(`overflow-*`)은 여기서 정하지 않는다.** 쓰는 쪽이 이미 자기 스크롤을
   *    들고 있다 — `Sidebar` 는 판 자체가(`overflow-y-auto`), `ProjectSidebar` 는
   *    판은 잠그고(`overflow-hidden`) 안쪽 목록이 구른다. 여기서 한 벌 더 얹으면
   *    같은 성질의 클래스가 둘이 되어 어느 쪽이 이길지 CSS 순서에 달린다.
   */
  asideOpen:
    'max-[1023px]:fixed max-[1023px]:top-1/2 max-[1023px]:left-1/2 max-[1023px]:z-[1000] max-[1023px]:max-h-[min(80dvh,640px)] max-[1023px]:w-[min(320px,calc(100dvw-32px))] max-[1023px]:-translate-x-1/2 max-[1023px]:-translate-y-1/2 max-[1023px]:rounded-base max-[1023px]:shadow-2xl',

  /** 닫힌 판 — 좁은 화면에서는 아예 없앤다 (자리를 차지하면 본문이 밀린다) */
  asideClosed: 'max-[1023px]:hidden',

  /**
   * 판 **안쪽** 트리 — 고정 폭(`w-70`)을 들고 있는 래퍼에 덧댄다.
   *
   * `ProjectSidebar` 는 접힘 전환 때문에 바깥 `<aside>` 와 안쪽 래퍼가 **각자 폭을 든다**.
   * 좁은 화면에서 바깥만 `w-[min(320px,…)]` 로 바뀌면 안쪽 280px 이 그대로 남아
   * 오른쪽에 빈 띠가 생긴다 — 안쪽은 판을 꽉 채우게 한다.
   */
  panelInner: 'max-[1023px]:w-full',

  /**
   * 본문 아래 여백 — 왼쪽 아래 여는 버튼이 마지막 줄을 덮지 않게 비워 둔다.
   * 버튼(44px) + 아래 여백(16px) + 숨 쉴 자리. 버튼 크기를 바꾸면 여기도 함께 본다.
   */
  contentBottomGap: 'max-[1023px]:pb-20',

  /** 뒤를 덮는 판 — 누르면 닫힌다 */
  backdrop:
    'fixed inset-0 z-[900] cursor-default bg-black/40 min-[1024px]:hidden',
} as const;
