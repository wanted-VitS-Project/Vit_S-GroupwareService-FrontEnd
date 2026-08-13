import { ENDPOINTS } from '@/constants/endpoints';
import { api, ApiError, isAbortError, requestRaw } from '@/lib/api';

import type {
  BlockFilesResponse,
  CompleteUploadResponse,
  DownloadUrlResponse,
  FileVersionDetail,
  FileVersionsResponse,
  MyFile,
  MyFileQuery,
  PermanentDeleteResponse,
  ProjectFile,
  ProjectFileVersion,
  ProjectTrashFile,
  RenameFileRequest,
  RenameFileResponse,
  RestoreFileResponse,
  StartUploadRequest,
  StartUploadResponse,
  TrashFileResponse,
} from './types';
import { FILE_PERMANENT_DELETE_CONFIRM_TEXT } from './types';

/**
 * 블록에 붙은 문서 목록.
 * `deleted: true` 면 휴지통을 본다 — 휴지통 화면은 다음 작업 범위다.
 */
export function getBlockFiles(
  blockId: number | string,
  options: { deleted?: boolean; signal?: AbortSignal } = {},
) {
  const path = options.deleted
    ? `${ENDPOINTS.blocks.files(blockId)}?deleted=true`
    : ENDPOINTS.blocks.files(blockId);

  return api.get<BlockFilesResponse>(path, options.signal);
}

/**
 * 프로젝트의 모든 파일 버전 — 비타메이트 분석 문서 선택에 쓴다.
 * 응답 `data` 가 배열 그대로다 (없으면 빈 배열).
 */
export function getProjectFileVersions(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api.get<ProjectFileVersion[]>(
    ENDPOINTS.projects.fileVersions(projectId),
    signal,
  );
}

/** 업로드 시작 — `fileId` 를 주면 그 문서의 새 버전, 없으면 새 문서(v1) */
export function startUpload(body: StartUploadRequest, signal?: AbortSignal) {
  return api.post<StartUploadResponse>(ENDPOINTS.files.uploads, body, signal);
}

/**
 * 업로드 완료 통보. 서버가 저장소를 직접 확인(HEAD)하고 업로더 정보를 확정한다.
 * 이 호출이 빠지면 버전이 `업로드중` 으로 남아 목록에 나오지 않는다.
 */
export function completeUpload(
  fileVersionId: number | string,
  checksum?: string,
  signal?: AbortSignal,
) {
  return api.post<CompleteUploadResponse>(
    ENDPOINTS.files.uploadComplete(fileVersionId),
    checksum ? { checksum } : {},
    signal,
  );
}

/**
 * 표시명만 바꾼다. 각 버전의 원본 파일명은 그대로다.
 *
 * ⚠️ **낙관적 락** (2026-08-11) — `body.version` 은 문서 목록(36번)에서 받은 `version` 이다
 *    (`latestVersionNo` 가 아니다). 늦으면 409 `FILE_VERSION_CONFLICT` 가 오고,
 *    부르는 쪽이 재조회 · 덮어쓰기(`overwrite: true`)를 사용자에게 묻는다.
 */
export function renameFile(
  fileId: number | string,
  body: RenameFileRequest,
  signal?: AbortSignal,
) {
  return api.patch<RenameFileResponse>(
    ENDPOINTS.files.detail(fileId),
    body,
    signal,
  );
}

/**
 * 프로젝트 문서함 — 스텝 · 블록 위치가 붙은 평면 목록.
 * 응답이 `{ files: [...] }` 로 한 겹 감싸져 있어 여기서 벗겨 반환한다.
 */
export function getProjectFiles(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api
    .get<{ files: ProjectFile[] }>(ENDPOINTS.projects.files(projectId), signal)
    .then((data) => data.files);
}

/**
 * 내 프로젝트 파일 모아보기 — 내가 멤버인 모든 프로젝트를 가로지른 평면 목록.
 *
 * 프로젝트 문서함(105번)과 달리 **페이징이 없고** 필터를 쿼리로 넘긴다.
 * 응답이 `{ files: [...] }` 로 감싸져 있어 여기서 벗겨 반환한다.
 */
export function getMyFiles(query: MyFileQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();

  if (query.keyword) params.set('keyword', query.keyword);
  if (query.projectId !== undefined) {
    params.set('projectId', String(query.projectId));
  }
  if (query.extension) params.set('extension', query.extension);

  const search = params.toString();

  return api
    .get<{ files: MyFile[] }>(
      search ? `${ENDPOINTS.files.my}?${search}` : ENDPOINTS.files.my,
      signal,
    )
    .then((data) => data.files);
}

/** 프로젝트 휴지통 — 블록이 지워진 고아 파일도 여기서만 보인다 */
export function getProjectTrashFiles(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api
    .get<{ files: ProjectTrashFile[] }>(
      ENDPOINTS.projects.filesTrash(projectId),
      signal,
    )
    .then((data) => data.files);
}

