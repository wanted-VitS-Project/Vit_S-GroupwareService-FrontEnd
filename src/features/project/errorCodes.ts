/**
 * 스테이지 · 스텝 응답 코드 단일 소스.
 * 분기는 **status 가 아니라 `code`** 로 한다 — 400 하나에 여러 의미가 실린다.
 */

export const STAGE_CODES = {
  /** 409 — 그 사이 남이 먼저 저장했다. 재조회 / 덮어쓰기를 물어야 한다 */
  versionConflict: 'STAGE_VERSION_CONFLICT',
  /** 400 — 하위 스텝 이전 대상이 지정되지 않음 */
  moveTargetRequired: 'STAGE_MOVE_TARGET_REQUIRED',
  /** 400 — 이전 대상이 다른 프로젝트이거나 자기 자신 */
  moveTargetInvalid: 'STAGE_MOVE_TARGET_INVALID',
  /** 404 — 없거나 **다른 회사의 스테이지** (2026-08-11 회사 격리) */
  notFound: 'STAGE_NOT_FOUND',
  /** 403 — 프로젝트 편집 권한 없음 */
  editDenied: 'PROJECT_EDIT_DENIED',
} as const;

export const STEP_CODES = {
  /** 409 — 그 사이 남이 먼저 저장했다 */
  versionConflict: 'STEP_VERSION_CONFLICT',
  /** 400 — `moveBlockIds` 는 있는데 `moveToStepId` 가 없음 */
  blockMoveTargetRequired: 'BLOCK_MOVE_TARGET_REQUIRED',
  /** 400 — 이동 대상이 다른 프로젝트이거나 삭제 대상 스텝 자신 */
  blockMoveTargetInvalid: 'BLOCK_MOVE_TARGET_INVALID',
  /** 400 — 미완료 이슈 처리 방식이 지정되지 않음 */
  openIssueActionRequired: 'OPEN_ISSUE_ACTION_REQUIRED',
  /** 400 — 허용되지 않은 처리 방식 */
  openIssueActionInvalid: 'OPEN_ISSUE_ACTION_INVALID',
  /** 400 — 허용되지 않은 상태 값 (**`DONE` 포함** — 완료는 `complete` 소관이다) */
  statusInvalid: 'STEP_STATUS_INVALID',
  /** 400 — `version` 누락 */
  versionRequired: 'STEP_VERSION_REQUIRED',
  /** 404 — 없거나 다른 회사의 스텝 */
  notFound: 'STEP_NOT_FOUND',
  /** 404 — `moveBlockIds` 에 이 스텝의 블록이 아닌 ID 가 섞임 */
  blockNotFound: 'BLOCK_NOT_FOUND',
  /** 403 — 이 스텝에 NONE·VIEWER 오버라이드가 걸려 하위 정리가 막힘 */
  editDenied: 'STEP_EDIT_DENIED',
} as const;

/**
 * 참여자 · 프로젝트 설정 응답 코드. (.ai/API.md 125~133)
 *
 * 자기 자신 차단(`selfEditDenied`)은 **권한 변경 · 제거 · 스텝 권한이 함께 쓴다** —
 * 백엔드가 막지만 화면도 미리 막으므로, 여기 걸리면 목록이 낡았다는 뜻이다.
 */
export const MEMBER_CODES = {
  /** 403 — 자기 자신의 권한 행은 바꾸거나 지울 수 없다 (INV-10) */
  selfEditDenied: 'MEMBER_SELF_EDIT_DENIED',
  /** 400 — `NONE` · `MANAGER` 등 폐기된 등급 (2026-08-06) */
  permissionInvalid: 'MEMBER_PERMISSION_INVALID',
  /** 409 — 이미 참여자로 등록됨 */
  alreadyExists: 'MEMBER_ALREADY_EXISTS',
  /** 404 — 참여자 행이 없다 (남이 먼저 뺐다) */
  notFound: 'MEMBER_NOT_FOUND',
  /** 404 — 없는 사번 · **삭제된 사원** · 다른 회사의 사원 */
  userNotFound: 'USER_NOT_FOUND',
  /** 403 — 프로젝트 편집 권한 없음 */
  editDenied: 'PROJECT_EDIT_DENIED',
} as const;

