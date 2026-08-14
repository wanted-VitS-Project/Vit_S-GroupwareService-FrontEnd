import { ApiError, isAbortError } from '@/lib/api';

import { putToStorage } from '../file/api';
import { completeCompanyUpload, startCompanyUpload } from './api';
import {
  COMPANY_DOCUMENT_MAX_SIZE_BYTES,
  type CompanyDocumentCategory,
  type CompleteCompanyUploadResponse,
} from './types';

/** 업로드가 중단된 지점 — 화면이 문구를 고를 때 쓴다 */
export type CompanyUploadStage = 'start' | 'transfer' | 'complete';

export class CompanyUploadError extends Error {
  constructor(
    readonly stage: CompanyUploadStage,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'CompanyUploadError';
  }
}

interface CompanyUploadOptions {
  file: File;
  /** 새 문서일 때 필수. 새 버전이면 서버가 기존 분류를 따르므로 보내지 않는다 */
  category?: CompanyDocumentCategory;
  /** 주면 그 문서의 **새 버전** */
  companyDocumentId?: number;
  name?: string;
  comment?: string;
  signal?: AbortSignal;
}

/**
 * 사내 문서 업로드 3단계. (프로젝트 파일 `features/file/upload.ts` 와 같은 흐름)
 *
 * 1. `POST /admin/company-documents/uploads` — presigned 발급 (버전이 `UPLOADING` 으로 생성)
 * 2. presigned URL 로 저장소에 직접 PUT
 * 3. `POST …/uploads/{versionId}/complete` — 서버가 저장소를 확인하고 확정
 *
 * 2 · 3 이 빠지면 버전이 `UPLOADING` 으로 남아 목록에 나오지 않는다.
 * 중간 실패를 되돌리는 API 는 없으므로 어디서 끊겼는지를 `stage` 로 알린다.
 */
export async function uploadCompanyDocument({
  file,
  category,
  companyDocumentId,
  name,
  comment,
  signal,
}: CompanyUploadOptions): Promise<CompleteCompanyUploadResponse> {
  // 서버도 막지만(`CDOC_SIZE_EXCEEDED`), 50MB 를 헛되게 올려보내지 않는다
  if (file.size > COMPANY_DOCUMENT_MAX_SIZE_BYTES) {
    throw new CompanyUploadError(
      'start',
      '50MB 이하 파일만 올릴 수 있습니다.',
    );
  }

  let started;
  try {
    started = await startCompanyUpload(
      {
        category,
        originalFileName: file.name,
        sizeBytes: file.size,
        name,
        comment,
        companyDocumentId,
      },
      signal,
    );
  } catch (caught) {
    // 확장자 차단(`CDOC_EXTENSION_BLOCKED`)도 여기로 온다 — 서버 문구를 그대로 쓴다
    throw toUploadError('start', caught, '업로드를 시작하지 못했습니다.');
  }

  try {
    await putToStorage(started.uploadUrl, file, signal);
  } catch (caught) {
    throw toUploadError('transfer', caught, '파일을 올리지 못했습니다.');
  }

  try {
    return await completeCompanyUpload(started.versionId, undefined, signal);
  } catch (caught) {
    throw toUploadError(
      'complete',
      caught,
      '업로드를 마무리하지 못했습니다. 다시 시도해주세요.',
    );
  }
}

function toUploadError(
  stage: CompanyUploadStage,
  caught: unknown,
  fallback: string,
) {
  // 취소는 그대로 흘려보내 호출부가 무시할 수 있게 한다
  if (isAbortError(caught)) throw caught;

  if (caught instanceof ApiError) {
    return new CompanyUploadError(stage, caught.message || fallback, caught.code);
  }
  return new CompanyUploadError(stage, fallback);
}
