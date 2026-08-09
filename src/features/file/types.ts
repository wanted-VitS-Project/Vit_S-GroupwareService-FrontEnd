/**
 * 파일(문서 · 버전) 도메인 타입. (.ai/API.md 파일 섹션)
 *
 * 파일은 **프로젝트 소속**이고 블록은 참조만 한다 — 블록을 지워도 파일은 산다.
 * 권한은 파일 단위가 아니라 **스텝 권한**을 그대로 따른다.
 */

/** 업로더 정보는 완료 시점 스냅샷이다 — 퇴사 · 부서이동해도 당시 값이 남는다 */
export interface FileUploader {
  uploaderName: string;
  uploaderDepartment: string;
  uploaderPosition: string;
}

/** GET /blocks/{blockId}/files 의 문서 하나 */
export interface BlockFile extends FileUploader {
  fileId: number;
  /** 표시명 — 원본 파일명과 별개로 바꿀 수 있다 */
  name: string;
  latestVersionId: number;
  latestVersionNo: number;
  versionCount: number;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  /** 미리보기 가능 여부 — PDF 만 true */
  previewable: boolean;
  /** YYYY-MM-DDTHH:mm:ss */
  updatedAt: string;
  /** 휴지통이면 값이 있다 */
  deletedAt: string | null;
}

export interface BlockFilesResponse {
  blockId: number;
  /** 업로드 · 수정 · 삭제 버튼 노출 기준 (스텝 EDITOR) */
  canEdit: boolean;
  content: BlockFile[];
}

/** POST /files/uploads */
export interface StartUploadRequest {
  blockId: number;
  /** 확장자를 포함한 원본 파일명 */
  originalFileName: string;
  /** 50MB 이하 */
  sizeBytes: number;
  mimeType?: string;
  /** 표시명. 생략하면 확장자를 뗀 원본명 */
  name?: string;
  /** 새 버전을 올릴 문서. 생략하면 새 문서(v1) */
  fileId?: number;
  comment?: string;
  /** 동명 문서 확인 후 재요청할 때만 true */
  allowDuplicateName?: boolean;
}

export interface StartUploadResponse {
  fileId: number;
  fileVersionId: number;
  versionNo: number;
  /** 저장소에 직접 PUT 할 presigned URL (10분) */
  uploadUrl: string;
  expiresAt: string;
}

/** POST /files/uploads/{fileVersionId}/complete */
export interface CompleteUploadResponse extends FileUploader {
  fileId: number;
  fileVersionId: number;
  versionNo: number;
  name: string;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  /** PDF 만 값이 있다 */
  pageCount: number | null;
  comment: string | null;
  completedAt: string;
}

/** PATCH /files/{fileId} */
export interface RenameFileResponse {
  fileId: number;
  name: string;
}

/** DELETE /files/{fileId} */
export interface TrashFileResponse {
  fileId: number;
  deletedAt: string;
}

/** GET /files/{fileId}/versions 의 버전 하나 */
export interface FileVersion extends FileUploader {
  fileVersionId: number;
  versionNo: number;
  latest: boolean;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  pageCount: number | null;
  previewable: boolean;
  comment: string | null;
  completedAt: string;
}

export interface FileVersionsResponse {
  fileId: number;
  name: string;
  versionCount: number;
  content: FileVersion[];
}

/**
 * GET /file-versions/{fileVersionId} — 버전 단건 조회 (결재용).
 *
 * 결재가 **고정한 버전**을 여는 용도라 버전 이력 응답과 두 가지가 다르다.
 * - `latest` 가 false 면 결재 이후 새 버전이 올라온 것이다
 * - 문서가 휴지통에 있어도 반환된다(`fileDeleted: true`) — 결재 이력이 남아야 한다
 */
export interface FileVersionDetail extends FileVersion {
  fileId: number;
  /** 표시명 */
  fileName: string;
  latestVersionNo: number;
  /** 원본 문서가 휴지통으로 갔는지 */
  fileDeleted: boolean;
}

/** GET /file-versions/{fileVersionId}/download */
export interface DownloadUrlResponse {
  fileVersionId: number;
  originalFileName: string;
  sizeBytes: number;
  /** presigned URL (5분) */
  downloadUrl: string;
  expiresAt: string;
}

/**
 * 문서를 AI 가 읽을 수 있게 쪼개 넣었는지 (`file_index`).
 * `COMPLETED` 여야 비타메이트 분석 대상으로 고를 수 있다.
 */
export type IndexStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * 인덱싱 상태를 다시 보는 간격.
 *
 * 분석 폴링(3초)보다 느슨하게 둔다 — 인덱싱은 분석보다 오래 걸리고,
 * 프로젝트 목록 전체를 받는 요청이라 자주 부를수록 손해다.
 */
export const INDEX_POLL_INTERVAL_MS = 5_000;

/**
 * 이 시간을 넘기면 폴링을 멈춘다.
 *
 * 인덱싱이 걸려 버린 문서가 하나라도 있으면 조건이 영원히 참이라,
 * 상한이 없으면 화면을 열어 둔 내내 5초마다 요청이 나간다.
 */
export const INDEX_POLL_MAX_MS = 5 * 60_000;

/** 아직 AI 가 읽는 중인지 — 끝난 상태(`COMPLETED`·`FAILED`)와 가른다 */
function isIndexPending(indexStatus: string) {
  return indexStatus === 'PENDING' || indexStatus === 'PROCESSING';
}

/** 읽는 중인 문서가 남아 있는지 — 목록을 더 볼지 정한다 */
export function hasIndexingDocument(versions: { indexStatus: string }[]) {
  return versions.some((version) => isIndexPending(version.indexStatus));
}

/**
 * GET /projects/{projectId}/file-versions 의 한 줄.
 *
 * 스텝·블록이 아니라 **프로젝트 전체**의 파일 버전이라, 비타메이트 분석에서
 * 다른 스텝에 올린 기준 문서까지 고를 수 있다. 휴지통 버전은 오지 않는다.
 */
export interface ProjectFileVersion {
  fileId: number;
  /** 표시명 */
  name: string;
  fileVersionId: number;
  versionNo: number;
  /** 이 문서의 최신 버전인지 */
  latest: boolean;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  /** PDF 만 값이 있다 */
  pageCount: number | null;
  previewable: boolean;
  completedAt: string;
  indexStatus: IndexStatus;
}

/** 업로드 상한 — 서버도 검증하지만 큰 파일을 헛되게 올리지 않으려고 먼저 막는다 */
export const FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024;

/** 문서 표시명 최대 길이 */
export const FILE_NAME_MAX_LENGTH = 255;
