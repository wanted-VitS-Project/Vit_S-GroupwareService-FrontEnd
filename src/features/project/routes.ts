/**
 * 프로젝트 화면 경로 단일 소스. 경로 문자열을 컴포넌트에 직접 쓰지 않는다.
 * (API 경로는 `constants/endpoints.ts`, 이쪽은 화면 경로다)
 */

const PROJECTS = '/projects';

export const PROJECT_ROUTES = {
  list: PROJECTS,
  create: `${PROJECTS}/new`,
  detail: (projectId: number | string) => `${PROJECTS}/${projectId}`,
  /** 스텝 상세(블록 보드) */
  step: (projectId: number | string, stepId: number | string) =>
    `${PROJECTS}/${projectId}/steps/${stepId}`,
  /** 스텝의 이슈 탭 — 이슈 알림이 여기로 온다 */
  stepIssues: (projectId: number | string, stepId: number | string) =>
    `${PROJECTS}/${projectId}/steps/${stepId}/issue`,
} as const;
