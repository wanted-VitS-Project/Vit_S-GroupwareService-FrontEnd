/**
 * 사내 문서함 (`CompanyDocument` · ADMIN 전용).
 *
 * 프로젝트 파일과 **저장소가 다른 별도 도메인**이다 — 회사 재정 · 소개 · 실적 자료로
 * AI 공고 검토의 비교 기준이 된다. 그래서 프로젝트 · 스텝 · 블록에 매이지 않는다.
 * (`.ai/API.md` 143~150 · CompanyDocument)
 */

/** 분류. 값은 서버 enum 그대로다 */
export type CompanyDocumentCategory =
  | 'FINANCE'
  | 'COMPANY_INTRO'
  | 'PERFORMANCE'
  | 'CERTIFICATE'
  | 'ETC';

/** 화면 표기 — 목록 배지 · 필터 · 업로드 선택지가 모두 이 표를 쓴다 */
export const COMPANY_DOCUMENT_CATEGORY_LABELS: Record<
  CompanyDocumentCategory,
  string
> = {
  FINANCE: '재정',
  COMPANY_INTRO: '회사소개',
  PERFORMANCE: '실적',
  CERTIFICATE: '인증',
  ETC: '기타',
};

/** 필터 · 선택지에 세우는 순서 (`Object.keys` 순서에 기대지 않는다) */
export const COMPANY_DOCUMENT_CATEGORIES: CompanyDocumentCategory[] = [
  'FINANCE',
  'COMPANY_INTRO',
  'PERFORMANCE',
  'CERTIFICATE',
  'ETC',
];

/** 서버 상한 (`CDOC_SIZE_EXCEEDED`) — 헛되게 올려보내지 않으려고 화면에서도 본다 */
export const COMPANY_DOCUMENT_MAX_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * 화면 안내에 쓰는 허용 확장자.
 * ⚠️ **판정은 서버가 한다** (`CDOC_EXTENSION_BLOCKED`) — 여기서 막지 않고 안내만 한다.
 */
export const COMPANY_DOCUMENT_EXTENSIONS = ['pdf', 'hwp', 'docx', 'xlsx'];

/** GET /admin/company-documents 의 한 줄 */
export interface CompanyDocument {
  companyDocumentId: number;
  category: CompanyDocumentCategory;
  name: string;
  latestVersionId: number;
  latestVersionNo: number;
  versionCount: number;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  previewable: boolean;
  /** 업로더가 ADMIN 이면 오지 않는다 — 사원 레코드가 없다. 화면은 `—` 로 둔다 */
  uploaderName?: string | null;
  updatedAt: string;
}

export interface CompanyDocumentQuery {
  category?: CompanyDocumentCategory;
  keyword?: string;
  /** 0-base */
  page?: number;
  /** 기본 20 · 최대 100 */
  size?: number;
}

/** POST /admin/company-documents/uploads — 새 문서면 `category` 필수, 새 버전이면 생략 */
export interface StartCompanyUploadRequest {
  category?: CompanyDocumentCategory;
  originalFileName: string;
  sizeBytes: number;
  name?: string;
  comment?: string;
  /** 주면 그 문서의 **새 버전** */
  companyDocumentId?: number;
}

export interface StartCompanyUploadResponse {
  versionId: number;
  /** 클라이언트가 파일을 직접 PUT 할 곳 */
  uploadUrl: string;
  /** 10분 */
  expiresAt: string;
}

/** POST /admin/company-documents/uploads/{versionId}/complete */
export interface CompleteCompanyUploadResponse {
  name: string;
  category: CompanyDocumentCategory;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  /** PDF 만 온다 */
  pageCount?: number;
  uploaderName?: string | null;
  completedAt: string;
}

/** 버전 이력 한 줄 — **완료된 버전만** 온다 (append-only · 되돌리기 없음) */
export interface CompanyDocumentVersion {
  versionId: number;
  versionNo: number;
  latest: boolean;
  originalFileName: string;
  extension: string;
  sizeBytes: number;
  pageCount?: number;
  previewable: boolean;
  comment?: string | null;
  uploaderName?: string | null;
  completedAt: string;
}

/** GET /admin/company-documents/{documentId}/versions — 차수 내림차순 */
export interface CompanyDocumentVersionsResponse {
  companyDocumentId: number;
  name: string;
  category: CompanyDocumentCategory;
  versionCount: number;
  content: CompanyDocumentVersion[];
}

/** PATCH /admin/company-documents/{documentId} — 둘 중 최소 하나 */
export interface UpdateCompanyDocumentRequest {
  name?: string;
  category?: CompanyDocumentCategory;
}

/** DELETE /admin/company-documents/{documentId} — soft delete */
export interface DeleteCompanyDocumentResponse {
  companyDocumentId: number;
  deletedAt: string;
}

/** GET /admin/company-document-versions/{versionId}/download — presigned 5분 */
export interface CompanyDownloadUrlResponse {
  downloadUrl: string;
  expiresAt: string;
  originalFileName: string;
  sizeBytes: number;
}
