/**
 * API 경로 단일 소스. 경로 문자열을 다른 곳에 직접 쓰지 않는다.
 * 명세가 확정된 도메인만 추가한다. (.ai/API.md)
 */

const V1 = '/api/v1';

export const ENDPOINTS = {
  auth: {
    login: `${V1}/auth/login`,
    logout: `${V1}/auth/logout`,
    me: `${V1}/auth/me`,
    password: `${V1}/auth/password`,
    termsAgreements: `${V1}/auth/terms-agreements`,
  },
  projects: {
    detail: (projectId: number | string) => `${V1}/projects/${projectId}`,
    stages: (projectId: number | string) =>
      `${V1}/projects/${projectId}/stages`,
    steps: (projectId: number | string) => `${V1}/projects/${projectId}/steps`,
  },
  businessCategories: {
    /** 목록 조회 · 생성 */
    root: `${V1}/business-categories`,
    /** 수정 · 삭제 */
    detail: (categoryId: number | string) =>
      `${V1}/business-categories/${categoryId}`,
  },
  employees: {
    /** 목록 조회(ADMIN) · 등록 */
    root: `${V1}/employees`,
    /** 상세 조회 · 수정 */
    detail: (userId: string) => `${V1}/employees/${userId}`,
    /** 퇴사 처리 */
    resignation: (userId: string) => `${V1}/employees/${userId}/resignation`,
    /** 결재선 지정용 이름 검색 — ADMIN 전용이 아니다 */
    search: `${V1}/employees/search`,
  },
  accounts: {
    role: (userId: string) => `${V1}/accounts/${userId}/role`,
    status: (userId: string) => `${V1}/accounts/${userId}/status`,
    /** 비밀번호 재설정 — 개인 · 다중 공용 */
    passwordResets: `${V1}/accounts/password-resets`,
  },
  departments: {
    /** 목록 조회 · 생성 */
    root: `${V1}/departments`,
    /** 수정 · 삭제 */
    detail: (departmentId: number | string) =>
      `${V1}/departments/${departmentId}`,
  },
  jobPositions: {
    /** 목록 조회 · 생성 */
    root: `${V1}/job-positions`,
    /** 수정 · 삭제 */
    detail: (jobPositionId: number | string) =>
      `${V1}/job-positions/${jobPositionId}`,
  },
  steps: {
    blocks: (stepId: number | string) => `${V1}/steps/${stepId}/blocks`,
    /** 블록 배치 변경 — 스텝의 배치 전체를 한 번에 보낸다 */
    blocksLayout: (stepId: number | string) =>
      `${V1}/steps/${stepId}/blocks/layout`,
  },
  approvals: {
    /** 재상신 회차 생성 */
    revisions: (approvalId: number | string) =>
      `${V1}/approvals/${approvalId}/revisions`,
    /** 회차 상세 조회 · 제목/내용 수정 */
    revision: (approvalId: number | string, revisionId: number | string) =>
      `${V1}/approvals/${approvalId}/revisions/${revisionId}`,
    /** 상신 (최초 · 재상신 겸용) */
    submit: (approvalId: number | string, revisionId: number | string) =>
      `${V1}/approvals/${approvalId}/revisions/${revisionId}/submit`,
    /** 결재 문서 연결 */
    documents: (approvalId: number | string, revisionId: number | string) =>
      `${V1}/approvals/${approvalId}/revisions/${revisionId}/documents`,
    /** 결재 문서 제거 */
    document: (
      approvalId: number | string,
      revisionId: number | string,
      documentId: number | string,
    ) =>
      `${V1}/approvals/${approvalId}/revisions/${revisionId}/documents/${documentId}`,
    /** 결재선 등록 · 수정 (전체 치환) */
    lines: (approvalId: number | string, revisionId: number | string) =>
      `${V1}/approvals/${approvalId}/revisions/${revisionId}/lines`,
  },
  blocks: {
    /** 체크리스트 항목 생성 — 블록 ID 기준 */
    checklistItems: (chkBlockId: number | string) =>
      `${V1}/blocks/checklists/${chkBlockId}/items`,
    /** 체크리스트 항목 수정 · 삭제 — 항목 ID 기준 */
    checklistItem: (chkId: number | string) =>
      `${V1}/blocks/checklists/items/${chkId}`,
    /** 텍스트 본문 수정 — 텍스트 항목 ID 기준 */
    text: (txtId: number | string) => `${V1}/blocks/texts/${txtId}`,
    /** 블록 파일 목록 — 상세 ID 없이 blockId 로 조회한다 */
    files: (blockId: number | string) => `${V1}/blocks/${blockId}/files`,
  },
  files: {
    /** 업로드 시작 — presigned PUT URL 발급 */
    uploads: `${V1}/files/uploads`,
    /** 업로드 완료 통보 — 서버가 저장소를 직접 확인한다 */
    uploadComplete: (fileVersionId: number | string) =>
      `${V1}/files/uploads/${fileVersionId}/complete`,
    /** 문서명 수정 · 휴지통 이동 */
    detail: (fileId: number | string) => `${V1}/files/${fileId}`,
    /** 버전 이력 */
    versions: (fileId: number | string) => `${V1}/files/${fileId}/versions`,
  },
  fileVersions: {
    /** 다운로드 URL 발급 (presigned, 5분) */
    download: (fileVersionId: number | string) =>
      `${V1}/file-versions/${fileVersionId}/download`,
    /** 미리보기 — 응답이 JSON 이 아니라 앞 5페이지를 잘라낸 PDF 바이너리다 */
    preview: (fileVersionId: number | string) =>
      `${V1}/file-versions/${fileVersionId}/preview`,
  },
} as const;
