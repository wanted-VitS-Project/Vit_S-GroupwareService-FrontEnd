// 블록 도메인 응답 코드 단일 소스.
// 분기는 status 가 아니라 code 로 한다 — 400 하나에 여러 의미가 실린다.

import { ApiError } from '@/lib/api';

export const BLOCK_CODES = {
  /** colSpan 이 1~3 범위 밖 */
  colSpanInvalid: 'BLOCK_COL_SPAN_INVALID',
  /** 배치 목록이 비었거나 다른 스텝의 블록이 섞임 */
  layoutInvalid: 'BLOCK_LAYOUT_INVALID',
  notFound: 'BLOCK_NOT_FOUND',
  /** 스텝 편집 권한 없음 — 전역 403 이 아니라 이 화면에서 안내한다 */
  stepEditDenied: 'STEP_EDIT_DENIED',
  /** version 을 빠뜨림 (2026-08-11 낙관적 락 신설) */
  versionRequired: 'BLOCK_VERSION_REQUIRED',
  /** 수정 요청에 title·owner 가 둘 다 없음 */
  updateFieldRequired: 'BLOCK_UPDATE_FIELD_REQUIRED',
  // 409 — 상신 이후의 결재가 붙은 블록이라 확인이 필요하다.
  // 실패가 아니라 되물음이다. message 에 무엇을 잃는지가 상태별(진행 중·반려·완료)로
  // 담겨 오므로 그 문구를 그대로 띄우고 confirmApprovalCancel 로 다시 부른다.
  approvalDeleteConfirmRequired: 'APPROVAL_DELETE_CONFIRM_REQUIRED',
} as const;

// 배치 저장 실패 문구.
// 백엔드 message 를 그대로 쓰면 "다른 스텝의 블록이 섞임" 같은 내부 사정이 그대로 나온다.
// 사용자가 다음에 뭘 해야 하는지가 갈리는 코드만 우리 문구로 덮는다.
export function layoutErrorMessage(code: string | undefined) {
  if (code === BLOCK_CODES.stepEditDenied) {
    return '이 스텝을 편집할 권한이 없어 배치가 저장되지 않았습니다.';
  }
  if (code === BLOCK_CODES.notFound) {
    return '삭제된 블록이 있어 배치를 저장하지 못했습니다. 새로고침해주세요.';
  }
  // 아래 셋은 사용자가 고칠 수 있는 게 아니라 우리 요청이 잘못된 경우다.
  // 백엔드 문구("다른 스텝의 블록이 섞임" 등)를 그대로 보여주면 내부 사정이 새어 나간다
  if (
    code === BLOCK_CODES.layoutInvalid ||
    code === BLOCK_CODES.colSpanInvalid ||
    code === BLOCK_CODES.versionRequired
  ) {
    return '배치를 저장하지 못했습니다. 새로고침 후 다시 시도해주세요.';
  }
  return null;
}

// 배치 저장이 409 로 막혔을 때의 문구.
// 이 API 에는 overwrite 가 없다 — 덮어쓸 방법이 없어 재조회가 유일한 출구다.
// 그래서 "다시 시도" 가 아니라 "최신 배치를 불러온다" 로 안내한다.
export const LAYOUT_CONFLICT_MESSAGE =
  '다른 사람이 먼저 배치를 바꿨습니다. 최신 배치를 불러옵니다.';

// 텍스트 본문 수정 코드 (2026-08-11 낙관적 락 신설).
// 이 도메인의 나머지 코드는 TXT-001 처럼 번호식인데, 낙관락 코드만
// 팀 표준({도메인}_VERSION_*)을 따라 의미식이다 — 헷갈리기 쉬워 여기 모아 둔다.
export const TEXT_CODES = {
  /** 400 — version 을 빠뜨렸다 */
  versionRequired: 'TEXT_VERSION_REQUIRED',
  /** 409 — 그 사이 남이 먼저 저장했다. overwrite: true 로 덮어쓸 수 있다 */
  versionConflict: 'TEXT_VERSION_CONFLICT',
  /** 400 — 내용이 비었다 */
  contentRequired: 'TXT-003',
  editDenied: 'TXT-001',
  notFound: 'TXT-002',
} as const;

/** 이미지 항목 수정 코드 (2026-08-11 낙관적 락 신설) */
export const IMAGE_CODES = {
  versionRequired: 'IMAGE_VERSION_REQUIRED',
  /** 409 — 배열 중 하나라도 어긋났다. 이 API 에는 overwrite 가 없다 */
  versionConflict: 'IMAGE_VERSION_CONFLICT',
  /** 400 — 다른 블록·중복·없는 imgId 가 섞였다 */
  listInvalid: 'IMG-005',
  editDenied: 'IMG-002',
  notFound: 'IMG-003',
} as const;

// 낙관적 락 충돌인지 — 텍스트·이미지 공용.
// code 가 비어 있어도 409 면 충돌로 본다 — 두 API 의 409 는 이것뿐이고,
// 코드를 못 읽었다고 조용히 삼키면 사용자는 저장된 줄 안다.
function isVersionConflict(error: unknown, code: string) {
  if (!(error instanceof ApiError)) return false;

  return error.code === code || error.status === 409;
}

export function isTextVersionConflict(error: unknown) {
  return isVersionConflict(error, TEXT_CODES.versionConflict);
}

export function isImageVersionConflict(error: unknown) {
  return isVersionConflict(error, IMAGE_CODES.versionConflict);
}

/** 버전을 못 받아 저장을 시작조차 할 수 없을 때 — 두 화면이 같은 문구를 쓴다 */
export const NO_VERSION_MESSAGE =
  '버전 정보를 받지 못해 저장할 수 없습니다. 새로고침 후 다시 시도해주세요.';

// 이미지 저장이 409 로 막혔을 때.
// overwrite 가 없다 — 여러 장 배열이라 "무엇을 덮어쓸지" 가 정해지지 않는다.
export const IMAGE_CONFLICT_MESSAGE =
  '다른 사람이 먼저 이미지를 수정했습니다. 최신 목록을 다시 불러왔으니 확인 후 저장해주세요.';
