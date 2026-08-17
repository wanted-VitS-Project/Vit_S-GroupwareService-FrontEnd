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
    /**
     * 내 프로필 사진 등록·변경(PUT, multipart) · 삭제(DELETE). 둘 다 **본인만** · 멱등이다.
     *
     * ⚠️ 경로는 `/auth` 지만 데이터는 사원 속성이라 **에러 코드가 `EMP_` 접두어**로 온다.
     */
    profileImage: `${V1}/auth/me/profile-image`,
    password: `${V1}/auth/password`,
    termsAgreements: `${V1}/auth/terms-agreements`,
  },
  projects: {
    /** 내 프로젝트 목록 — 권한 밖 건은 403 이 아니라 목록에서 빠진다 */
    root: `${V1}/projects`,
    detail: (projectId: number | string) => `${V1}/projects/${projectId}`,
    /** 스테이지 목록 조회 · 생성 */
    stages: (projectId: number | string) =>
      `${V1}/projects/${projectId}/stages`,
    /**
     * 스테이지 순서 변경 — **전체 최종 순서**를 보낸다.
     * ⚠️ 항목마다 `version` 을 검사하고 하나라도 어긋나면 요청 전체가 409 로 롤백된다.
     *    `overwrite` 가 없어 409 면 재조회 후 다시 끄는 수밖에 없다.
     */
    stagesOrder: (projectId: number | string) =>
      `${V1}/projects/${projectId}/stages/order`,
    /** 스텝 목록 조회 · 생성 */
    steps: (projectId: number | string) => `${V1}/projects/${projectId}/steps`,
    /**
     * 스텝 순서 · 소속 스테이지 변경 — **위치를 바꾸는 유일한 경로**다.
     * ⚠️ 보드 전체의 최종 배치를 보낸다. 낙관적 락은 항목별이고 롤백은 전체다.
     */
    stepsOrder: (projectId: number | string) =>
      `${V1}/projects/${projectId}/steps/order`,
    /** 참여자 목록 조회 · 추가 — 추가는 **한 명씩**이다 (일괄 파라미터 없음 · INV-07) */
    members: (projectId: number | string) =>
      `${V1}/projects/${projectId}/members`,
    /**
     * 참여자 권한 변경 · 제거. 대상은 사번이 아니라 **참여자 행 ID(`memberId`)** 다.
     *
     * ⛔ 자기 자신은 둘 다 403 `MEMBER_SELF_EDIT_DENIED` 다 (INV-10) — 화면에서도 막는다.
     * ⚠️ 제거는 하드 삭제고, 그 프로젝트 스텝의 권한 오버라이드도 함께 지워진다.
     */
    member: (projectId: number | string, memberId: number | string) =>
      `${V1}/projects/${projectId}/members/${memberId}`,
    /**
     * 프로젝트 상태 변경 — ⛔ `CLOSED` 는 여기가 아니라 `close` 소관이다.
     * ⚠️ 낙관적 락 대상이다 (`version` 필수).
     */
    status: (projectId: number | string) =>
      `${V1}/projects/${projectId}/status`,
    /**
     * 프로젝트 종결 — 사유가 필수다.
     * ⛔ 낙관적 락 대상이 **아니다** (`version` 을 받지 않고 409 도 없다).
     */
    close: (projectId: number | string) => `${V1}/projects/${projectId}/close`,
    /**
     * 사업 카테고리 연결 — 응답은 **연결 후 전체 목록**이다.
     * ⚠️ 이미 붙은 것이 하나라도 섞이면 요청 전체가 409 다.
     */
    businessCategories: (projectId: number | string) =>
      `${V1}/projects/${projectId}/business-categories`,
    /** 사업 카테고리 해제 — 연결 행을 지우는 하드 삭제다 */
    businessCategory: (
      projectId: number | string,
      categoryId: number | string,
    ) => `${V1}/projects/${projectId}/business-categories/${categoryId}`,
    /**
     * 프로젝트의 모든 파일 버전 — 비타메이트 분석 대상 선택에 쓴다.
     * ⚠️ 비타메이트가 아니라 **파일 도메인** API 다 (`features/file/api.ts`).
     */
    fileVersions: (projectId: number | string) =>
      `${V1}/projects/${projectId}/file-versions`,
    /**
     * 프로젝트 문서함 — 스텝 · 블록 위치가 붙은 **평면 목록**이다.
     * 트리로 묶는 것은 화면 몫이다 (`ProjectFileTree`).
     */
    files: (projectId: number | string) => `${V1}/projects/${projectId}/files`,
    /** 프로젝트 휴지통 — 블록 목록(`?deleted=true`)과 달리 프로젝트 범위다 */
    filesTrash: (projectId: number | string) =>
      `${V1}/projects/${projectId}/files/trash`,
    /** 프로젝트 이미지 모아보기 — 블록 ID 만 오고 스텝 정보는 없다 */
    images: (projectId: number | string) =>
      `${V1}/projects/${projectId}/images`,
    /** 이미지 휴지통 — ⚠️ 위와 달리 `imgBlockId` 조차 오지 않는다 */
    imagesTrash: (projectId: number | string) =>
      `${V1}/projects/${projectId}/images/trash`,
    /** 프로젝트 전체 이슈 — 스텝별로 묶여 오고 페이징이 없다 */
    issues: (projectId: number | string) =>
      `${V1}/projects/${projectId}/issues`,
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
    /**
     * 아바타 서빙 — 로그인 사용자면 누구나. 응답이 JSON 이 아니라 **presigned 로 302** 다.
     *
     * ⚠️ 직접 부르지 않는다. `apiUrl()` 을 씌워 `<img src>` 에 넣고 브라우저가 따라가게 한다.
     * ⚠️ `userId` 는 **접두어까지 포함한 사번 그대로**다 (`vitas-EMP001`). 잘라 쓰지 말 것.
     */
    profileImage: (userId: string) => `${V1}/employees/${userId}/profile-image`,
    /** 엑셀 템플릿 — 응답이 `.xlsx` 바이너리다 (봉투가 아니다) */
    bulkTemplate: `${V1}/employees/bulk-template`,
    /** 일괄 등록 검증 — 등록하지 않고 행 오류만 준다 */
    bulkValidate: `${V1}/employees/bulk/validate`,
    /** 일괄 등록 */
    bulk: `${V1}/employees/bulk`,
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
  stages: {
    /**
     * 스테이지 이름 수정 · 삭제.
     *
     * ⚠️ 수정은 **낙관적 락**이다 — 목록에서 받은 `version` 을 실어야 하고, 늦으면 409 다.
     * ⚠️ 삭제는 `?moveToStageId=` 가 **필수**다 (`0` 이면 미소속). 하위 스텝은 함께 지워지지 않는다.
     * ⛔ 순서 변경은 이 경로가 아니다 — `PATCH /projects/{projectId}/stages/order` 소관이다.
     */
    detail: (stageId: number | string) => `${V1}/stages/${stageId}`,
    /**
     * 이 스테이지에 **새로 생길 스텝**의 권한 기본값 저장 (`stage_permission_default`).
     *
     * ⚠️ `stage_permission` 테이블은 없다 — 기본값은 **권한 판정에 쓰이지 않고**,
     *    스텝이 생성될 때 `step_permission` 행으로 복사될 뿐이다 (STG-004 · INV-01).
     * ⚠️ 여기만 `NONE` 이 유효값이다 — 참여자 권한(`VIEWER`·`EDITOR`)과 다르다.
     */
    stepPermissions: (stageId: number | string) =>
      `${V1}/stages/${stageId}/step-permissions`,
  },
  steps: {
    /**
     * 스텝 수정 · 삭제.
     *
     * ⚠️ 수정은 **낙관적 락**이고 **전체 덮어쓰기**다 — 생략한 필드는 유지가 아니라 해제된다.
     * ⛔ `stageId` 는 받지 않는다 (2026-08-09) — 소속·순서는 `steps/order` 로 일원화됐다.
     */
    detail: (stepId: number | string) => `${V1}/steps/${stepId}`,
    /** 스텝 완료 처리 — 미완료 이슈 처리 방식(`openIssueAction`)이 **필수**다 */
    complete: (stepId: number | string) => `${V1}/steps/${stepId}/complete`,
    /**
     * 스텝 상태 변경 — `NOT_STARTED` · `IN_PROGRESS` 둘뿐이다.
     *
     * ⛔ **`DONE` 은 여기가 아니다** — 미완료 이슈 처리 선택이 필요해 `complete` 소관이다 (STP-006).
     * ⚠️ 낙관적 락 대상이고, `DONE` 에서 되돌리면 완료 기록(`completedAt`·`completedBy`)도 비워진다.
     */
    status: (stepId: number | string) => `${V1}/steps/${stepId}/status`,
    /**
     * 스텝 권한 목록 조회 — 참여자 **전원**의 최종 판정이 온다 (프로젝트 EDITOR 전용).
     * ⚠️ `overridden: false` 는 차단이 아니라 **프로젝트 권한 상속**이다 (STP-011).
     */
    permissions: (stepId: number | string) =>
      `${V1}/steps/${stepId}/permissions`,
    /**
     * 스텝 권한 부여 · 변경(`PUT`) · 회수(`DELETE`). 대상은 **사번**이다.
     * ⚠️ 특정 스텝만 가리려면 `NONE` 행을 **명시적으로** 넣어야 한다 — 회수는 상속으로 되돌린다.
     */
    permission: (stepId: number | string, userId: string) =>
      `${V1}/steps/${stepId}/permissions/${userId}`,
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
    /**
     * 담당 이슈 캘린더 — 로그인 사용자가 담당인 **미완료 이슈 전체**가 한 번에 온다.
     * 기간 파라미터가 없다 — 월 이동은 받아 둔 데이터를 화면에서 거른다.
     */
    calendar: `${V1}/issues/calendar`,
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
    /**
     * 블록을 **다른 스텝으로 이동** (2026-08-11 신설).
     *
     * ⚠️ 낙관적 락 대상이다 — `version` 필수, 409 면 재조회 · 덮어쓰기를 묻는다.
     * ⚠️ 출발 · 도착 **양쪽 스텝의 EDITOR** 여야 한다 (`STEP_EDIT_DENIED`).
     * ⚠️ 옮기면 **이슈 연결이 끊긴다** — 응답 `unlinkedIssueCount` 로 몇 건인지 알려준다.
     */
    step: (blockId: number | string) => `${V1}/blocks/${blockId}/step`,
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
     * 이미지 복구 · 영구 삭제 — **다건**이라 ID 를 경로가 아니라 본문에 싣는다.
     * 위 `imageItem(imgId)` 과 경로 모양이 겹치므로(`.../items/{...}`) 고정 문자열로 둔다.
     */
    imageItemsRestore: `${V1}/blocks/images/items/restore`,
    /** ⚠️ **본문 있는 DELETE** 다 — 파일 영구 삭제(POST)와 방식이 다르다 */
    imageItemsHardDelete: `${V1}/blocks/images/items/hard`,
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
    /**
     * 내 프로젝트 파일 모아보기 — 내가 멤버인 **모든 프로젝트**를 가로지른다.
     * 스텝 `VIEWER` 이상인 파일만 오고, 페이징이 없다 (`keyword` · `projectId` · `extension` 으로 거른다).
     */
    my: `${V1}/files/my`,
    /**
     * 전사 파일 목록 (ADMIN 전용 · FILE-Q-01) — 회사의 **모든 프로젝트**를 가로지른다.
     * 경로만 `/admin` 아래에 있고 다루는 것은 파일이라 이 묶음에 둔다.
     */
    admin: `${V1}/admin/files`,
    /**
     * 전사 파일 **탐색기** (ADMIN 전용 · §14 · 2026-08-16 신설).
     *
     * 전사 목록(`admin`)과 목적이 다르다 — 저쪽은 검색 · 필터, 이쪽은 **한 단계씩 내려가는 탐색**이다.
     * 노드를 열 때마다 자식만 부른다 (`프로젝트 → 스테이지 → 스텝 → 파일`).
     *
     * ⚠️ 프로젝트 · 스테이지 · 스텝 목록을 **일반 경로(`/projects/...`)로 부르지 않는다** —
     *    그쪽은 참여자 권한이라 관리자가 참여하지 않은 프로젝트에서 403 이 난다.
     */
    adminTree: {
      projects: `${V1}/admin/files/projects`,
      stages: (projectId: number | string) =>
        `${V1}/admin/files/projects/${projectId}/stages`,
      /** `?stageId=` 를 생략하면 **스테이지 미소속(미분류)** 스텝이 온다 */
      steps: (projectId: number | string) =>
        `${V1}/admin/files/projects/${projectId}/steps`,
      files: (stepId: number | string) =>
        `${V1}/admin/files/steps/${stepId}/files`,
    },
    /** 업로드 시작 — presigned PUT URL 발급 */
    uploads: `${V1}/files/uploads`,
    /** 업로드 완료 통보 — 서버가 저장소를 직접 확인한다 */
    uploadComplete: (fileVersionId: number | string) =>
      `${V1}/files/uploads/${fileVersionId}/complete`,
    /** 문서명 수정 · 휴지통 이동 */
    detail: (fileId: number | string) => `${V1}/files/${fileId}`,
    /** 버전 이력 */
    versions: (fileId: number | string) => `${V1}/files/${fileId}/versions`,
    /** 휴지통에서 복구 — 블록이 지워졌어도 살아난다 */
    restore: (fileId: number | string) => `${V1}/files/${fileId}/restore`,
    /**
     * 영구 삭제 — 확인 문자를 본문에 실어야 해서 `DELETE` 가 아니라 `POST` 다
     * (일부 프록시가 `DELETE` 본문을 버린다).
     */
    permanentDeletion: (fileId: number | string) =>
      `${V1}/files/${fileId}/permanent-deletion`,
  },
  /**
   * 사내 문서함 (ADMIN 전용 · `features/companyDocument/`).
   *
   * 프로젝트 파일과 **별도 도메인**이다 — 경로 · 에러코드(`CDOC_*`)가 모두 따로 있다.
   * 다운로드 · 미리보기도 파일 도메인(`fileVersions`)이 아니라 이쪽 경로를 쓴다.
   */
  companyDocuments: {
    /** 목록 — 분류 · 검색 · 페이징 */
    root: `${V1}/admin/company-documents`,
    /**
     * 검토 참조로 고를 수 있는 사내 문서 — **완료된 최신 버전만** 온다.
     * 고른 값은 `companyDocumentVersionId` 다 (문서가 아니라 **버전으로 고정**한다).
     *
     * ⚠️ 관리자용(`/admin/company-documents`)과 달리 **`/admin` 이 없다** —
     *    회사 소속이면 `MEMBER` 도 부를 수 있어야 해서 경로가 갈린다.
     */
    selectable: `${V1}/company-documents/selectable`,
    /** 업로드 시작 — presigned PUT URL 발급 (10분) */
    uploads: `${V1}/admin/company-documents/uploads`,
    /** 업로드 완료 통보 — 서버가 저장소를 직접 확인한다 */
    uploadComplete: (versionId: number | string) =>
      `${V1}/admin/company-documents/uploads/${versionId}/complete`,
    /** 표시명 · 분류 수정 · 삭제(soft) */
    detail: (documentId: number | string) =>
      `${V1}/admin/company-documents/${documentId}`,
    /** 버전 이력 — 완료 버전만, 차수 내림차순 */
    versions: (documentId: number | string) =>
      `${V1}/admin/company-documents/${documentId}/versions`,
    /** 삭제 복구 */
    restore: (documentId: number | string) =>
      `${V1}/admin/company-documents/${documentId}/restore`,
    /** 다운로드 URL 발급 (presigned, 5분) */
    download: (versionId: number | string) =>
      `${V1}/admin/company-document-versions/${versionId}/download`,
    /** 미리보기 — 응답이 JSON 이 아니라 앞 5페이지를 잘라낸 PDF 바이너리다 */
    preview: (versionId: number | string) =>
      `${V1}/admin/company-document-versions/${versionId}/preview`,
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
    /** 공고 상세 — 첨부 목록(`attachments`)까지 함께 온다 */
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
    /**
     * AI 요약 요청(POST) · 공고별 이력 조회(GET).
     *
     * ⚠️ 요청은 **202** 로 `summaryId` 만 오는 비동기다 — 결과는 `summary()` 를 폴링한다.
     *    이미 돌고 있으면 409 `BIDDING_SUMMARY_ALREADY_PROCESSING`.
     */
    noticeSummaries: (noticeId: number | string) =>
      `${V1}/bidding/notices/${noticeId}/summaries`,
    /** AI 요약 단건 조회(GET) · 수정(PATCH) — 폴링 대상 */
    summary: (summaryId: number | string) =>
      `${V1}/bidding/summaries/${summaryId}`,
    /** AI 요약 확정 — 확정하면 더 못 고친다 */
    summaryConfirm: (summaryId: number | string) =>
      `${V1}/bidding/summaries/${summaryId}/confirm`,
    /**
     * AI 문서 검토 요청(POST) · 공고별 이력 조회(GET).
     *
     * ⚠️ 요약과 **다른 기능**이다 — 공고 첨부와 사내 문서를 비교한다 (워커도 따로다).
     */
    noticeReviews: (noticeId: number | string) =>
      `${V1}/bidding/notices/${noticeId}/reviews`,
    /** 검토 화면에 고를 공고 첨부 목록 — 사내 문서는 별도 API 다 */
    reviewSources: (noticeId: number | string) =>
      `${V1}/bidding/notices/${noticeId}/review-sources`,
    /** 검토 단건 조회 — 폴링 대상 (결과 · 근거 인용 포함) */
    review: (reviewId: number | string) => `${V1}/bidding/reviews/${reviewId}`,
    /** 검토 종료 — 임시 파일 정리를 즉시 요청한다 */
    reviewAbandon: (reviewId: number | string) =>
      `${V1}/bidding/reviews/${reviewId}/abandon`,
    /**
     * 공고 → 프로젝트 전환.
     *
     * ⚠️ **완료된 AI 문서 검토가 근거로 필수**다 — 검토에서 내려받기에 성공한 공고 첨부가
     *    정식 파일로 프로젝트에 귀속된다. 전환하지 않으면 임시 파일은 만료 시 삭제된다.
     */
    noticeProjects: (noticeId: number | string) =>
      `${V1}/bidding/notices/${noticeId}/projects`,
  },
  finance: {
    /** 재무 관리 허브의 3개 항목 수치 (입출금 · 세금계산서 · 정산 현황) */
    summary: `${V1}/finance/summary`,
    /**
     * 정산 현황 — **프로젝트 단위 집계**다.
     *
     * ⚠️ 경로가 `/finance` 가 아니라 `/projects` 아래에 있다 (집계 대상이 프로젝트라서).
     *    다루는 화면은 재무 관리이므로 이 묶음에 둔다.
     */
    settlements: {
      /** 전사 프로젝트 정산 현황 (페이징 · 정렬) */
      root: `${V1}/projects/settlements`,
      /** 필터 옵션 — 발주처 이름 목록만 온다 */
      filters: `${V1}/projects/settlements/filters`,
      /** 한 프로젝트의 정산 회차 목록 (페이징 없음) */
      ofProject: (projectId: number | string) =>
        `${V1}/projects/${projectId}/settlements`,
    },
    cashFlows: {
      /** 목록 조회(GET) · 직접 등록(POST) · 다건 삭제(DELETE — body 에 id 배열) */
      root: `${V1}/finance/cash-flows`,
      /** 필터 옵션 — 프로젝트 목록만 내려온다 */
      filters: `${V1}/finance/cash-flows/filters`,
      /** 연결 대상 제외/포함 — 프로젝트와 무관한 건을 연결 후보에서 뺀다 */
      exclude: `${V1}/finance/cash-flows/exclude`,
      /**
       * 수정 — csv · api 출처이거나 이미 블록에 연결된 건은 **메모만** 바뀐다.
       * 나머지 필드는 화면에서 막는다.
       */
      detail: (cashFlowId: number | string) =>
        `${V1}/finance/cash-flows/${cashFlowId}`,
      /** 매칭 추천 — 프로젝트가 아니라 **정산 블록** 후보가 온다 */
      matchCandidates: (cashFlowId: number | string) =>
        `${V1}/finance/cash-flows/${cashFlowId}/match-candidates`,
      match: (cashFlowId: number | string) =>
        `${V1}/finance/cash-flows/${cashFlowId}/match`,
      unmatch: (cashFlowId: number | string) =>
        `${V1}/finance/cash-flows/${cashFlowId}/unmatch`,
      /** CSV 컬럼 추천 · 미리보기 — 파일 자체는 저장되지 않는다 */
      csvPreview: `${V1}/finance/cash-flows/csv/preview`,
      /** 매핑 확정 후 실제 저장 */
      csv: `${V1}/finance/cash-flows/csv`,
    },
    /**
     * 세금계산서. 홈택스에서 내려받은 파일을 올려 일괄 수집한다.
     *
     * ⚠️ 입출금과 **모양은 닮았지만 다른 리소스**다 — 중복 판정 기준이 승인번호이고,
     *    매출(`INCOME`) · 매입(`OUTCOME`) 구분을 사람이 고른다.
     */
    taxInvoices: {
      /**
       * 목록 조회(GET) · 다건 삭제(DELETE — body 에 id 배열).
       *
       * ⚠️ 입출금 목록과 달리 **페이징이 있다** (`page` · `size`).
       * ⚠️ 직접 등록(POST)은 없다 — CSV 로만 들어온다.
       */
      root: `${V1}/finance/tax-invoices`,
      /** 필터 옵션 — 프로젝트 목록만 내려온다 */
      filters: `${V1}/finance/tax-invoices/filters`,
      /** 연결 대상 제외/포함 — 프로젝트와 무관한 건을 연결 후보에서 뺀다 */
      exclude: `${V1}/finance/tax-invoices/exclude`,
      /** ⚠️ 수정은 **메모만** 된다 (직접 등록이 없어 나머지는 파일이 원본이다) */
      detail: (taxId: number | string) => `${V1}/finance/tax-invoices/${taxId}`,
      /** 매칭 추천 — 프로젝트가 아니라 **정산 블록** 후보가 온다 */
      matchCandidates: (taxId: number | string) =>
        `${V1}/finance/tax-invoices/${taxId}/match-candidates`,
      match: (taxId: number | string) =>
        `${V1}/finance/tax-invoices/${taxId}/match`,
      unmatch: (taxId: number | string) =>
        `${V1}/finance/tax-invoices/${taxId}/unmatch`,
      /** CSV 컬럼 추천 · 미리보기 — 파일 자체는 저장되지 않는다 */
      csvPreview: `${V1}/finance/tax-invoices/csv/preview`,
      /** 매핑 확정 후 실제 저장 */
      csv: `${V1}/finance/tax-invoices/csv`,
    },
  },
  notifications: {
    /** 알림 목록 — `category` · `isRead` · `page` · `size` 로 거른다 */
    root: `${V1}/notifications`,
    /**
     * 실시간 수신 (SSE · `text/event-stream`).
     *
     * ⚠️ `lib/api.ts` 로 부르지 않는다 — **응답이 닫히지 않는** 연결이라
     *    `EventSource` 가 직접 연다 (`apiUrl()` 로 오리진을 씌운다).
     *    구독 시점 **이후에 생기는 알림만** 오고, 과거 · 개수는 계속 목록 API 다.
     */
    stream: `${V1}/notifications/stream`,
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
