/**
 * 입찰 응답 코드 단일 소스. (스웨거 실측 — 2026-08-11)
 *
 * ⚠️ 초안 명세와 접두어가 다르다. 전부 `BIDDING_` 이고 `BID_NOTICE_` 는 쓰지 않는다.
 */

export const BIDDING_CODES = {
  /**
   * 400 — 조회 조건 오류.
   *
   * ⚠️ 제일 흔한 원인은 **`sort` 값**이다. Spring 규약(`bidDeadlineAt,asc`)이 아니라
   *    자체 enum(`ANNOUNCED_DESC` 등)을 받는다.
   */
  invalidNoticeQuery: 'BIDDING_INVALID_NOTICE_QUERY',
  /** 404 — 없는 공고 */
  noticeNotFound: 'BIDDING_NOTICE_NOT_FOUND',

  /** 400 — 직접 등록 입력 오류 */
  invalidManualNotice: 'BIDDING_INVALID_MANUAL_NOTICE',
  /** 409 — 같은 공고를 이미 직접 등록함 */
  manualNoticeDuplicated: 'BIDDING_MANUAL_NOTICE_DUPLICATED',
  /**
   * 409 — 수정할 수 없는 공고.
   *
   * ⚠️ **수집된 공고(`sourceCode !== 'MANUAL'`)는 수정할 수 없다** — 직접 등록한 것만 고친다.
   */
  noticeEditNotAllowed: 'BIDDING_NOTICE_EDIT_NOT_ALLOWED',
  /**
   * 403 — 입찰 접근 권한 없음.
   *
   * ⚠️ 화면이 직접 처리하지 않는다 — `lib/api.ts` 가 403 을 전역 이벤트로 흘려
   *    `/forbidden` 으로 보낸다. 여기 적어두는 것은 **문서용**이다.
   */
  accessPermissionRequired: 'BIDDING_ACCESS_PERMISSION_REQUIRED',
  /** 401 — 세션 없음 · 만료. 이것도 `lib/api.ts` 가 전역으로 처리한다 */
  unauthenticated: 'AUTH_UNAUTHENTICATED',

  /** 400 — 비활성 수집 조건으로 수동 수집을 요청함 */
  inactiveCollectionCondition: 'BIDDING_INACTIVE_COLLECTION_CONDITION',
  /** 404 — 없는 수집 조건 */
  collectionConditionNotFound: 'BIDDING_COLLECTION_CONDITION_NOT_FOUND',
  /** 409 — 이미 수집이 돌고 있음 */
  collectionRunAlreadyProcessing: 'BIDDING_COLLECTION_RUN_ALREADY_PROCESSING',
  /** 404 — 없는 수집 실행 */
  collectionRunNotFound: 'BIDDING_COLLECTION_RUN_NOT_FOUND',
  /** 400 — 수집 조건 입력 오류 */
  invalidCollectionCondition: 'BIDDING_INVALID_COLLECTION_CONDITION',
  /** 400 — 수집 조건의 조합 수가 상한을 넘음 */
  collectionQueryLimitExceeded: 'BIDDING_COLLECTION_QUERY_LIMIT_EXCEEDED',
  /** 400 — 지원하지 않는 수집처 `sourceCode` */
  unsupportedSource: 'BIDDING_UNSUPPORTED_SOURCE',
} as const;
