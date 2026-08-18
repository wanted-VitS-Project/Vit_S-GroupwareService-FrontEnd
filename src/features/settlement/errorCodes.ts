/**
 * 정산 도메인 응답 코드 단일 소스.
 * 409 에 네 가지 뜻이 실려 있어 분기는 status 가 아니라 code 로 한다.
 */

import { ApiError } from '@/lib/api';

export const SETTLEMENT_CODES = {
  /** 400: version 누락 */
  versionRequired: 'SETTLEMENT_VERSION_REQUIRED',
  /** 409: 남이 먼저 저장했다. overwrite 로 덮어쓸 수 있다 */
  versionConflict: 'SETTLEMENT_VERSION_CONFLICT',
  /** 403: 편집 권한 없음 */
  editDenied: 'SETL-001',
  /** 404: 블록이 삭제됐다. overwrite 로도 통과하지 못한다 */
  blockNotFound: 'SETL-002',
  /** 400: 공통 필수 필드 누락 */
  contentRequired: 'SETL-003',
  /** 400: 출금인데 계좌 정보 누락 */
  accountRequired: 'SETL-004',
  /** 400: type 쿼리 누락 · 잘못된 값 */
  typeRequired: 'SETL-005',
  /** 409: 출금에서 입금으로는 바꿀 수 없다 */
  typeDowngrade: 'SETL-006',
  /** 409: 세금계산서 · 입출금이 연결돼 수정할 수 없다 */
  linked: 'SETL-007',
  /** 409: 같은 타입의 다른 회차와 총 예정 금액이 다르다 */
  totalMismatch: 'SETL-008',
  /** 400: 회차 번호가 1 미만 */
  roundInvalid: 'SETL-011',
} as const;

/**
 * 낙관적 락 충돌인지. 409 가 넷이라 status 가 아니라 code 로 판정한다.
 * 버전 충돌만 overwrite 로 통과하고 나머지는 덮어쓰기로도 뚫리지 않는다.
 */
export function isSettlementVersionConflict(error: unknown) {
  return (
    error instanceof ApiError && error.code === SETTLEMENT_CODES.versionConflict
  );
}

/** 폼을 닫고 목록을 다시 읽어야 하는 경우인지 */
export function isSettlementGone(error: unknown) {
  if (!(error instanceof ApiError)) return false;

  return (
    error.code === SETTLEMENT_CODES.blockNotFound ||
    error.code === SETTLEMENT_CODES.linked
  );
}

/**
 * 연결돼서 잠긴 경우인지. 삭제와 달리 블록은 그대로 남는다.
 * 화면이 잠금 상태를 기억해야 열었다 저장에서 막히는 일이 반복되지 않는다.
 */
export function isSettlementLocked(error: unknown) {
  return error instanceof ApiError && error.code === SETTLEMENT_CODES.linked;
}

/** 버전을 못 받아 저장을 시작할 수 없을 때의 문구 */
export const SETTLEMENT_NO_VERSION_MESSAGE =
  '정산 블록의 버전 정보를 받지 못해 저장할 수 없습니다. 새로고침 후 다시 시도해주세요.';
