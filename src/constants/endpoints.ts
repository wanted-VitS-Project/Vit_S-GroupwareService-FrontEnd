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
  },
} as const;
