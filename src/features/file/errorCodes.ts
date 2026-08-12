/**
 * 파일 도메인 응답 코드 단일 소스.
 * 분기는 **status 가 아니라 `code`** 로 한다 — 같은 status 에 여러 의미가 실린다.
 * (예: 400 에 크기 초과 · 확장자 차단 · 이미 완료가 모두 온다)
 */

import { ApiError } from '@/lib/api';

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
  /**
   * 409 — 문서명 수정 중 남이 먼저 저장했다 (2026-08-11 낙관적 락 신설).
   * `overwrite: true` 로 덮어쓸 수 있다.
   */
  versionConflict: 'FILE_VERSION_CONFLICT',
} as const;

/** 사용자가 파일을 다시 고르지 않아도 재시도할 수 있는지 판단할 때 쓴다 */
export function isDuplicateNameCode(code: string | undefined) {
  return code === FILE_CODES.nameDuplicated;
}

/**
 * 문서명 수정이 낙관적 락으로 막혔는지.
 *
 * ⚠️ 이 도메인은 **409 에 다른 의미도 있다** (`FILE_APPROVAL_IN_PROGRESS` 등) —
 *    그래서 텍스트 · 이미지와 달리 status 로 넘겨짚지 않고 **`code` 만** 본다.
 */
export function isFileVersionConflict(error: unknown) {
  return error instanceof ApiError && error.code === FILE_CODES.versionConflict;
}
