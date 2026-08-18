/** 직급 응답 코드 단일 소스 */

export const JOB_POSITION_CODES = {
  /** 400 — 직급명이 비었거나 30자 초과, 수정할 필드 없음 */
  invalidRequest: 'POS_INVALID_REQUEST',
  /** 404 — 직급 없음 */
  notFound: 'POS_NOT_FOUND',
  /** 409 — 직급명 중복 */
  nameDuplicated: 'POS_NAME_DUPLICATED',
  /** 409 — 사용 인원이 있어 삭제 불가 (인원 수는 message 에 포함) */
  inUse: 'POS_IN_USE',
} as const;
