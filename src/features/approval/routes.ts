/** 결재 화면 경로 단일 소스. API 경로는 constants/endpoints.ts 에 있다 */

const APPROVALS = '/approvals';

export const APPROVAL_ROUTES = {
  list: APPROVALS,
  detail: (approvalId: number | string) => `${APPROVALS}/${approvalId}`,
} as const;
