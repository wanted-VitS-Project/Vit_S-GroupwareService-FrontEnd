/** 사원 · 계정 응답 코드 단일 소스. (.ai/API.md 19~21 · 30~34) */

export const EMPLOYEE_CODES = {
  /** 400 — 허용되지 않는 필터 값 */
  invalidParameter: 'EMP_INVALID_PARAMETER',
  /** 400 — 필수값 누락 · 형식 오류 */
  invalidRequest: 'EMP_INVALID_REQUEST',
  /** 404 — 사원 없음(삭제 사원 포함) */
  notFound: 'EMP_NOT_FOUND',
  /** 400 — 이미 퇴사 처리된 사원 */
  alreadyResigned: 'EMP_ALREADY_RESIGNED',
  /** 404 — 배정하려는 부서가 없음. 셀렉트를 다시 받는다 */
  departmentNotFound: 'EMP_DEPARTMENT_NOT_FOUND',
  /** 404 — 배정하려는 직급이 없음. 셀렉트를 다시 받는다 */
  jobPositionNotFound: 'EMP_JOB_POSITION_NOT_FOUND',
  /** 400 — role 에 ADMIN. 셀렉트에서 미리 제외한다 */
  adminRoleNotAllowed: 'EMP_ADMIN_ROLE_NOT_ALLOWED',
  /** 409 — 이미 등록된 사번 */
  userIdDuplicated: 'EMP_USER_ID_DUPLICATED',
} as const;

export const ACCOUNT_CODES = {
  /** 400 — userIds 가 비어 있음 */
  invalidRequest: 'ACC_INVALID_REQUEST',
  /** 400 — 허용되지 않는 권한 값 */
  invalidRole: 'ACC_INVALID_ROLE',
  /** 400 — ADMIN 은 부여할 수 없다. 셀렉트에서 미리 제외한다 */
  adminRoleNotAllowed: 'ACC_ADMIN_ROLE_NOT_ALLOWED',
  /** 400 — 자기 자신은 바꿀 수 없다. 버튼을 미리 비활성화한다 */
  selfModificationNotAllowed: 'ACC_SELF_MODIFICATION_NOT_ALLOWED',
  /** 400 — 허용되지 않는 계정 상태 값 */
  invalidStatus: 'ACC_INVALID_STATUS',
  /** 400 — 이미 같은 상태. 화면이 뒤처졌다는 뜻이라 재조회한다 */
  statusUnchanged: 'ACC_STATUS_UNCHANGED',
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
