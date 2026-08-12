/** 결재 응답 코드 단일 소스. 분기는 status 가 아니라 `code` 로 한다. */

export const APPROVAL_CODES = {
  /** 400 — 제목 · 내용이 비었다 */
  contentRequired: 'APPROVAL_CONTENT_REQUIRED',
  /** 400 — 결재 문서가 하나도 없다 */
  documentRequired: 'APPROVAL_DOCUMENT_REQUIRED',
  /** 400 — 결재자가 한 명도 없다 */
  lineEmpty: 'APPROVAL_LINE_EMPTY',
  /** 400 — 결재 순서가 중복되거나 비어 있다 */
  lineOrderInvalid: 'APPROVAL_LINE_ORDER_INVALID',
  /** 400 — 일반 결재자가 프로젝트 member 가 아니다 (MASTER · ADMIN 은 제외) */
  lineApproverNotMember: 'APPROVAL_LINE_APPROVER_NOT_MEMBER',
  /** 403 — 기안자만 할 수 있는 동작 */
  notDrafter: 'APPROVAL_NOT_DRAFTER',
  /**
   * 403 — 아직 차례가 오지 않은 결재자(WAITING)의 조회.
   * ⚠️ `/forbidden` 으로 보내지 않는다 — 차례가 오면 볼 수 있어 화면 안에서 안내한다.
   */
  lineNotViewable: 'APPROVAL_LINE_NOT_VIEWABLE',
  /** 404 */
  notFound: 'APPROVAL_NOT_FOUND',
  revisionNotFound: 'APPROVAL_REVISION_NOT_FOUND',
  documentNotFound: 'APPROVAL_DOCUMENT_NOT_FOUND',
  /** 409 — DRAFT 가 아닌 회차를 고치려 했다 (중복 상신 포함) */
  revisionNotDraft: 'APPROVAL_REVISION_NOT_DRAFT',
  /** 409 — 반려되지 않은 결재를 재상신하려 했다 */
  notRejected: 'APPROVAL_NOT_REJECTED',
  /**
   * 403 — 그 결재선의 결재자가 아니다.
   * ⚠️ **없는 `lineId` 도 이 코드로 온다** — 404 로 구분되지 않는다.
   */
  lineForbidden: 'APPROVAL_LINE_FORBIDDEN',
  /** 409 — 이미 승인 · 반려한 결재선의 중복 처리 (AP-040) */
  lineAlreadyProcessed: 'APPROVAL_LINE_ALREADY_PROCESSED',
} as const;

/** 승인 · 반려 실패 문구. 백엔드 문구가 없을 때만 쓴다 */
export const LINE_PROCESS_LABELS: Record<string, string> = {
  [APPROVAL_CODES.lineForbidden]: '이 결재를 처리할 권한이 없습니다.',
  [APPROVAL_CODES.lineAlreadyProcessed]: '이미 처리된 결재입니다.',
};

/**
 * 결재 문서 연결에서 넘어오는 파일 도메인 코드.
 * ⚠️ `DOCUMENT_ALREADY_LINKED` 만 접두사가 없다 — 명세 그대로 둔다.
 */
export const APPROVAL_DOCUMENT_CODES = {
  /** 404 — 없는 파일 버전 */
  fileVersionNotFound: 'FILE_VERSION_NOT_FOUND',
  /** 409 — 업로드가 끝나지 않은 파일 버전 */
  fileVersionNotReady: 'FILE_VERSION_NOT_READY',
  /** 409 — 이미 이 회차에 연결된 파일 버전 */
  alreadyLinked: 'DOCUMENT_ALREADY_LINKED',
} as const;

/** 상신 전 검증 실패 문구. 어느 항목이 문제인지 폼에서 짚어주려고 나눠 둔다 */
export const SUBMIT_BLOCKER_LABELS: Record<string, string> = {
  [APPROVAL_CODES.contentRequired]: '결재 제목과 내용을 입력해주세요.',
  [APPROVAL_CODES.documentRequired]:
    '결재 대상 문서를 한 개 이상 선택해주세요.',
  [APPROVAL_CODES.lineEmpty]: '결재자를 한 명 이상 지정해주세요.',
  [APPROVAL_CODES.lineOrderInvalid]: '결재 순서가 중복되거나 비어 있습니다.',
  [APPROVAL_CODES.lineApproverNotMember]:
    '프로젝트에 참여하지 않은 결재자가 있습니다.',
};
