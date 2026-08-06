/** 사원 · 계정 응답 코드 단일 소스. (.ai/API.md 19~21 · 30~34) */

export const EMPLOYEE_CODES = {
  /** 400 — 허용되지 않는 필터 값 */
  invalidParameter: 'EMP_INVALID_PARAMETER',
  /** 400 — 필수값 누락 · 형식 오류 */
  invalidRequest: 'EMP_INVALID_REQUEST',
  /** 404 — 사원 없음(삭제 사원 포함) */
  notFound: 'EMP_NOT_FOUND',
  /** 409 — 이미 등록된 사번 */
  userIdDuplicated: 'EMP_USER_ID_DUPLICATED',
} as const;

export const ACCOUNT_CODES = {
  /** 400 — userIds 가 비어 있음 */
  invalidRequest: 'ACC_INVALID_REQUEST',
  /** 403 — 대상에 ADMIN 계정이 섞임. 요청 전체가 거부된다 */
  adminAccountNotAllowed: 'ACC_ADMIN_ACCOUNT_NOT_ALLOWED',
  /** 403 — 시스템 계정은 대상이 될 수 없다 */
  systemAccountNotAllowed: 'ACC_SYSTEM_ACCOUNT_NOT_ALLOWED',
  /** 404 — 없는 사번이 섞임. 요청 전체가 거부된다 */
  notFound: 'ACC_NOT_FOUND',
} as const;

/** 비밀번호 재설정 실패 사유 문구 — 뒤처리가 달라 문장을 나눈다 */
export const PASSWORD_RESET_FAILURE_LABELS = {
  EMAIL_NOT_REGISTERED: '이메일 미등록 — 이메일을 먼저 등록해야 합니다',
  MAIL_SEND_FAILED: '메일 발송 실패 — 재발송이 필요합니다',
} as const;