export const PROJECT_CODES = {
  /** 409 — 그 사이 남이 먼저 저장했다. 재조회 / 덮어쓰기를 물어야 한다 */
  versionConflict: 'PROJECT_VERSION_CONFLICT',
  /** 400 — `version` 누락 */
  versionRequired: 'PROJECT_VERSION_REQUIRED',
  /** 400 — 과업명이 비었다 (`null` · 공백 포함) */
  nameRequired: 'PROJECT_NAME_REQUIRED',
  /** 400 — 과업명 300자 초과 */
  nameTooLong: 'PROJECT_NAME_TOO_LONG',
  /** 400 — 시작일이 종료일보다 늦다 */
  dateRangeInvalid: 'PROJECT_DATE_RANGE_INVALID',
  /** 400 — 발주처 200자 초과 */
  clientNameTooLong: 'CLIENT_NAME_TOO_LONG',
  /** 400 — 계약금액이 음수 */
  contractAmountInvalid: 'CONTRACT_AMOUNT_INVALID',
  /** 400 — 허용되지 않은 상태 값 (**`CLOSED` 포함**) */
  statusInvalid: 'PROJECT_STATUS_INVALID',
  /** 400 — 종결 사유 미입력 */
  closeReasonRequired: 'CLOSE_REASON_REQUIRED',
  /** 400 — 목록에 없는 종결 사유 코드 */
  closeReasonInvalid: 'CLOSE_REASON_INVALID',
  /** 400 — 종결 사유 상세 500자 초과 */
  closeReasonNoteTooLong: 'CLOSE_REASON_NOTE_TOO_LONG',
  /** 404 — 없거나 삭제됨 · **다른 회사의 프로젝트** */
  notFound: 'PROJECT_NOT_FOUND',
  /**
   * 409 — 지울 범위 확인이 필요하다 (삭제 · .ai/API.md 139).
   * ⚠️ **금지가 아니다** — `confirm=true` 로 재요청하면 삭제된다.
   *    `message` 에 삭제될 스텝 수가 담겨 오므로 **그 문구를 그대로 띄운다.**
   */
  deleteConfirmRequired: 'PROJECT_DELETE_CONFIRM_REQUIRED',
  /**
   * 409 — 이미 다른 프로젝트가 연결된 공고다 (생성 · .ai/API.md 138).
   * **같은 회사 안에서만** 본다 — 다른 회사가 같은 공고를 쓴 것은 충돌이 아니다.
   */
  bidNoticeAlreadyLinked: 'PROJECT_BID_NOTICE_ALREADY_LINKED',
} as const;

export const PROJECT_CATEGORY_CODES = {
  /** 400 — 카테고리 ID 목록이 비었다 */
  idsRequired: 'CATEGORY_IDS_REQUIRED',
  /** 409 — 이미 연결된 카테고리가 섞였다. **요청 전체가 실패**한다 */
  duplicated: 'BUSINESS_CATEGORY_DUPLICATED',
  /** 404 — 없거나 삭제된 카테고리 · 다른 회사의 카테고리 */
  notFound: 'BUSINESS_CATEGORY_NOT_FOUND',
  /** 404 — 연결되지 않은 카테고리를 해제하려 했다 */
  notLinked: 'BUSINESS_CATEGORY_NOT_LINKED',
} as const;

/** 스텝 권한 오버라이드 (.ai/API.md 128 · 134~136) */
export const STEP_PERMISSION_CODES = {
  /** 400 — 허용되지 않은 권한 등급 */
  invalid: 'STEP_PERMISSION_INVALID',
  /** 404 — 회수할 오버라이드 행이 없다 (이미 상속 상태다) */
  notFound: 'STEP_PERMISSION_NOT_FOUND',
} as const;

/**
 * 낙관적 락 충돌인지.
 *
 * 스테이지 · 스텝이 코드만 다르고 **화면 대응은 같다** —
 * "다시 불러오기 / 덮어쓰기" 를 묻는 한 갈래라 판정 함수를 하나로 둔다.
 */
export function isVersionConflict(code: string | undefined) {
  return (
    code === STAGE_CODES.versionConflict ||
    code === STEP_CODES.versionConflict ||
    code === PROJECT_CODES.versionConflict
  );
}
