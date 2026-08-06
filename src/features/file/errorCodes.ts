/**
 * 파일 도메인 응답 코드 단일 소스.
 * 분기는 **status 가 아니라 `code`** 로 한다 — 같은 status 에 여러 의미가 실린다.
 * (예: 400 에 크기 초과 · 확장자 차단 · 이미 완료가 모두 온다)
 */

export const FILE_CODES = {
  /** 동명 문서 존재 — `allowDuplicateName: true` 로 재요청하면 통과 */
  nameDuplicated: 'FILE_NAME_DUPLICATED',
  sizeExceeded: 'FILE_SIZE_EXCEEDED',
  extensionBlocked: 'FILE_EXTENSION_BLOCKED',
  invalidRequest: 'FILE_INVALID_REQUEST',
  /** 진행 중 결재의 대상 — 회수하거나 완료해야 삭제된다 */
  approvalInProgress: 'FILE_APPROVAL_IN_PROGRESS',
  alreadyDeleted: 'FILE_ALREADY_DELETED',
  alreadyCompleted: 'FILE_ALREADY_COMPLETED',
  /** 저장소에 객체가 없다 — 서버가 버전을 실패로 전환한다 */
  objectNotFound: 'FILE_OBJECT_NOT_FOUND',
  sizeMismatch: 'FILE_SIZE_MISMATCH',
  uploadNotCompleted: 'FILE_UPLOAD_NOT_COMPLETED',
  previewNotSupported: 'FILE_PREVIEW_NOT_SUPPORTED',
  editPermissionRequired: 'FILE_EDIT_PERMISSION_REQUIRED',
  accessPermissionRequired: 'FILE_ACCESS_PERMISSION_REQUIRED',
} as const;

/** 사용자가 파일을 다시 고르지 않아도 재시도할 수 있는지 판단할 때 쓴다 */
export function isDuplicateNameCode(code: string | undefined) {
  return code === FILE_CODES.nameDuplicated;
}
