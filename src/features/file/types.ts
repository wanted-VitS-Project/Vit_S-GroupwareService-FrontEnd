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

/** GET /file-versions/{fileVersionId}/download */
export interface DownloadUrlResponse {
  fileVersionId: number;
  originalFileName: string;
  sizeBytes: number;
  /** presigned URL (5분) */
  downloadUrl: string;
  expiresAt: string;
}

/** 업로드 상한 — 서버도 검증하지만 큰 파일을 헛되게 올리지 않으려고 먼저 막는다 */
export const FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024;

/** 문서 표시명 최대 길이 */
export const FILE_NAME_MAX_LENGTH = 255;
