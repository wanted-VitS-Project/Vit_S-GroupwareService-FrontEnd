import type { Role } from '@/features/auth/types';

/** 목록 필터의 상태 값 — `accountStatus` · `passwordStatus` 를 서버가 하나로 받는다 */
export type EmployeeStatusFilter = 'ACTIVE' | 'RESET_REQUIRED' | 'INACTIVE';

/** 인사관리 목록에 나오는 권한 — ADMIN 은 대상이 아니다 */
export type ManagedRole = Extract<Role, 'MASTER' | 'MEMBER'>;

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
  accountStatus: 'ACTIVE' | 'INACTIVE';
  passwordStatus: 'NORMAL' | 'RESET_REQUIRED';
  /** 퇴사일. null 이면 재직 중 */
  resignedAt: string | null;
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
