import { ApiError } from '@/lib/api';

import { completeUpload, putToStorage, startUpload } from './api';
import { isDuplicateNameCode } from './errorCodes';
import { FILE_MAX_SIZE_BYTES, type CompleteUploadResponse } from './types';

/** 업로드가 중단된 지점 — 화면이 문구를 고를 때 쓴다 */
export type UploadStage = 'start' | 'transfer' | 'complete';

export class UploadError extends Error {
  constructor(
    readonly stage: UploadStage,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/** 동명 문서가 있어 사용자 확인이 필요한 경우 */
export class DuplicateNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateNameError';
  }
}

interface UploadOptions {
  blockId: number;
  file: File;
  /** 새 버전을 올릴 문서. 생략하면 새 문서 */
  fileId?: number;
  comment?: string;
  /** 동명 확인을 받은 뒤 재요청할 때만 true */
  allowDuplicateName?: boolean;
  signal?: AbortSignal;
}

/**
 * 문서 업로드 3단계.
 *
 * 1. `POST /files/uploads` — presigned URL 발급 (버전이 `업로드중` 으로 생성)
 * 2. presigned URL 로 저장소에 직접 PUT
 * 3. `POST /files/uploads/{fileVersionId}/complete` — 서버가 저장소를 확인하고 확정
 *
 * 2 · 3 이 빠지면 버전이 `업로드중` 으로 남아 목록에 나오지 않는다.
 * 중간 실패를 되돌리는 API 는 없으므로 어디서 끊겼는지를 `stage` 로 알린다.
 */
export async function uploadFile({
  blockId,
  file,
  fileId,
  comment,
  allowDuplicateName,
  signal,
}: UploadOptions): Promise<CompleteUploadResponse> {
  // 서버도 막지만, 50MB 를 헛되게 올려보내지 않으려고 먼저 걸러낸다
  if (file.size > FILE_MAX_SIZE_BYTES) {
    throw new UploadError('start', '50MB 이하 파일만 올릴 수 있습니다.');
  }

  let started;
  try {
    started = await startUpload(
      {
        blockId,
        originalFileName: file.name,
        sizeBytes: file.size,
        mimeType: file.type || undefined,
        fileId,
        comment,
        allowDuplicateName,
      },
      signal,
    );
  } catch (caught) {
    if (caught instanceof ApiError && isDuplicateNameCode(caught.code)) {
      // 화면이 확인을 받고 allowDuplicateName 으로 다시 부른다
      throw new DuplicateNameError(caught.message);
    }
    throw toUploadError('start', caught, '업로드를 시작하지 못했습니다.');
  }

  try {
    await putToStorage(started.uploadUrl, file, signal);
  } catch (caught) {
    throw toUploadError('transfer', caught, '파일을 올리지 못했습니다.');
  }

  try {
    return await completeUpload(started.fileVersionId, undefined, signal);
  } catch (caught) {
    throw toUploadError(
      'complete',
      caught,
      '업로드를 마무리하지 못했습니다. 다시 시도해주세요.',
    );
  }
}

function toUploadError(stage: UploadStage, caught: unknown, fallback: string) {
  if (caught instanceof ApiError) {
    return new UploadError(stage, caught.message || fallback, caught.code);
  }
  // 취소는 그대로 흘려보내 호출부가 무시할 수 있게 한다
  if (caught instanceof DOMException && caught.name === 'AbortError') {
    throw caught;
  }
  return new UploadError(stage, fallback);
}
