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
  /** 404 — 없거나 다른 회사의 스텝 */
  notFound: 'STEP_NOT_FOUND',
  /** 404 — `moveBlockIds` 에 이 스텝의 블록이 아닌 ID 가 섞임 */
  blockNotFound: 'BLOCK_NOT_FOUND',
  /** 403 — 이 스텝에 NONE·VIEWER 오버라이드가 걸려 하위 정리가 막힘 */
  editDenied: 'STEP_EDIT_DENIED',
} as const;

/**
 * 낙관적 락 충돌인지.
 *
 * 스테이지 · 스텝이 코드만 다르고 **화면 대응은 같다** —
 * "다시 불러오기 / 덮어쓰기" 를 묻는 한 갈래라 판정 함수를 하나로 둔다.
 */
export function isVersionConflict(code: string | undefined) {
  return (
    code === STAGE_CODES.versionConflict || code === STEP_CODES.versionConflict
  );
}
