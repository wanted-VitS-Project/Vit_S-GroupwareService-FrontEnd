import { ENDPOINTS } from '@/constants/endpoints';
import { api, requestRaw } from '@/lib/api';

import type { FilePage } from '../file/types';
import type {
  CompanyDocument,
  CompanyDocumentQuery,
  CompanyDocumentVersionsResponse,
  CompanyDownloadUrlResponse,
  CompleteCompanyUploadResponse,
  DeleteCompanyDocumentResponse,
  StartCompanyUploadRequest,
  StartCompanyUploadResponse,
  UpdateCompanyDocumentRequest,
} from './types';

/** 사내 문서 목록. 분류 · 검색 · 페이징 (ADMIN 아니면 403 `ACC_ADMIN_REQUIRED`) */
export function getCompanyDocuments(
  query: CompanyDocumentQuery = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();

  if (query.category) params.set('category', query.category);
  if (query.keyword) params.set('keyword', query.keyword);
  // 0 도 유효한 페이지라 값 유무로 판단한다
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.size !== undefined) params.set('size', String(query.size));

  const search = params.toString();

  return api.get<FilePage<CompanyDocument>>(
    search
      ? `${ENDPOINTS.companyDocuments.root}?${search}`
      : ENDPOINTS.companyDocuments.root,
    signal,
  );
}

/** ① 업로드 시작 — `companyDocumentId` 를 주면 그 문서의 새 버전, 없으면 새 문서 */
export function startCompanyUpload(
  body: StartCompanyUploadRequest,
  signal?: AbortSignal,
) {
  return api.post<StartCompanyUploadResponse>(
    ENDPOINTS.companyDocuments.uploads,
    body,
    signal,
  );
}

/**
 * ③ 업로드 완료 통보. 서버가 저장소를 직접 확인(HEAD)한다.
 * 이 호출이 빠지면 버전이 `UPLOADING` 으로 남아 목록에 나오지 않는다.
 */
export function completeCompanyUpload(
  versionId: number | string,
  checksum?: string,
  signal?: AbortSignal,
) {
  return api.post<CompleteCompanyUploadResponse>(
    ENDPOINTS.companyDocuments.uploadComplete(versionId),
    checksum ? { checksum } : {},
    signal,
  );
}

/** 버전 이력 — 완료 버전만 차수 내림차순으로 온다 */
export function getCompanyDocumentVersions(
  documentId: number | string,
  signal?: AbortSignal,
) {
  return api.get<CompanyDocumentVersionsResponse>(
    ENDPOINTS.companyDocuments.versions(documentId),
    signal,
  );
}

/** 표시명 · 분류 수정. 둘 중 최소 하나는 보내야 한다 (400 `CDOC_INVALID_REQUEST`) */
export function updateCompanyDocument(
  documentId: number | string,
  body: UpdateCompanyDocumentRequest,
  signal?: AbortSignal,
) {
  return api.patch<CompanyDocument>(
    ENDPOINTS.companyDocuments.detail(documentId),
    body,
    signal,
  );
}

/** 삭제 — soft delete 라 복구할 수 있다 */
export function deleteCompanyDocument(
  documentId: number | string,
  signal?: AbortSignal,
) {
  return api.delete<DeleteCompanyDocumentResponse>(
    ENDPOINTS.companyDocuments.detail(documentId),
    signal,
  );
}

/**
 * 삭제 복구.
 *
 * ⚠️ **목록에 삭제분을 부르는 조건이 없다** — 지운 직후 화면이 들고 있는 id 로만
 *    되돌릴 수 있다. 그래서 삭제 후 `되돌리기` 를 띄운다.
 */
export function restoreCompanyDocument(
  documentId: number | string,
  signal?: AbortSignal,
) {
  return api.post<CompanyDocument>(
    ENDPOINTS.companyDocuments.restore(documentId),
    {},
    signal,
  );
}

/** 다운로드 URL 발급. 바이너리가 아니라 presigned URL(5분)이 온다 */
export function getCompanyDownloadUrl(
  versionId: number | string,
  signal?: AbortSignal,
) {
  return api.get<CompanyDownloadUrlResponse>(
    ENDPOINTS.companyDocuments.download(versionId),
    signal,
  );
}

/** 다운로드 URL 을 받아 새 탭으로 넘긴다 */
export async function downloadCompanyVersion(versionId: number) {
  const { downloadUrl } = await getCompanyDownloadUrl(versionId);
  window.open(downloadUrl, '_blank', 'noopener,noreferrer');
}

/**
 * 미리보기 — 서버가 앞 5페이지만 잘라 **PDF 바이너리**로 준다.
 * (프로젝트 파일 미리보기와 같은 방식이지만 경로 · 에러코드가 다른 도메인이다)
 *
 * ⚠️ **지금 화면은 쓰지 않는다** — 사내 문서함은 훑는 화면이 아니라 최신본을 받아 쓰는
 *    화면이라 미리보기 영역을 두지 않았다. 명세(148번)에 있는 창구라 남겨 둔다.
 */
export async function getCompanyPreview(
  versionId: number | string,
  signal?: AbortSignal,
) {
  const response = await requestRaw(
    ENDPOINTS.companyDocuments.preview(versionId),
    signal,
  );

  return {
    blob: await response.blob(),
    /** 실제로 잘라 보낸 페이지 수 (≤5) */
    previewPageCount: readCount(response.headers.get('X-Preview-Page-Count')),
    /** 원본 전체 페이지 수 */
    totalPageCount: readCount(response.headers.get('X-Total-Page-Count')),
  };
}

function readCount(header: string | null) {
  const parsed = Number(header);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
