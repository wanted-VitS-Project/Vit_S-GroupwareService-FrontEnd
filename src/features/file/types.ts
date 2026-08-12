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
  /**
   * 낙관적 락 버전 (2026-08-11 신설) — 문서명 수정(39번)에 이 값을 실어 보낸다.
   *
   * ⚠️ **`versionNo`(버전 차수) · `versionCount`(총 버전 수) 와 전혀 다른 값이다.**
   *    저 둘은 "문서의 몇 번째 판" 이고, 이건 동시 수정 검사용 행 버전이다.
   * ⚠️ 선택으로 둔다 — 없으면 화면이 이름 수정을 막고 재조회를 안내한다.
   */
  version?: number;
}

/**
 * 뷰어(`FileViewerModal`)가 여는 문서.
 *
 * 블록 문서 목록(36번)과 프로젝트 문서함(105번)이 **같은 뷰어**를 쓰는데 응답 모양이 조금 다르다 —
 * 문서함에는 업로더 **부서 · 직급이 없어** 선택 필드로 둔다.
 * 뷰어가 버전 이력(41번)을 받으면 그 값으로 덮이므로, 비어 있는 것은 여는 순간 잠깐뿐이다.
 */
export interface ViewerFile {
  fileId: number;
  name: string;
  latestVersionId: number;
  latestVersionNo: number;
  versionCount: number;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  previewable: boolean;
  updatedAt: string;
  uploaderName: string;
  uploaderDepartment?: string;
  uploaderPosition?: string;
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

/**
 * PATCH /files/{fileId}
 *
 * ⚠️ **낙관적 락** — `version` 필수(없으면 400 `FILE_INVALID_REQUEST`),
 *    늦으면 409 `FILE_VERSION_CONFLICT`. 409 면 재조회 / 덮어쓰기를 묻는다.
 */
export interface RenameFileRequest {
  name: string;
  /** 블록 문서 목록(36번)에서 받은 `version` */
  version: number;
  /** `true` 면 충돌을 무시하고 덮어쓴다 */
  overwrite?: boolean;
}

export interface RenameFileResponse {
  fileId: number;
  name: string;
  /** 저장 후의 새 값 — 목록을 다시 읽지 않을 땐 이 값을 화면에 꽂아야 한다 */
  version?: number;
}

/** DELETE /files/{fileId} */
export interface TrashFileResponse {
  fileId: number;
  deletedAt: string;
}

/**
 * 문서가 어느 스텝 · 블록에 붙어 있는지. (프로젝트 문서함 · 휴지통 공통)
 *
 * `blockDeleted` 가 true 면 블록이 지워진 **고아 파일**이다 — 파일은 프로젝트 소속이라
 * 블록이 사라져도 살아 있고, 문서함에서는 `블록 삭제됨` 묶음으로 모인다.
 */
export interface FileLocation {
  stepId: number;
  stepName: string;
  blockId: number | null;
  blockTitle: string | null;
  blockDeleted: boolean;
}

/**
 * GET /projects/{projectId}/files 의 한 줄.
 *
 * 블록 파일 목록(`BlockFile`)과 달리 **업로더 이름만** 온다 (부서 · 직급 없음).
 * presigned 가 실려 있지 않아 다운로드는 클릭 시 42번을 따로 부른다.
 */
export interface ProjectFile extends FileLocation {
  fileId: number;
  name: string;
  latestVersionId: number;
  latestVersionNo: number;
  versionCount: number;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  previewable: boolean;
  uploaderName: string;
  updatedAt: string;
}

/**
 * GET /projects/{projectId}/files/trash 의 한 줄.
 * 휴지통은 미리보기 · 다운로드가 없어 `latestVersionId` · `previewable` 이 오지 않는다.
 */
export interface ProjectTrashFile extends FileLocation {
  fileId: number;
  name: string;
  versionCount: number;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  /** 휴지통에 들어간 시각 — 목록은 이 값 내림차순이다 */
  deletedAt: string;
}

/** POST /files/{fileId}/restore */
export interface RestoreFileResponse {
  fileId: number;
  name: string;
  /** 블록이 지워졌으면 null — 이때 문서함으로만 살아난다 */
  blockId: number | null;
  blockDeleted: boolean;
}

/** POST /files/{fileId}/permanent-deletion */
export interface PermanentDeleteResponse {
  fileId: number;
  deletedVersionCount: number;
  /** S3 삭제는 커밋 후 best-effort 라 **삭제 요청 수**다 */
  storageDeletedCount: number;
}

/**
 * 영구 삭제 확인 문자.
 *
 * ⚠️ **서버가 정확히 이 문자열을 검증한다** — 화면 문구를 바꾸려면 백엔드와 함께 바꿔야 한다.
 */
export const FILE_PERMANENT_DELETE_CONFIRM_TEXT = '영구 삭제';

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
 * 이 시간을 넘기면 **간격을 늘린다** (멈추지는 않는다).
 *
 * 인덱싱이 걸린 문서가 있으면 조건이 영원히 참이라 5초 간격을 계속 두면 부담이다.
 * 그렇다고 아주 멈추면 10분 뒤 인덱싱이 끝나도 문서가 계속 회색으로 남아,
 * 사용자는 화면을 닫았다 열기 전까지 그 사실을 알 수 없다.
 */
export const INDEX_POLL_SLOW_AFTER_MS = 5 * 60_000;

/** 위 시간을 넘긴 뒤의 느슨한 간격 */
export const INDEX_POLL_SLOW_INTERVAL_MS = 30_000;

/** 조회가 실패했을 때 재시도 간격의 시작값 — 실패할수록 두 배로 늘린다 */
export const INDEX_RETRY_BASE_MS = 5_000;

/** 재시도 간격 상한 */
export const INDEX_RETRY_MAX_MS = 60_000;

/** 이만큼 연속 실패하면 재시도를 접는다 — 무한히 두드리지 않는다 */
export const INDEX_MAX_FAILURES = 5;

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
