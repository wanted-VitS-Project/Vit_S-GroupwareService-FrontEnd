/**
 * API 경로 단일 소스. 경로 문자열을 다른 곳에 직접 쓰지 않는다.
 * 명세가 확정된 도메인만 추가한다. (.ai/API.md)
 */

const V1 = '/api/v1';

export const ENDPOINTS = {
  auth: {
    login: `${V1}/auth/login`,
    logout: `${V1}/auth/logout`,
    me: `${V1}/auth/me`,
    password: `${V1}/auth/password`,
    termsAgreements: `${V1}/auth/terms-agreements`,
  },
  projects: {
    detail: (projectId: number | string) => `${V1}/projects/${projectId}`,
    stages: (projectId: number | string) =>
      `${V1}/projects/${projectId}/stages`,
    steps: (projectId: number | string) => `${V1}/projects/${projectId}/steps`,
  },
  businessCategories: {
    /** 목록 조회 · 생성 */
    root: `${V1}/business-categories`,
    /** 수정 · 삭제 */
    detail: (categoryId: number | string) =>
      `${V1}/business-categories/${categoryId}`,
  },
  employees: {
    /** 목록 조회(ADMIN) · 등록 */
    root: `${V1}/employees`,
    /** 상세 조회 · 수정 */
    detail: (userId: string) => `${V1}/employees/${userId}`,
    /** 퇴사 처리 */
    resignation: (userId: string) => `${V1}/employees/${userId}/resignation`,
    /** 결재선 지정용 이름 검색 — ADMIN 전용이 아니다 */
    search: `${V1}/employees/search`,
  },
  accounts: {
    role: (userId: string) => `${V1}/accounts/${userId}/role`,
    status: (userId: string) => `${V1}/accounts/${userId}/status`,
    /** 비밀번호 재설정 — 개인 · 다중 공용 */
    passwordResets: `${V1}/accounts/password-resets`,
  },
  departments: {
    /** 목록 조회 · 생성 */
    root: `${V1}/departments`,
    /** 수정 · 삭제 */
    detail: (departmentId: number | string) =>
      `${V1}/departments/${departmentId}`,
  },
  jobPositions: {
    /** 목록 조회 · 생성 */
    root: `${V1}/job-positions`,
    /** 수정 · 삭제 */
    detail: (jobPositionId: number | string) =>
      `${V1}/job-positions/${jobPositionId}`,
  },
  steps: {
    blocks: (stepId: number | string) => `${V1}/steps/${stepId}/blocks`,
  },
  blocks: {
    /** 체크리스트 항목 생성 — 블록 ID 기준 */
    checklistItems: (chkBlockId: number | string) =>
      `${V1}/blocks/checklists/${chkBlockId}/items`,
    /** 체크리스트 항목 수정 · 삭제 — 항목 ID 기준 */
    checklistItem: (chkId: number | string) =>
      `${V1}/blocks/checklists/items/${chkId}`,
    /** 텍스트 본문 수정 — 텍스트 항목 ID 기준 */
    text: (txtId: number | string) => `${V1}/blocks/texts/${txtId}`,
  },
} as const;