/** 휴지통으로 이동 (soft delete). 저장소 객체는 남는다 */
export function trashFile(fileId: number | string, signal?: AbortSignal) {
  return api.delete<TrashFileResponse>(ENDPOINTS.files.detail(fileId), signal);
}

/**
 * 휴지통에서 복구. 원래 블록으로 돌아간다.
 *
 * 블록이 이미 지워졌어도 복구되며, 그때는 `blockId: null` · `blockDeleted: true` 로 온다 —
 * 화면은 "블록이 삭제되어 문서함으로 복구" 를 알려야 한다.
 */
export function restoreFile(fileId: number | string, signal?: AbortSignal) {
  return api.post<RestoreFileResponse>(
    ENDPOINTS.files.restore(fileId),
    {},
    signal,
  );
}

/**
 * 영구 삭제 — **되돌릴 수 없다.**
 *
 * 확인 문자는 서버가 검증하므로 화면이 받은 값을 그대로 보낸다
 * (여기서 상수로 덮어쓰면 사용자가 아무 값이나 넣어도 통과하는 것처럼 보인다).
 */
export function permanentlyDeleteFile(
  fileId: number | string,
  confirmText: string,
  signal?: AbortSignal,
) {
  return api.post<PermanentDeleteResponse>(
    ENDPOINTS.files.permanentDeletion(fileId),
    { confirmText },
    signal,
  );
}

/** 사용자가 입력한 확인 문자가 서버 기준과 맞는지 — 버튼 활성 판단에만 쓴다 */
export function isPermanentDeleteConfirmed(input: string) {
  return input.trim() === FILE_PERMANENT_DELETE_CONFIRM_TEXT;
}

/** 버전 이력 — append-only 조회 전용. 차수 내림차순 */
export function getFileVersions(fileId: number | string, signal?: AbortSignal) {
  return api.get<FileVersionsResponse>(
    ENDPOINTS.files.versions(fileId),
    signal,
  );
}

/** 다운로드 URL 발급. 바이너리가 아니라 presigned URL(5분)이 온다 */
export function getDownloadUrl(
  fileVersionId: number | string,
  signal?: AbortSignal,
) {
  return api.get<DownloadUrlResponse>(
    ENDPOINTS.fileVersions.download(fileVersionId),
    signal,
  );
}

/**
 * 버전 단건 조회 (결재용). 결재가 고정한 버전을 그대로 연다.
 *
 * ℹ️ 미리보기 · 다운로드와 달리 **문서가 휴지통에 있어도 반환된다** — 결재 이력이 남아야 한다.
 * `latest` 가 false 면 결재 이후 새 버전이 올라온 것이다.
 */
export function getFileVersion(
  fileVersionId: number | string,
  signal?: AbortSignal,
) {
  return api.get<FileVersionDetail>(
    ENDPOINTS.fileVersions.detail(fileVersionId),
    signal,
  );
}

/**
 * 미리보기 — 서버가 앞 5페이지만 잘라 **PDF 바이너리**로 준다.
 *
 * presigned 를 주면 전체 PDF 에 접근돼 "최대 5페이지" 제한이 무의미해지므로
 * 서버가 직접 반환한다. 그래서 blob 으로 받아 화면에서 object URL 로 띄운다.
 */
export async function getPreview(
  fileVersionId: number | string,
  signal?: AbortSignal,
) {
  const response = await requestRaw(
    ENDPOINTS.fileVersions.preview(fileVersionId),
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

/**
 * presigned URL 로 저장소에 직접 PUT 한다.
 *
 * ⚠️ `lib/api.ts` 래퍼를 쓰지 않는다 — 우리 백엔드가 아니라 S3 로 나가는 요청이라
 *    세션 쿠키(`credentials: 'include'`)를 실으면 안 되고 응답도 우리 봉투가 아니다.
 */
export async function putToStorage(
  uploadUrl: string,
  file: File,
  signal?: AbortSignal,
) {
  let response: Response;

  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      // presigned URL 은 서명에 포함된 헤더만 허용한다. Content-Type 만 맞춘다
      headers: file.type ? { 'Content-Type': file.type } : undefined,
      signal,
    });
  } catch (caught) {
    if (isAbortError(caught)) throw caught;
    throw new ApiError(
      0,
      '파일을 업로드하지 못했습니다. 네트워크를 확인해주세요.',
    );
  }

  if (!response.ok) {
    // presigned 만료(403) · 잘못된 서명 등. 사용자에게는 다시 시도만 안내한다
    throw new ApiError(
      response.status,
      '파일을 저장소에 올리지 못했습니다. 다시 시도해주세요.',
    );
  }
}

/** 다운로드 URL 을 받아 새 탭으로 넘긴다 */
export async function downloadVersion(fileVersionId: number) {
  const { downloadUrl } = await getDownloadUrl(fileVersionId);
  window.open(downloadUrl, '_blank', 'noopener,noreferrer');
}
