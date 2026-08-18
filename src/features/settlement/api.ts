import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  SaveSettlementRequest,
  SettlementDraft,
  SettlementItem,
  SettlementType,
} from './types';

/** 두 API 모두 type 이 필수라 경로를 한 곳에서 만든다 */
function itemsPath(settleId: number, type: SettlementType) {
  const search = new URLSearchParams({ type }).toString();

  return `${ENDPOINTS.blocks.settlementItems(settleId)}?${search}`;
}

/**
 * 수정 화면을 열 때 부른다 (.ai/API.md 85).
 * 저장된 값이 아니라 추천값과 마스킹 없는 계좌번호를 준다.
 */
export function getSettlementDraft(
  settleId: number,
  type: SettlementType,
  signal?: AbortSignal,
) {
  return api.get<SettlementDraft>(itemsPath(settleId, type), signal);
}

/**
 * 정산 항목 작성 · 수정 (.ai/API.md 86). 응답의 계좌번호는 마스킹된 값이다.
 * 낙관적 락을 쓰므로 version 을 실어 보내고 응답의 새 version 을 화면에 꽂는다.
 */
export function saveSettlement(
  settleId: number,
  type: SettlementType,
  body: SaveSettlementRequest,
) {
  return api.patch<SettlementItem>(itemsPath(settleId, type), body);
}
