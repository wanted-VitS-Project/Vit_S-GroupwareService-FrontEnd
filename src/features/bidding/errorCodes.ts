/** 입찰 응답 코드 단일 소스. 접두어는 전부 BIDDING_ 다 */

export const BIDDING_CODES = {
  /**
   * 400 — 조회 조건 오류.
   * 흔한 원인은 sort 값이다. Spring 규약이 아니라 자체 enum(ANNOUNCED_DESC 등)을 받는다.
   */
  invalidNoticeQuery: 'BIDDING_INVALID_NOTICE_QUERY',
  /** 404 — 없는 공고 */
  noticeNotFound: 'BIDDING_NOTICE_NOT_FOUND',

  /** 400 — 직접 등록 입력 오류 */
  invalidManualNotice: 'BIDDING_INVALID_MANUAL_NOTICE',
  /** 409 — 같은 공고를 이미 직접 등록함 */
  manualNoticeDuplicated: 'BIDDING_MANUAL_NOTICE_DUPLICATED',
  /**
   * 409 — 직접 등록 공고의 첨부가 10개를 넘었다.
   * 화면에서도 막지만 다른 탭에서 먼저 올렸을 수 있어 서버 코드도 받아 둔다.
   */
  manualNoticeAttachmentLimitExceeded:
    'BIDDING_MANUAL_NOTICE_ATTACHMENT_LIMIT_EXCEEDED',
  /** 409 — 완료 통보가 이미 끝난 첨부 */
  manualNoticeAttachmentAlreadyCompleted:
    'BIDDING_MANUAL_NOTICE_ATTACHMENT_ALREADY_COMPLETED',
  /**
   * 409 — 저장소에 올라간 파일이 없거나 크기가 요청과 다르다.
   * 저장소 PUT 이 조용히 실패한 경우라 다시 올려야 한다.
   */
  manualNoticeAttachmentUploadFailed:
    'BIDDING_MANUAL_NOTICE_ATTACHMENT_UPLOAD_FAILED',
  manualNoticeAttachmentObjectNotFound:
    'BIDDING_MANUAL_NOTICE_ATTACHMENT_OBJECT_NOT_FOUND',
  manualNoticeAttachmentSizeMismatch:
    'BIDDING_MANUAL_NOTICE_ATTACHMENT_SIZE_MISMATCH',
  /** 404 — 업로드 슬롯이 없다 (다른 공고의 첨부 ID 등) */
  manualNoticeAttachmentNotFound: 'BIDDING_MANUAL_NOTICE_ATTACHMENT_NOT_FOUND',
  /** 409 — 수집된 공고(sourceCode !== 'MANUAL')는 수정할 수 없다 */
  noticeEditNotAllowed: 'BIDDING_NOTICE_EDIT_NOT_ALLOWED',
  /**
   * 403 — 입찰 접근 권한 없음.
   * 화면이 아니라 lib/api.ts 가 전역으로 받아 /forbidden 으로 보낸다.
   */
  accessPermissionRequired: 'BIDDING_ACCESS_PERMISSION_REQUIRED',
  /** 401 — 세션 없음 · 만료. 이것도 lib/api.ts 가 전역으로 처리한다 */
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

  /** 400 — 요약 요청 입력 오류 (프롬프트 누락 등) */
  invalidSummaryRequest: 'BIDDING_INVALID_SUMMARY_REQUEST',
  /** 404 — 없는 요약 */
  summaryNotFound: 'BIDDING_SUMMARY_NOT_FOUND',
  /**
   * 409 — 이 공고에 이미 요약이 돌고 있다.
   * 실패가 아니라 이력을 다시 받아 진행 중인 요약을 이어서 폴링하면 된다.
   */
  summaryAlreadyProcessing: 'BIDDING_SUMMARY_ALREADY_PROCESSING',
  /** 400 — 요약 수정 입력 오류 (여섯 칸이 모두 비었을 때 등) */
  invalidSummaryUpdate: 'BIDDING_INVALID_SUMMARY_UPDATE',
  /** 409 — 확정됐거나 아직 완료 전이라 수정할 수 없다 */
  summaryNotEditable: 'BIDDING_SUMMARY_NOT_EDITABLE',
  /** 409 — 아직 `COMPLETED` 가 아니라 확정할 수 없다 */
  summaryNotCompleted: 'BIDDING_SUMMARY_NOT_COMPLETED',
  /** 409 — 이미 확정됨. 되돌릴 수 없다 */
  summaryAlreadyConfirmed: 'BIDDING_SUMMARY_ALREADY_CONFIRMED',

  /** 400 — 검토 요청 입력 오류 (문서를 하나도 안 골랐거나 프롬프트 누락) */
  invalidReviewRequest: 'BIDDING_INVALID_REVIEW_REQUEST',
  /** 404 — 없는 검토 */
  reviewNotFound: 'BIDDING_REVIEW_NOT_FOUND',
  /** 403 — 남이 요청한 검토 */
  reviewAccessDenied: 'BIDDING_REVIEW_ACCESS_DENIED',
  /** 403 — 고른 문서를 볼 권한이 없다 */
  reviewDocumentAccessDenied: 'BIDDING_REVIEW_DOCUMENT_ACCESS_DENIED',
  /** 404 — 고른 첨부가 그 공고에 없다 */
  noticeAttachmentNotFound: 'BIDDING_NOTICE_ATTACHMENT_NOT_FOUND',
  /**
   * 409 — 이 공고에 이미 검토가 돌고 있다.
   * 실패가 아니라 이력을 다시 받아 진행 중인 검토를 이어서 폴링한다.
   */
  reviewAlreadyProcessing: 'BIDDING_REVIEW_ALREADY_PROCESSING',
  /** 409 — 고른 문서가 아직 임시 저장소에 준비되지 않았다 */
  reviewDocumentNotReady: 'BIDDING_REVIEW_DOCUMENT_NOT_READY',
  /** 409 — 이미 끝났거나 전환돼 종료할 수 없다 */
  reviewNotAbandonable: 'BIDDING_REVIEW_NOT_ABANDONABLE',

  /* 프로젝트 전환 — 409 가 다섯 갈래라 화면에서 각각 다르게 안내한다 */
  noticeAlreadyLinked: 'PROJECT_BID_NOTICE_ALREADY_LINKED',
  reviewNotCompleted: 'BIDDING_REVIEW_NOT_COMPLETED',
  reviewAlreadyLinkedToProject: 'BIDDING_REVIEW_ALREADY_LINKED_TO_PROJECT',
  summaryNotConfirmed: 'BIDDING_SUMMARY_NOT_CONFIRMED',
  summaryAlreadyLinked: 'BIDDING_SUMMARY_ALREADY_LINKED',
  /** 422 — AI 가 읽을 수 없는 형식 (`supported: false` 를 고른 경우) */
  reviewUnsupportedFile: 'BIDDING_REVIEW_UNSUPPORTED_FILE',
} as const;
