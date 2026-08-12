/**
 * 정산 도메인 응답 코드 단일 소스.
 * 분기는 **status 가 아니라 `code`** 로 한다 — 이 도메인은 **409 에 네 가지 뜻**이 실린다.
 */

import { ApiError } from '@/lib/api';

export const SETTLEMENT_CODES = {
  /** 400 — `version` 을 빠뜨림 (2026-08-12 낙관적 락 신설) */
  versionRequired: 'SETTLEMENT_VERSION_REQUIRED',
  /** 409 — 그 사이 남이 먼저 저장했다. `overwrite: true` 로 덮어쓸 수 있다 */
  versionConflict: 'SETTLEMENT_VERSION_CONFLICT',
  /** 403 — 편집 권한 없음 */
  editDenied: 'SETL-001',
  /** 404 — 그 사이 **블록이 삭제됐다.** ⛔ `overwrite` 로도 못 뚫는다 */
  blockNotFound: 'SETL-002',
  /** 400 — 공통 필수 필드 누락 */
  contentRequired: 'SETL-003',
  /** 400 — 출금인데 계좌 3종 누락 */
  accountRequired: 'SETL-004',
  /** 400 — `type` 쿼리 누락 · 오값 */
  typeRequired: 'SETL-005',
  /** 409 — 출금(OUTCOME) → 입금(INCOME) 은 바꿀 수 없다 */
  typeDowngrade: 'SETL-006',
  /** 409 — 세금계산서 · 입출금이 연결돼 **수정 불가**. ⛔ `overwrite` 로도 못 뚫는다 */
  linked: 'SETL-007',
  /** 409 — 같은 프로젝트 · 같은 타입의 다른 회차와 총 예정 금액이 다르다 */
  totalMismatch: 'SETL-008',
  /** 400 — `roundNo` 가 1 미만 */
  roundInvalid: 'SETL-011',
} as const;

/**
 * 낙관적 락 충돌인지.
 *
 * 🚨 **status 로 넘겨짚으면 안 된다.** 이 도메인의 409 는 넷이다 —
 *    버전 충돌 · `SETL-006`(타입 다운그레이드) · `SETL-007`(연결됨) · `SETL-008`(총액 불일치).
 *    버전 충돌만 `overwrite` 로 통과하고, 나머지는 덮어쓰기로도 뚫리지 않는다.
 *
 * 백엔드 판정 순서는 **삭제 → 상태(연결) → 버전**이라, 삭제·연결이 먼저 걸리면
 * 버전이 어긋나 있어도 그쪽 코드가 온다.
 */
export function isSettlementVersionConflict(error: unknown) {
  return (
    error instanceof ApiError && error.code === SETTLEMENT_CODES.versionConflict
  );
}

/**
 * 덮어쓰기로도 되돌릴 수 없어 **폼을 닫고 목록을 다시 읽어야** 하는 경우인지.
 * 그대로 두면 사용자가 없는 블록 · 잠긴 블록에 계속 저장을 시도한다.
 */
export function isSettlementGone(error: unknown) {
  if (!(error instanceof ApiError)) return false;

  return (
    error.code === SETTLEMENT_CODES.blockNotFound ||
    error.code === SETTLEMENT_CODES.linked
  );
}

/** 버전을 못 받아 저장을 시작조차 할 수 없을 때 */
export const SETTLEMENT_NO_VERSION_MESSAGE =
  '정산 블록의 버전 정보를 받지 못해 저장할 수 없습니다. 새로고침 후 다시 시도해주세요.';
