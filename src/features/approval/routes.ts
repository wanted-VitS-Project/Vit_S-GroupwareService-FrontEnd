/**
 * 결재 화면 경로 단일 소스. 경로 문자열을 컴포넌트에 직접 쓰지 않는다.
 * (API 경로는 `constants/endpoints.ts`, 이쪽은 화면 경로다)
 */

const APPROVALS = '/approvals';

export const APPROVAL_ROUTES = {
  list: APPROVALS,
  detail: (approvalId: number | string) => `${APPROVALS}/${approvalId}`,
} as const;
