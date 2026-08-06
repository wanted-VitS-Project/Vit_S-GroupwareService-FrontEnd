/**
 * 백엔드 enum → 화면 라벨 매핑.
 * 라벨을 컴포넌트에 하드코딩하지 않는다. 키는 백엔드 값과 같아야 한다.
 */

import type { Role } from '@/features/auth/types';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: '관리자',
  MASTER: '중간관리자',
  MEMBER: '사원',
};

/**
 * 사원 계정 상태 배지.
 * 백엔드는 `accountStatus` · `passwordStatus` 두 값을 따로 주고, 화면이 하나로 합친다.
 */
export type EmployeeStatus =
  'ACTIVE' | 'RESET_REQUIRED' | 'INACTIVE' | 'RESIGNED';

/** 결재 · 상신 회차 상태 (.ai/API.md 결재 절) */
export type ApprovalStatusCode =
  'DRAFT' | 'IN_PROGRESS' | 'REJECTED' | 'COMPLETED';

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatusCode, string> = {
  DRAFT: '작성 중',
  IN_PROGRESS: '진행중',
  REJECTED: '반려',
  COMPLETED: '승인',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: '활성',
  RESET_REQUIRED: '재설정 필요',
  INACTIVE: '정지',
  RESIGNED: '퇴사',
};
