import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  SaveSettlementRequest,
  SettlementDraft,
  SettlementItem,
  SettlementType,
} from './types';

/** 두 API 모두 `type` 이 필수라 경로를 한 곳에서 만든다 */
function itemsPath(settleId: number, type: SettlementType) {
  const search = new URLSearchParams({ type }).toString();

  return `${ENDPOINTS.blocks.settlementItems(settleId)}?${search}`;
}

/**
 * 수정 화면을 열 때 부른다 (.ai/API.md 84).
 *
 * ⚠️ **저장된 값이 아니라 추천값과 원본 계좌번호**를 준다.
 * 추천 회차 · 총액은 입력값이 아니라 컬럼 옆 안내로 쓰고,
 * 원본 계좌번호는 마스킹된 응답 대신 폼에 채운다.
 */
export function getSettlementDraft(
  settleId: number,
  type: SettlementType,
  signal?: AbortSignal,
) {
  return api.get<SettlementDraft>(itemsPath(settleId, type), signal);
}

/**
 * 정산 항목 작성 · 수정 (.ai/API.md 85).
 *
 * ⚠️ 응답의 `accountNumber` 는 **마스킹**돼 있다 — 폼에 되돌려 넣으면 안 된다.
 * ⚠️ `OUTCOME` 인데 계좌 3종이 빠지면 400 이다.
 */
export function saveSettlement(
  settleId: number,
  type: SettlementType,
  body: SaveSettlementRequest,
) {
  return api.patch<SettlementItem>(itemsPath(settleId, type), body);
}
