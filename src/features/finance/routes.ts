/** 재무 화면 경로 단일 소스. API 경로는 constants/endpoints.ts 에 있다 */

const FINANCE = '/finance';

export const FINANCE_ROUTES = {
  /** 재무 관리 허브 */
  hub: FINANCE,
  cashFlows: `${FINANCE}/payments`,
  /** 입출금 상세. 표에 두기 어려운 값을 여기서 본다 */
  cashFlowDetail: (cashFlowId: number | string) =>
    `${FINANCE}/payments/${cashFlowId}`,
  cashFlowImport: `${FINANCE}/payments/import`,
  taxInvoices: `${FINANCE}/invoices`,
  /** 세금계산서 상세. 목록에 담기 어려운 값을 여기서 본다 */
  taxInvoiceDetail: (taxId: number | string) => `${FINANCE}/invoices/${taxId}`,
  taxInvoiceImport: `${FINANCE}/invoices/import`,
  settlements: `${FINANCE}/settlements`,
} as const;
