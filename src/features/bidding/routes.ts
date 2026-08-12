/**
 * 입찰 화면 경로 단일 소스. 경로 문자열을 컴포넌트에 직접 쓰지 않는다.
 *
 * ⚠️ 경로가 `/bidding/...` 이 아니라 `/notices` 다 — 사이드바 카탈로그의
 *    `BIDDING` 코드가 이 경로에 매핑돼 있다 (`features/pagePermission/catalog.ts`).
 */

const NOTICES = '/notices';

export const BIDDING_ROUTES = {
  list: NOTICES,
  /** 공고 직접 등록 — 수집으로 못 가져온 공고를 사람이 넣는다 */
  create: `${NOTICES}/new`,
  /**
   * 수집 조건 관리 — 무엇을 가져올지 정하고 수동 수집을 돌리는 운영 화면.
   * ⚠️ `[noticeId]` 동적 세그먼트보다 정적 경로가 우선이라 `conditions` 로 안전하다.
   */
  conditions: `${NOTICES}/conditions`,
  detail: (noticeId: number | string) => `${NOTICES}/${noticeId}`,
} as const;
