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
    /** 내 프로젝트 목록 — 권한 밖 건은 403 이 아니라 목록에서 빠진다 */
    root: `${V1}/projects`,
    detail: (projectId: number | string) => `${V1}/projects/${projectId}`,
    stages: (projectId: number | string) =>
      `${V1}/projects/${projectId}/stages`,
    steps: (projectId: number | string) => `${V1}/projects/${projectId}/steps`,
    members: (projectId: number | string) =>
      `${V1}/projects/${projectId}/members`,
    /**
     * 프로젝트의 모든 파일 버전 — 비타메이트 분석 대상 선택에 쓴다.
     * ⚠️ 비타메이트가 아니라 **파일 도메인** API 다 (`features/file/api.ts`).
     */
    fileVersions: (projectId: number | string) =>
      `${V1}/projects/${projectId}/file-versions`,
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
    /** 엑셀 템플릿 — 응답이 `.xlsx` 바이너리다 (봉투가 아니다) */
    bulkTemplate: `${V1}/employees/bulk-template`,
    /** 일괄 등록 검증 — 등록하지 않고 행 오류만 준다 */
    bulkValidate: `${V1}/employees/bulk/validate`,
    /** 일괄 등록 */
    bulk: `${V1}/employees/bulk`,
  },
  employeeGroups: {
    /** 목록 조회(전체 사용자) · 생성(ADMIN) */
    root: `${V1}/employee-groups`,
    /** 수정 · 삭제 */
    detail: (groupId: number) => `${V1}/employee-groups/${groupId}`,
    /** 구성원 목록 조회 · 추가 */
    members: (groupId: number) => `${V1}/employee-groups/${groupId}/members`,
    /** 구성원 제거 — 다건 API 가 없어 한 명씩 부른다 */
    member: (groupId: number, userId: string) =>
      `${V1}/employee-groups/${groupId}/members/${userId}`,
  },
  accounts: {
    role: (userId: string) => `${V1}/accounts/${userId}/role`,
    status: (userId: string) => `${V1}/accounts/${userId}/status`,
    /** 비밀번호 재설정 — 개인 · 다중 공용 */
    passwordResets: `${V1}/accounts/password-resets`,
  },
  pages: {
    /**
     * 내가 볼 수 있는 페이지 — **사이드바 노출의 유일한 근거**다.
     * 아래 `root` 와 반환 집합이 다르다 (이쪽이 더 넓다).
     */
    mine: `${V1}/my/pages`,
    /** 권한 부여 대상 페이지 목록 — `BIDDING` · `FINANCE` 둘뿐 */
    root: `${V1}/pages`,
    /** 접근 가능자 목록 조회 · 권한 부여(등급 변경 겸용) */
    permissions: (pageCode: string) => `${V1}/pages/${pageCode}/permissions`,
    /** 권한 회수 — 명시 부여 기록만 지운다 */
    permission: (pageCode: string, userId: string) =>
      `${V1}/pages/${pageCode}/permissions/${userId}`,
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
    /** 그 직급인 사원 목록 — 재직자만 (0명이면 빈 배열) */
    employees: (jobPositionId: number | string) =>
      `${V1}/job-positions/${jobPositionId}/employees`,
  },
  steps: {
    blocks: (stepId: number | string) => `${V1}/steps/${stepId}/blocks`,
    /** 블록 배치 변경 — 스텝의 배치 전체를 한 번에 보낸다 */
    blocksLayout: (stepId: number | string) =>
      `${V1}/steps/${stepId}/blocks/layout`,
    /** 이슈 목록 조회 · 생성 */
    issues: (stepId: number | string) => `${V1}/steps/${stepId}/issues`,
    /** 활동 기록 조회 — 블록별 조회도 이 경로에 `?blockId=` 로 붙인다 */
    activityLogs: (stepId: number | string) =>
      `${V1}/steps/${stepId}/activity-logs`,
  },
  issues: {
    /** 상세 조회 · 부분 수정 · 삭제 */
    detail: (issueId: number | string) => `${V1}/issues/${issueId}`,
    /** 상태 변경 — 부분 수정과 엔드포인트가 다르다 */
    status: (issueId: number | string) => `${V1}/issues/${issueId}/status`,
  },
  approvals: {
    /** 결재 관리 목록 */
    root: `${V1}/approvals`,
    /** 결재 상세 — **항상 현재 회차**다. 회차를 지정할 수 없다 */
    detail: (approvalId: number | string) => `${V1}/approvals/${approvalId}`,
    /** 재상신 회차 생성(POST) · 회차 이력 조회(GET) */
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
  /** ⚠️ 승인 · 반려는 결재가 아니라 **결재선(`lineId`)** 을 대상으로 한다 */
  approvalLines: {
    approve: (lineId: number | string) =>
      `${V1}/approval-lines/${lineId}/approve`,
    reject: (lineId: number | string) =>
      `${V1}/approval-lines/${lineId}/reject`,
  },
  blocks: {
    detail: (blockId: number | string) => `${V1}/blocks/${blockId}`,
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
    /**
     * 이미지 항목 전체 조회(GET, 편집 권한) · 생성(POST, multipart).
     * ⚠️ 조회는 **편집 권한**이 필요하다 — 열람만 가능한 사용자는 `imageItemAt` 을 쓴다.
     */
    imageItems: (imgBlockId: number | string) =>
      `${V1}/blocks/images/${imgBlockId}/items`,
    /**
     * 이미지 한 장 조회 — 현재 정렬 번호 기준 앞/뒤 한 장.
     * 목록 조회 API 가 없어 여기로 한 장씩 넘긴다. `?direction=prev|next` 필요.
     */
    imageItemAt: (imgBlockId: number | string, orderIndex: number | string) =>
      `${V1}/blocks/images/${imgBlockId}/items/${orderIndex}`,
    /** 이미지 다운로드 — `?imgId=` 없으면 블록 전체를 zip 으로 준다 */
    imageDownload: (imgBlockId: number | string) =>
      `${V1}/blocks/images/${imgBlockId}/download`,
    /**
     * 이미지 순서 · 캡션 수정 (전체 치환).
     * ⚠️ 경로가 `.../items/{...}` 인데 넣는 값은 **항목 ID 가 아니라 블록 ID** 다.
     */
    imageItemsEdit: (imgBlockId: number | string) =>
      `${V1}/blocks/images/items/${imgBlockId}`,
    /** 이미지 항목 삭제 — 이쪽은 **항목 ID(`imgId`)** 다. 위 경로와 모양만 같다 */
    imageItem: (imgId: number | string) => `${V1}/blocks/images/items/${imgId}`,
    /**
     * 정산 항목 — 수정 시 조회(GET) · 작성/수정(PATCH).
     * ⚠️ 둘 다 `?type=INCOME|OUTCOME` 이 **필수**다.
     */
    settlementItems: (settleId: number | string) =>
      `${V1}/blocks/settlements/${settleId}/items`,
    /**
     * 비타메이트 분석 요청(POST) · 블록별 분석 이력 조회(GET).
     *
     * ⚠️ POST 는 `Idempotency-Key` 헤더가 **필수**다.
     * ⚠️ GET 은 최신순 최대 20건이고 `documents`/`result`/`citations` 가 없다 —
     *    본문이 필요하면 `vitamate.analysis` 로 한 번 더 조회한다.
     */
    vitamateAnalyses: (blockId: number | string) =>
      `${V1}/blocks/${blockId}/vitamate/analyses`,
  },
  vitamate: {
    /** 검토 유형 · 세부 카테고리 · 기본 프롬프트(`exampleText`) */
    reviewTemplates: `${V1}/vitamate/review-templates`,
    /** 분석 단건 조회 — 진행 중 polling 도 이 경로를 쓴다 */
    analysis: (analysisId: number | string) =>
      `${V1}/vitamate/analyses/${analysisId}`,
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
    /** 버전 단건 조회 (결재용) — 문서가 휴지통이어도 반환된다 */
    detail: (fileVersionId: number | string) =>
      `${V1}/file-versions/${fileVersionId}`,
    /** 다운로드 URL 발급 (presigned, 5분) */
    download: (fileVersionId: number | string) =>
      `${V1}/file-versions/${fileVersionId}/download`,
    /** 미리보기 — 응답이 JSON 이 아니라 앞 5페이지를 잘라낸 PDF 바이너리다 */
    preview: (fileVersionId: number | string) =>
      `${V1}/file-versions/${fileVersionId}/preview`,
  },
  /**
   * 입찰 도메인. (.ai/API.md 103~104 · `입찰 도메인 — 공통`)
   *
   * ⚠️ 수집 조건 경로는 명세 초안의 `crawl-conditions` 가 아니라 **`collection-conditions`** 다.
   *    공고(`notices`)는 초안 그대로다.
   */
  bidding: {
    /** 공고 목록 — 기간 · 발주처 · 카테고리 · 지역 · 마감임박 · 공고명으로 거른다 */
    notices: `${V1}/bidding/notices`,
    /** 공고 상세 — 첨부 목록은 없다 (`hasAttachment` · `sourceUrl` 뿐) */
    notice: (noticeId: number | string) => `${V1}/bidding/notices/${noticeId}`,
    /**
     * 수집 조건 목록(GET) · 등록(POST).
     * ⚠️ 초안 명세의 `crawl-conditions` 가 아니다. 목록은 페이징이 없다 (`data.content` 만).
     */
    collectionConditions: `${V1}/bidding/collection-conditions`,
    /** 수집 조건 수정 — `sourceCode` 는 보낼 수 없다 (등록 때만 정한다) */
    collectionCondition: (conditionId: number | string) =>
      `${V1}/bidding/collection-conditions/${conditionId}`,
    /**
     * 수동 수집 요청 — 본문이 없고 `202` 로 `runId` 만 온다 (비동기).
     * ⚠️ 비활성 조건은 400, 이미 돌고 있으면 409 다.
     */
    collectionRuns: (conditionId: number | string) =>
      `${V1}/bidding/collection-conditions/${conditionId}/runs`,
    /**
     * 수집 실행 결과 — `PENDING` → `PROCESSING` → `COMPLETED` | `FAILED` 를 폴링한다.
     * ⚠️ 실행 이력 **목록** API 는 없다 — `runId` 를 잃으면 되살릴 수 없다.
     */
    collectionRun: (runId: number | string) =>
      `${V1}/bidding/collection-runs/${runId}`,
  },
  notifications: {
    /** 알림 목록 — `category` · `isRead` · `page` · `size` 로 거른다 */
    root: `${V1}/notifications`,
    /** 개별 삭제(논리 삭제) */
    detail: (notificationId: number | string) =>
      `${V1}/notifications/${notificationId}`,
    /** 이동 대상 조회 — **읽음 처리를 겸한다** */
    target: (notificationId: number | string) =>
      `${V1}/notifications/${notificationId}/target`,
    /** 이동 없이 읽음만 표시 (멱등) */
    read: (notificationId: number | string) =>
      `${V1}/notifications/${notificationId}/read`,
    /** 전체 읽음 */
    readAll: `${V1}/notifications/read-all`,
  },
} as const;
