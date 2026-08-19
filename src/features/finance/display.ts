/** 재무 화면 표기 규칙. 여러 화면이 함께 쓰는 것만 둔다 */

import type {
  CashFlowLinkStatus,
  CashFlowType,
  SettlementProjectTag,
} from './types';

/** 금액 표기. 통장 금액이라 원 단위 그대로 쓴다 */
export function formatAmount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('ko-KR')
    : '-';
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
 * 프로젝트 줄에 세우는 태그. 서버 값이 아니라 미연결 · 지연 4개 지표로 화면이 만든다.
 * 급한 것부터 왼쪽에 오고, 손댈 것이 없으면 진행 상태 한 줄만 남는다.
 */
export function settlementProjectTags(row: {
  totalRoundCount: number;
  completedRoundCount: number;
  paymentUnlinkedCount: number;
  taxInvoiceUnlinkedCount: number;
  paymentOverdueDays: number;
  taxInvoiceOverdueDays: number;
  nextPlannedDate: string | null;
}): SettlementProjectTag[] {
  if (row.totalRoundCount === 0) {
    return [{ key: 'none', label: '정산 없음', className: 'badge-gray' }];
  }

  const tags: SettlementProjectTag[] = [];

  // 기한이 지난 것부터 본다. 미연결 건수보다 먼저 손대야 하는 값이다
  if (row.paymentOverdueDays > 0) {
    tags.push({
      key: 'paymentOverdue',
      label: `입출금 지연 ${row.paymentOverdueDays}일`,
      className: 'badge-red',
    });
  }
  if (row.taxInvoiceOverdueDays > 0) {
    tags.push({
      key: 'taxOverdue',
      label: `계산서 지연 ${row.taxInvoiceOverdueDays}일`,
      className: 'badge-yellow',
    });
  }

  // 지연은 아니지만 아직 붙이지 않은 건수. 지연 태그와 함께 보여야 규모를 안다
  if (row.paymentUnlinkedCount > 0) {
    tags.push({
      key: 'paymentUnlinked',
      label: `입출금 미연결 ${row.paymentUnlinkedCount}`,
      className: 'badge-gray',
    });
  }
  if (row.taxInvoiceUnlinkedCount > 0) {
    tags.push({
      key: 'taxUnlinked',
      label: `계산서 미연결 ${row.taxInvoiceUnlinkedCount}`,
      className: 'badge-gray',
    });
  }

  if (tags.length > 0) return tags;

  if (row.completedRoundCount >= row.totalRoundCount) {
    return [{ key: 'done', label: '정산 완료', className: 'badge-green' }];
  }
  if (row.nextPlannedDate === null) {
    return [{ key: 'noDate', label: '기한 미입력', className: 'badge-gray' }];
  }

  return [{ key: 'progress', label: '진행 중', className: 'badge-blue' }];
}
