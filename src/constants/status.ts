/**
 * 백엔드 enum → 화면 라벨 매핑.
 * 라벨을 컴포넌트에 하드코딩하지 않는다. 키는 백엔드 값과 같아야 한다.
 */

import type { Role } from '@/features/auth/types';

/**
 * 전역 권한 라벨.
 *
 * `MASTER` 가 화면에서 부르는 이름이 **관리자**다 —
 * `ADMIN` 은 고객사가 쓰는 계정이 아니라 계정 · 인사를 다루는 시스템 계정이라
 * 이름을 겹치지 않게 `시스템 관리자` 로 둔다.
 */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: '시스템 관리자',
  MASTER: '관리자',
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

/** 프로젝트 상태 (.ai/API.md 프로젝트 목록 절) */
export type ProjectStatusCode =
  'NOT_STARTED' | 'IN_PROGRESS' | 'SETTLEMENT' | 'COMPLETED' | 'CLOSED';

export const PROJECT_STATUS_LABELS: Record<ProjectStatusCode, string> = {
  NOT_STARTED: '진행 전',
  IN_PROGRESS: '진행중',
  SETTLEMENT: '정산중',
  COMPLETED: '완료',
  CLOSED: '종결',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: '활성',
  RESET_REQUIRED: '재설정 필요',
  INACTIVE: '정지',
  RESIGNED: '퇴사',
};
