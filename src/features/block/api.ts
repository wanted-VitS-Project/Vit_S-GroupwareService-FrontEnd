import { ENDPOINTS } from '@/constants/endpoints';
import { api, postForm, requestRaw } from '@/lib/api';

import type {
  BlockLayout,
  CreateBlockRequest,
  CreateChecklistItemResponse,
  CreateImageItemsResponse,
  DeleteChecklistItemResponse,
  ImageItemResponse,
  ImageItemsResponse,
  ProjectImage,
  RestoredImage,
  StepBlock,
  TrashImage,
  UpdateBlockLayoutResponse,
  UpdateBlockRequest,
  UpdateBlockResponse,
  UpdateChecklistItemRequest,
  UpdateChecklistItemResponse,
  UpdateImageItemsRequest,
  UpdateImageItemsResponse,
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

/**
 * 이미지 한 장 조회 — `currentOrderIndex` 의 앞/뒤 한 장을 준다.
 *
 * ⚠️ 목록 조회 API 가 없어 **캐러셀 이동마다 한 번씩** 부른다.
 *    첫 장은 `currentOrderIndex = 0` · `next` 로 받는다 (정렬 번호가 1부터라서).
 */
export function getImageItem(
  imgBlockId: number | string,
  currentOrderIndex: number,
  direction: 'prev' | 'next',
  signal?: AbortSignal,
) {
  return api.get<ImageItemResponse>(
    `${ENDPOINTS.blocks.imageItemAt(imgBlockId, currentOrderIndex)}?direction=${direction}`,
    signal,
  );
}

/**
 * 블록의 이미지 전체 목록 (`orderIndex` 오름차순).
 *
 * ⚠️ **편집 권한이 필요하다.** 열람만 가능한 사용자에게는 403 이 온다 —
 *    카드 캐러셀이 이 API 를 쓰지 않고 `getImageItem()` 으로 한 장씩 받는 이유다.
 *    순서 · 캡션 수정(PATCH)이 전체 치환이라 수정 모달이 이 목록을 받아 그대로 되보낸다.
 */
export function getImageItems(
  imgBlockId: number | string,
  signal?: AbortSignal,
) {
  return api.get<ImageItemsResponse>(
    ENDPOINTS.blocks.imageItems(imgBlockId),
    signal,
  );
}

/**
 * 프로젝트 전체 이미지 모아보기. (명세 107번)
 *
 * ⚠️ 블록 목록(71번)과 달리 **열람 권한이면 볼 수 있고**, 대신 `orderIndex` 가 없다 —
 *    블록 안에서 몇 번째 장인지는 알 수 없어 화면도 순서를 표기하지 않는다.
 */
export function getProjectImages(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api
    .get<{ images: ProjectImage[] }>(
      ENDPOINTS.projects.images(projectId),
      signal,
    )
    .then((data) => data.images);
}

/** 이미지 휴지통. 삭제 시각 내림차순 평면 목록이다 (명세 109번) */
export function getProjectTrashImages(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api
    .get<{ images: TrashImage[] }>(
      ENDPOINTS.projects.imagesTrash(projectId),
      signal,
    )
    .then((data) => data.images);
}

/**
 * 이미지 복구 — **다건**. (명세 110번)
 *
 * ⚠️ 권한을 이미지가 속한 **스텝별로** 확인하므로 보낸 것이 다 돌아오지 않을 수 있다.
 *    호출 측은 응답 `images[]` 에 담겨 온 것만 목록에서 지워야 한다.
 * ⚠️ 복구된 이미지는 원래 자리가 아니라 블록 **맨 뒤**에 붙는다 (`orderIndex` 재부여).
 */
export function restoreImages(imgIds: number[], signal?: AbortSignal) {
  return api
    .patch<{
      images: RestoredImage[];
    }>(ENDPOINTS.blocks.imageItemsRestore, { imgIds }, signal)
    .then((data) => data.images);
}

/**
 * 이미지 영구 삭제 — **다건 · 되돌릴 수 없다.** (명세 111번)
 *
 * ⚠️ 파일 영구 삭제(104번)와 달리 **확인 문자가 없다** — 화면 확인 모달이 유일한 방어선이다.
 * ⚠️ 응답이 `null` 이라 몇 건이 지워졌는지 알 수 없다. 호출 후 휴지통을 다시 읽는다.
 * ⚠️ 본문 있는 `DELETE` 라 프록시가 본문을 버리면 실패한다 (`.ai/API.md` 이미지 공통 절).
 */
export function permanentlyDeleteImages(
  imgIds: number[],
  signal?: AbortSignal,
) {
  return api.deleteWithBody<null>(
    ENDPOINTS.blocks.imageItemsHardDelete,
    { imgIds },
    signal,
  );
}

/**
 * 이미지 항목 생성 — `multipart/form-data`.
 *
 * `files` 는 **화면에 정렬된 순서 그대로** 보낸다 (첫 번째가 1번).
 * `captions` 는 같은 순서로 맞추고, 비어 있으면 빈 문자열을 넣는다.
 */
export function createImageItems(
  imgBlockId: number | string,
  items: { file: File; caption: string }[],
  signal?: AbortSignal,
) {
  const form = new FormData();
  items.forEach((item) => form.append('files', item.file));
  form.append(
    'request',
    new Blob(
      [JSON.stringify({ captions: items.map((item) => item.caption) })],
      {
        type: 'application/json',
      },
    ),
  );

  return postForm<CreateImageItemsResponse>(
    ENDPOINTS.blocks.imageItems(imgBlockId),
    form,
    signal,
  );
}

/**
 * 이미지 순서 · 캡션 수정.
 *
 * ⚠️ 부분 수정이 아니라 **전체 치환**이다 — 보낸 순서대로 `orderIndex` 가 다시 매겨지고,
 *    목록에서 빠진 이미지가 어떻게 되는지는 확인되지 않았다. 항상 전체를 보낸다.
 * ⚠️ 경로의 마지막 값은 항목 ID 가 아니라 **블록 ID** 다.
 */
export function updateImageItems(
  imgBlockId: number | string,
  images: UpdateImageItemsRequest['images'],
  signal?: AbortSignal,
) {
  return api.patch<UpdateImageItemsResponse>(
    ENDPOINTS.blocks.imageItemsEdit(imgBlockId),
    { images },
    signal,
  );
}

/** 이미지 항목 삭제 — 이쪽은 **항목 ID(`imgId`)** 다 */
export function deleteImageItem(imgId: number | string, signal?: AbortSignal) {
  return api.delete<null>(ENDPOINTS.blocks.imageItem(imgId), signal);
}

/**
 * 응답 헤더에서 저장할 파일명을 꺼낸다.
 * 한글 파일명은 `filename*=UTF-8''...` 로 오므로 그쪽을 먼저 본다.
 */
function fileNameFrom(disposition: string | null) {
  if (!disposition) return null;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      // 잘못 인코딩된 값이면 아래 일반 filename 으로 넘어간다
    }
  }

  return /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? null;
}

/**
 * 이미지 다운로드 — `imgId` 를 주면 그 한 장, 없으면 블록 전체(zip).
 *
 * presigned URL 이 아니라 **서버가 바이너리를 직접** 준다. 세션 쿠키가 필요해
 * `window.open` 으로 넘기지 않고 blob 으로 받아 앵커로 저장한다.
 */
export async function downloadBlockImages(
  imgBlockId: number | string,
  imgId?: number,
  fallbackName = '이미지',
) {
  const base = ENDPOINTS.blocks.imageDownload(imgBlockId);
  const response = await requestRaw(
    imgId === undefined ? base : `${base}?imgId=${imgId}`,
  );

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download =
    fileNameFrom(response.headers.get('Content-Disposition')) ?? fallbackName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
