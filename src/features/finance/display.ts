/**
 * 재무 화면 표기 규칙.
 * 금액 · 배지 색처럼 여러 화면(입출금 · 세금계산서 · 정산 현황)이 함께 쓰는 것만 둔다.
 */

import type { CashFlowLinkStatus, CashFlowType } from './types';

/**
 * 금액 표기. 재무는 **원 단위 그대로** 쓴다 —
 * 입찰의 `formatAmountShort`(억 · 만 절삭)와 달리 통장 금액이라 한 자리도 줄이면 안 된다.
 */
export function formatAmount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('ko-KR')
    : '-';
}

/**
 * 거래고유번호에서 은행명을 되읽는다.
 *
 * ⚠️ **목록 응답에 `bankName` 이 없다** (2026-08-12 스웨거 실측). 단건 조회 API 도 없어서,
 *    수정 폼을 채울 수 있는 유일한 실마리가 `bankTxnId`(= 은행명 + 거래일시) 다.
 *
 * ⚠️ **첫 `-` 앞을 그대로 쓴다.** 처음에는 뒤쪽 숫자열(`-20260807143000`)을 떼는 식으로 짰는데,
 *    일시 형식이 예시(`신한-20260807143000`)와 조금만 달라도 통째로 빈 값이 됐다.
 *    은행명에는 `-` 가 들어가지 않으므로 앞을 취하는 편이 형식 변화에 강하다.
 *
 * ⚠️ `-` 가 없으면 은행명을 알 길이 없어 빈 값을 준다 — 그때는 사용자가 직접 채운다.
 *    목록 응답에 `bankName` 이 생기면 이 함수는 지운다.
 */
export function bankNameFromTxnId(bankTxnId: string) {
  const [name, ...rest] = bankTxnId.split('-');

  return rest.length > 0 ? name : '';
}

/** 입금은 파랑 · 출금은 빨강. 금액 글자색도 같은 축을 쓴다 */
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
 *
 * ⚠️ `LINK_BLOCK_DELETED` 는 **미연결과 다르다** — 연결했던 블록이 지워진 것이라
 *    사람이 손을 대야 한다. 회색(미연결)이 아니라 경고색으로 둔다.
 */
export const CASH_FLOW_LINK_BADGE: Record<CashFlowLinkStatus, string> = {
  UNLINKED: 'badge badge-gray',
  LINKED: 'badge badge-green',
  LINK_BLOCK_DELETED: 'badge badge-yellow',
};
