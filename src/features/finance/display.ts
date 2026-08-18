/** 재무 화면 표기 규칙. 여러 화면이 함께 쓰는 것만 둔다 */

import type {
  CashFlowLinkStatus,
  CashFlowType,
  SettlementProjectState,
} from './types';

/** 금액 표기. 통장 금액이라 원 단위 그대로 쓴다 */
export function formatAmount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('ko-KR')
    : '-';
}

/**
 * 거래고유번호에서 은행명을 되읽는다. 목록 응답에 은행명이 없어서다.
 * 형식 변화에 강하도록 첫 하이픈 앞을 그대로 쓰고, 없으면 빈 값을 준다.
 */
export function bankNameFromTxnId(bankTxnId: string) {
  const [name, ...rest] = bankTxnId.split('-');

  return rest.length > 0 ? name : '';
}

/** 입금은 파랑, 출금은 빨강. 금액 글자색도 같은 기준을 쓴다 */
export const CASH_FLOW_TYPE_BADGE: Record<CashFlowType, string> = {
  INCOME: 'badge badge-blue',
  OUTCOME: 'badge badge-red',
};

export const CASH_FLOW_AMOUNT_COLOR: Record<CashFlowType, string> = {
  INCOME: 'text-text-primary',
  OUTCOME: 'text-red-text',
};

/**
 * 연결 상태 배지 색.
 * 블록이 삭제된 상태는 미연결과 달라 사람이 손을 대야 하므로 경고색을 쓴다.
 */
export const CASH_FLOW_LINK_BADGE: Record<CashFlowLinkStatus, string> = {
  UNLINKED: 'badge badge-gray',
  LINKED: 'badge badge-green',
  LINK_BLOCK_DELETED: 'badge badge-yellow',
};

/* ─────────────── 정산 현황 ─────────────── */

/**
 * 프로젝트 줄의 상태를 정한다. 서버 값이 아니라 화면이 계산한다.
 * 급한 것부터 보므로 검사 순서 자체가 우선순위다.
 */
export function settlementProjectState(row: {
  totalRoundCount: number;
  completedRoundCount: number;
  paymentOverdueDays: number;
  taxInvoiceOverdueDays: number;
  nextPlannedDate: string | null;
}): SettlementProjectState {
  if (row.totalRoundCount === 0) return 'NONE';
  if (row.paymentOverdueDays > 0) return 'PAYMENT_OVERDUE';
  if (row.taxInvoiceOverdueDays > 0) return 'TAX_OVERDUE';
  if (row.completedRoundCount >= row.totalRoundCount) return 'DONE';
  if (row.nextPlannedDate === null) return 'NO_PLANNED_DATE';
  return 'IN_PROGRESS';
}

export const SETTLEMENT_PROJECT_STATE_BADGE: Record<
  SettlementProjectState,
  string
> = {
  PAYMENT_OVERDUE: 'bg-red-bg-soft text-text-danger',
  TAX_OVERDUE: 'bg-yellow-bg-soft text-yellow-text',
  NO_PLANNED_DATE: 'bg-bg-hover text-text-secondary',
  DONE: 'bg-green-bg text-green-text',
  IN_PROGRESS: 'bg-blue-bg-soft text-text-primary-blue',
  NONE: 'bg-bg-hover text-text-secondary',
};

/** 상태 라벨. 지연 일수는 상태에 따라 문구에 들어간다 */
export function settlementProjectStateLabel(
  state: SettlementProjectState,
  row: { paymentOverdueDays: number; taxInvoiceOverdueDays: number },
) {
  switch (state) {
    case 'PAYMENT_OVERDUE':
      return `입금 대기 ${row.paymentOverdueDays}일`;
    case 'TAX_OVERDUE':
      return `계산서 미발행 ${row.taxInvoiceOverdueDays}일`;
    case 'NO_PLANNED_DATE':
      return '예정일 미입력';
    case 'DONE':
      return '정산 완료';
    case 'IN_PROGRESS':
      return '진행 중';
    /* default 를 두지 않아야 상태가 늘 때 타입 검사가 잡는다 */
    case 'NONE':
      return '정산 없음';
  }
}
