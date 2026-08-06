import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  BlockLayout,
  CreateBlockRequest,
  CreateChecklistItemResponse,
  DeleteChecklistItemResponse,
  StepBlock,
  UpdateBlockLayoutResponse,
  UpdateBlockRequest,
  UpdateBlockResponse,
  UpdateChecklistItemRequest,
  UpdateChecklistItemResponse,
  UpdateTextBlockResponse,
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

export function updateBlock(
  blockId: number | string,
  body: UpdateBlockRequest,
  signal?: AbortSignal,
) {
  return api.patch<UpdateBlockResponse>(
    ENDPOINTS.blocks.detail(blockId),
    body,
    signal,
  );
}

export function deleteBlock(blockId: number | string, signal?: AbortSignal) {
  return api.delete<null>(ENDPOINTS.blocks.detail(blockId), signal);
}

/**
 * 블록 배치 변경 — 스텝 EDITOR 권한이 필요하다.
 *
 * ⚠️ 옮긴 블록만이 아니라 **스텝의 배치 전체**를 보낸다.
 * 중간 상태의 중복 좌표를 서버가 허용하므로(BLK-004) 드래그 한 번에 한 번만 부른다.
 */
export function updateBlockLayout(
  stepId: number | string,
  layouts: BlockLayout[],
  signal?: AbortSignal,
) {
  return api
    .patch<UpdateBlockLayoutResponse>(
      ENDPOINTS.steps.blocksLayout(stepId),
      { layouts },
      signal,
    )
    .then((data) => data.blocks);
}

/**
 * 텍스트 본문 수정 — `txtId` 는 텍스트 항목 ID (`blockId` 아님).
 * 부분 수정이 아니라 **전체 내용**을 보낸다.
 */
export function updateTextBlock(
  txtId: number | string,
  content: string,
  signal?: AbortSignal,
) {
  return api.patch<UpdateTextBlockResponse>(
    ENDPOINTS.blocks.text(txtId),
    { content },
    signal,
  );
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
