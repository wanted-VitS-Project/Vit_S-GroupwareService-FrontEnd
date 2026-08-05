import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  CreateBlockRequest,
  CreateChecklistItemResponse,
  DeleteChecklistItemResponse,
  StepBlock,
  UpdateChecklistItemRequest,
  UpdateChecklistItemResponse,
} from './types';

/**
 * 스텝의 블록을 한 번에 조회한다.
 * 응답이 `{ blocks: [...] }` 로 한 겹 더 감싸져 있어 여기서 벗겨 반환한다.
 */
export function getStepBlocks(stepId: number | string, signal?: AbortSignal) {
  return api
    .get<{ blocks: StepBlock[] }>(ENDPOINTS.steps.blocks(stepId), signal)
    .then((data) => data.blocks);
}

/**
 * 스텝에 블록을 만든다. 스텝 EDITOR 권한이 필요하다.
 * ⚠️ 응답 `data` 스키마는 확인 필요 — 지금은 쓰지 않는다.
 */
export function createBlock(
  stepId: number | string,
  body: CreateBlockRequest,
  signal?: AbortSignal,
) {
  return api.post<void>(ENDPOINTS.steps.blocks(stepId), body, signal);
}

/** 체크리스트 항목 생성 — `chkBlockId` 는 체크리스트 블록 ID */
export function createChecklistItem(
  chkBlockId: number | string,
  content: string,
  signal?: AbortSignal,
) {
  return api.post<CreateChecklistItemResponse>(
    ENDPOINTS.blocks.checklistItems(chkBlockId),
    { content },
    signal,
  );
}

/**
 * 체크리스트 항목 수정.
 * 내용만 · 완료 여부만 · 둘 다 보낼 수 있다 (둘 다 nullable).
 */
export function updateChecklistItem(
  chkId: number | string,
  body: UpdateChecklistItemRequest,
  signal?: AbortSignal,
) {
  return api.patch<UpdateChecklistItemResponse>(
    ENDPOINTS.blocks.checklistItem(chkId),
    body,
    signal,
  );
}

/** 체크리스트 항목 삭제 */
export function deleteChecklistItem(
  chkId: number | string,
  signal?: AbortSignal,
) {
  return api.delete<DeleteChecklistItemResponse>(
    ENDPOINTS.blocks.checklistItem(chkId),
    signal,
  );
}
