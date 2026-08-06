import type { Role } from '@/features/auth/types';

/** 목록 필터의 상태 값 — `accountStatus` · `passwordStatus` 를 서버가 하나로 받는다 */
export type EmployeeStatusFilter = 'ACTIVE' | 'RESET_REQUIRED' | 'INACTIVE';

/** 인사관리 목록에 나오는 권한 — ADMIN 은 대상이 아니다 */
export type ManagedRole = Extract<Role, 'MASTER' | 'MEMBER'>;

/** 계정 활성 여부. 배지의 `passwordStatus` 와 달리 관리자가 직접 토글한다 */
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

/** 사원 목록 한 줄 (.ai/API.md 30) */
export interface EmployeeSummary {
  userId: string;
  name: string;
  email: string | null;
  /** false 면 로그인도 비밀번호 재설정도 못 한다 */
  emailRegistered: boolean;
  departmentName: string | null;
  /** 상위 조직까지 포함한 경로 — 예: '기술본부 / 개발팀' */
  departmentPath: string | null;
  jobPositionName: string | null;
  role: ManagedRole;
  accountStatus: AccountStatus;
  passwordStatus: 'NORMAL' | 'RESET_REQUIRED';
  /** 퇴사일. null 이면 재직 중 */
  resignedAt: string | null;
}

/** 소속 그룹 — 상세에서 칩으로만 보여준다 (편집 API 가 없다) */
export interface EmployeeGroup {
  groupId: number;
  name: string;
}

/** 사원 상세 (.ai/API.md 31) — 목록 필드 + 수정 폼 초기값 · 그룹 */
export interface EmployeeDetail extends EmployeeSummary {
  /** 수정 폼 초기값. 미지정이면 null */
  departmentId: number | null;
  jobPositionId: number | null;
  phone: string | null;
  /** yyyy-MM-dd */
  hiredAt: string | null;
  /** yyyy-MM-dd HH:mm:ss */
  lastLoginAt: string | null;
  /** 없으면 `[]` */
  groups: EmployeeGroup[];
}

export interface EmployeeListQuery {
  /** 이름 또는 사번 부분 검색 — 서버가 하나로 받는다 */
  keyword?: string;
  departmentId?: number;
  role?: ManagedRole;
  status?: EmployeeStatusFilter;
  /** 미지정이면 재직자만 나온다 */
  resigned?: boolean;
  page?: number;
  size?: number;
}

export interface EmployeePage {
  content: EmployeeSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * 사원 정보 수정 (.ai/API.md 33) — **전달한 필드만** 바뀐다.
 *
 * ⚠️ `undefined`(키 생략) 와 `null` 이 다른 뜻이다.
 * 키를 빼면 "변경 안 함", `null` 을 보내면 "미지정으로 지움".
 * 사번 · 전역 권한은 이 API 로 바꿀 수 없다.
 */
export interface UpdateEmployeeRequest {
  /** 빈값 불가 */
  name?: string;
  phone?: string;
  email?: string;
  departmentId?: number | null;
  jobPositionId?: number | null;
  /** yyyy-MM-dd */
  hiredAt?: string;
}

/** 권한 변경 응답 (.ai/API.md 19) */
export interface UpdateRoleResponse {
  userId: string;
  role: ManagedRole;
}

/** 계정 상태 변경 응답 (.ai/API.md 20) */
export interface UpdateAccountStatusResponse {
  userId: string;
  status: AccountStatus;
}

/** 퇴사 처리 응답 — 퇴사일 기록과 계정 비활성이 한 번에 일어난다 (.ai/API.md 34) */
export interface ResignationResponse {
  userId: string;
  resignedAt: string;
  accountStatus: AccountStatus;
}

/** 비밀번호 재설정 실패 사유 — 뒤처리가 달라 구분해야 한다 */
export type PasswordResetFailureReason =
  'EMAIL_NOT_REGISTERED' | 'MAIL_SEND_FAILED';

export interface PasswordResetFailure {
  userId: string;
  name: string;
  reason: PasswordResetFailureReason;
  /** true 면 비밀번호는 이미 바뀌었고 메일만 실패했다 — 재발송하지 않으면 로그인할 수 없다 */
  passwordChanged: boolean;
}

/** 실패가 섞여도 200 으로 온다 (.ai/API.md 21) */
export interface PasswordResetResult {
  requestedCount: number;
  successCount: number;
  failedCount: number;
  failures: PasswordResetFailure[];
}
