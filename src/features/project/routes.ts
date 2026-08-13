/**
 * 프로젝트 화면 경로 단일 소스. 경로 문자열을 컴포넌트에 직접 쓰지 않는다.
 * (API 경로는 `constants/endpoints.ts`, 이쪽은 화면 경로다)
 */

const PROJECTS = '/projects';

/** 상세 모달을 열 이슈를 가리키는 쿼리 키 — 만드는 쪽과 읽는 쪽이 함께 쓴다 */
export const ISSUE_PARAM = 'issue';

export const PROJECT_ROUTES = {
  list: PROJECTS,
  create: `${PROJECTS}/new`,
  detail: (projectId: number | string) => `${PROJECTS}/${projectId}`,
  /** 스텝 상세(블록 보드) */
  step: (projectId: number | string, stepId: number | string) =>
    `${PROJECTS}/${projectId}/steps/${stepId}`,
  /**
   * 스텝의 이슈 탭 — 이슈 알림이 여기로 온다.
   *
   * `issueId` 를 주면 그 이슈의 상세 모달이 **열린 채로** 도착한다.
   * 이슈는 단독 화면이 없어(보드 안의 모달) 경로만으로는 특정 이슈를 가리킬 수 없다 —
   * 알림을 눌렀을 때 "어느 이슈인지" 를 잃지 않으려고 쿼리로 넘긴다.
   */
  stepIssues: (
    projectId: number | string,
    stepId: number | string,
    issueId?: number | string,
  ) =>
    // 값에 `&` · `#` 이 섞이면 쿼리 구조가 깨져 엉뚱한 이슈를 열거나 아무것도 못 연다
    `${PROJECTS}/${projectId}/steps/${stepId}/issue${
      issueId === undefined
        ? ''
        : `?${ISSUE_PARAM}=${encodeURIComponent(issueId)}`
    }`,
} as const;
