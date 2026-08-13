/**
 * 재무 화면 경로 단일 소스. 경로 문자열을 컴포넌트에 직접 쓰지 않는다.
 * (API 경로는 `constants/endpoints.ts`, 이쪽은 화면 경로다)
 */

const FINANCE = '/finance';

export const FINANCE_ROUTES = {
  /** 재무 관리 허브 — 사이드바 `재무 관리` 가 여기로 온다 */
  hub: FINANCE,
  cashFlows: `${FINANCE}/payments`,
  /** 입출금 상세 — 거래고유번호처럼 표에 두기 어려운 값을 여기서 본다 */
  cashFlowDetail: (cashFlowId: number | string) =>
    `${FINANCE}/payments/${cashFlowId}`,
  cashFlowImport: `${FINANCE}/payments/import`,
  taxInvoices: `${FINANCE}/invoices`,
  taxInvoiceImport: `${FINANCE}/invoices/import`,
  settlements: `${FINANCE}/settlements`,
} as const;
