/**
 * 결재 화면 경로 단일 소스. 경로 문자열을 컴포넌트에 직접 쓰지 않는다.
 * (API 경로는 `constants/endpoints.ts`, 이쪽은 화면 경로다)
 */

const APPROVALS = '/approvals';

export const APPROVAL_ROUTES = {
  list: APPROVALS,
  detail: (approvalId: number | string) => `${APPROVALS}/${approvalId}`,
  /** 결재가 만들어진 원본 스텝 — 목록·상세의 `프로젝트 > Step` 경로에서 쓴다 */
  origin: (projectId: number | string, stepId: number | string) =>
    `/projects/${projectId}/steps/${stepId}`,
} as const;
