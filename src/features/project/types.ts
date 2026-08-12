import type { ProjectStatusCode } from '@/constants/status';

/** 사업 카테고리 — 프로젝트에 여러 개 붙을 수 있다 */
export interface BusinessCategory {
  categoryId: number;
  name: string;
  /** 업무코드는 선택 입력이라 없을 수 있다 */
  code: string | null;
}

/**
 * 프로젝트 상태.
 * 값과 라벨을 한곳에서 관리하려고 `constants/status.ts` 의 타입을 그대로 쓴다.
 */
export type ProjectStatus = ProjectStatusCode;

/** 프로젝트에서 요청자가 가진 권한. VIEWER 면 수정 버튼을 숨긴다 */
export type ProjectPermission = 'VIEWER' | 'EDITOR';

export interface ProjectMember {
  memberId: number;
  userId: string;
  name: string;
  department: string | null;
  permission: 'VIEWER' | 'EDITOR' | 'NONE';
  resigned: boolean;
}

/**
 * GET /api/v1/projects/{projectId}
 * ⚠️ status 는 백엔드 enum 이 확정되지 않아 string 으로 둔다. (예: 'IN_PROGRESS')
 */
export interface ProjectDetail {
  projectId: number;
  name: string;
  description: string | null;
  /** 발주처 */
  clientName: string;
  status: string;
  /** YYYY-MM-DD */
  startedOn: string;
  /** YYYY-MM-DD */
  endedOn: string;
  contractAmount: number;
  /** 진척률(%) — 스텝이 0개면 응답에 없다 */
  progressRate?: number;
  stepCount: number;
  doneStepCount: number;
  businessCategories: BusinessCategory[];
  bidNoticeId: number | null;
  /** 종결 건에만 값이 있다 */
  closeReasonCode: string | null;
  closeReasonNote: string | null;
  myPermission: ProjectPermission;
  /** YYYY-MM-DDTHH:mm:ss */
  createdAt: string;
}

/** 카드 아바타용 참여자 — 상세의 `ProjectMember` 보다 훨씬 얇다 */
export interface ProjectListMember {
  userId: string;
  name: string;
}

/**
 * GET /api/v1/projects — 목록 한 건.
 *
 * ⚠️ 상세(`ProjectDetail`)와 달리 `stepCount` · `doneStepCount` · `description` 이 없다.
 * 카드에 `완료/전체` 를 그리려면 상세를 카드마다 불러야 하므로 대신
 * 목록이 주는 `myIssueInProgressCount` · `myApprovalInProgressCount` 를 뱃지로 쓴다.
 */
export interface ProjectListItem {
  projectId: number;
  name: string;
  /** 발주처 */
  clientName: string;
  status: ProjectStatus;
  /** YYYY-MM-DD */
  startedOn: string;
  /** YYYY-MM-DD */
  endedOn: string;
  contractAmount: number;
  /** 진척률(%) — 스텝이 0개면 응답에 없다 */
  progressRate?: number;
  businessCategories: BusinessCategory[];
  /** 이름 오름차순 */
  members: ProjectListMember[];
  /** 요청자가 담당인 `IN_PROGRESS` 이슈 수 */
  myIssueInProgressCount: number;
  /**
   * 요청자가 **기안한** `IN_PROGRESS`+`REJECTED` 결재 수 — `결재 대기` 가 아니다.
   *
   * ⚠️ 이름이 `InProgress` 라고 **그 상태만 세는 것이 아니다** — `REJECTED` 도 포함이다.
   *    (2026-08-11 `myApprovalOpenCount` 에서 개명. 뜻은 그대로다)
   */
  myApprovalInProgressCount: number;
}

/**
 * 목록 조회 파라미터.
 * ⚠️ 정렬은 `created_at DESC` → `project_id DESC` 고정이라 정렬 파라미터가 없다.
 */
export interface ProjectListQuery {
  status?: ProjectStatus;
  businessCategoryId?: number;
  /** YYYY-MM-DD */
  startedOnFrom?: string;
  /** YYYY-MM-DD */
  startedOnTo?: string;
  /** 과업명 · 발주처 검색 */
  keyword?: string;
  /** 0-based */
  page?: number;
  /** 기본 20. 백엔드가 1~100 으로 잘라낸다 */
  size?: number;
}

/** 목록 응답 봉투 */
export interface ProjectPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** 스테이지명 상한 (`stage.name`) */
export const STAGE_NAME_MAX_LENGTH = 100;
/** 스텝명 상한 (`step.name`) — 스테이지보다 길다 */
export const STEP_NAME_MAX_LENGTH = 200;

/**
 * 낙관적 락에 쓰는 버전 값.
 *
 * ⚠️ **선택 필드로 둔다.** 수정 API 2종은 `version` 이 필수(누락하면 400)인데
 * 목록 조회 명세(API.md 7 · 8번)에는 아직 이 필드가 없다 — 낙관적 락이 2026-08-11 신설이라
 * 목록 응답 반영 여부가 확인되지 않았다. 값이 없으면 화면이 **수정 저장을 막고 재조회를 안내**한다.
 * 백엔드에서 확인되면 `?` 만 떼면 된다.
 */
type OptimisticVersion = { version?: number };

/** GET /api/v1/projects/{projectId}/stages — sortOrder 오름차순으로 온다 */
export interface ProjectStage extends OptimisticVersion {
  stageId: number;
  name: string;
  sortOrder: number;
  /** 소속 스텝 수 */
  stepCount: number;
}

export type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

/** 스텝 책임자 — 지정 전이면 null. **작업자가 아니라 책임자다** */
export interface StepOwner {
  /** 사번 (`owner_user_id VARCHAR(20)`) */
  userId: string;
  name: string;
  /** 삭제된 사원인지 (D-6). 이름은 그대로 내려온다 */
  deleted?: boolean;
}

/** GET /api/v1/projects/{projectId}/steps */
export interface ProjectStep extends OptimisticVersion {
  stepId: number;
  /** 소속 스테이지. null 이면 아직 스테이지에 배정되지 않은 스텝이다 */
  stageId: number | null;
  name: string;
  status: StepStatus;
  sortOrder: number;
  /** YYYY-MM-DD */
  startedOn: string;
  /** YYYY-MM-DD */
  endedOn: string;
  owner: StepOwner | null;
  totalIssueCount: number;
  doneIssueCount: number;
  inProgressIssueCount: number;
  /** 진척률(%) — 이슈가 0개면 응답에 없다 */
  progressRate?: number;
  myPermission: ProjectPermission;
}

/* ─────────────── 스테이지 생성 · 수정 · 삭제 ─────────────── */

export interface CreateStageRequest {
  name: string;
  /** 미지정이면 서버가 `max+1` 을 넣는다 — 화면은 보내지 않는다 */
  sortOrder?: number;
}

/** POST /api/v1/projects/{projectId}/stages */
export interface CreatedStage {
  stageId: number;
  projectId: number;
  name: string;
  sortOrder: number;
}

export interface UpdateStageRequest {
  name: string;
  /** 목록에서 받은 값을 그대로 싣는다. 누락하면 400 */
  version: number;
  /** `true` 면 충돌을 무시하고 덮어쓴다. 생략하면 `false` */
  overwrite?: boolean;
}

/** PATCH /api/v1/stages/{stageId} */
export interface UpdatedStage {
  stageId: number;
  name: string;
  sortOrder: number;
  /**
   * ⚠️ **저장 후의 새 값**이다.
   * 화면 상태를 이 값으로 갈아끼우지 않으면 다음 저장이 또 409 다.
   */
  version: number;
}

/** DELETE /api/v1/stages/{stageId}?moveToStageId= */
export interface DeletedStage {
  deletedStageId: number;
  /** 이전된 스텝 수 — 스텝은 함께 삭제되지 않는다 (STG-003) */
  movedStepCount: number;
  /** `null` 이면 미소속(`stage_id = NULL`)으로 옮겼다는 뜻 */
  moveToStageId: number | null;
}

/**
 * 스테이지 삭제(`DELETE /stages/{stageId}?moveToStageId=`)에서 미소속을 뜻하는 `0`.
 *
 * ⚠️ **순서 변경의 `orders[].stageId` 와 규약이 다르다** — 그쪽 미소속은 `null` 이다 (2026-08-11 BE 확인).
 *    같은 "미소속"인데 표현이 갈리므로 상수를 돌려쓰지 않는다.
 */
export const UNASSIGN_STEPS = 0;

/* ─────────────── 순서 변경 (스테이지 · 스텝 공용 규칙) ─────────────── */

/**
 * 순서 변경 요청 한 줄.
 *
 * ⚠️ **낙관적 락을 항목마다 검사한다.** 하나라도 어긋나면 요청 전체가 409 로 롤백된다 —
 *    부분 적용은 없다. 이 API 에는 `overwrite` 가 없어 409 면 재조회 후 다시 끌어야 한다.
 * ⚠️ **전체 최종 순서를 보내야 한다.** 일부만 보내면 보내지 않은 항목과 `sort_order` 가 겹친다.
 */
export interface StageOrderItem {
  stageId: number;
  sortOrder: number;
  /** 이 스테이지를 조회했을 때의 `version` */
  version: number;
}

/** PATCH /api/v1/projects/{projectId}/stages/order */
export interface StageOrderResult {
  stageId: number;
  sortOrder: number;
  /** ⚠️ 저장 후의 새 값 */
  version: number;
}

export interface StepOrderItem {
  stepId: number;
  /**
   * 옮길 스테이지. **미소속은 `null` 이다** (2026-08-11 BE 확인 · `0` 이 아니다).
   *
   * ⚠️ 항상 보낸다 — 보드 전체의 최종 배치를 싣는 API 라 생략할 자리가 없다.
   */
  stageId: number | null;
  /**
   * ⚠️ **프로젝트 단위 통번호다** (2026-08-11 BE 확인) — 스테이지마다 1부터 다시 세지 않는다.
   *
   * 그래서 **스테이지 순서만 바꿔도 스텝 번호가 전부 밀린다.** 단계를 끌었으면
   * 스텝 순서 API 도 함께 보내야 한다 (`StageManageModal.toStepPlan`).
   */
  sortOrder: number;
  version: number;
}

/** PATCH /api/v1/projects/{projectId}/steps/order */
export interface StepOrderResult {
  stepId: number;
  /** 요청과 마찬가지로 **미소속은 `null`** 이다 */
  stageId: number | null;
  sortOrder: number;
  /** ⚠️ 저장 후의 새 값 */
  version: number;
}

/* ─────────────── 스텝 생성 · 수정 · 삭제 · 완료 ─────────────── */

export interface CreateStepRequest {
  name: string;
  /** 미지정이면 미소속(`stageId: null`) 스텝이 된다 */
  stageId?: number;
  /** YYYY-MM-DD */
  startedOn?: string;
  /** YYYY-MM-DD */
  endedOn?: string;
  /** 책임자 **사번** — 작업자가 아니다 */
  ownerUserId?: string;
}

/** POST /api/v1/projects/{projectId}/steps — 상태는 항상 `NOT_STARTED` 로 시작한다 */
export interface CreatedStep {
  stepId: number;
  projectId: number;
  stageId: number | null;
  name: string;
  status: StepStatus;
  sortOrder: number;
  startedOn: string | null;
  endedOn: string | null;
  owner: StepOwner | null;
  createdAt: string;
}

/**
 * PATCH /api/v1/steps/{stepId} 요청.
 *
 * ⚠️ **전체 덮어쓰기다. 생략한 필드는 유지가 아니라 해제된다** —
 *    폼 전체(`name` · `startedOn` · `endedOn` · `ownerUserId`)를 매번 보낸다.
 * ⛔ `stageId` 는 받지 않는다 (2026-08-09) — 보내도 무시된다.
 */
export interface UpdateStepRequest {
  name: string;
  startedOn?: string;
  endedOn?: string;
  ownerUserId?: string;
  /** 조회에서 받은 값을 그대로 싣는다. 누락하면 400 */
  version: number;
  overwrite?: boolean;
}

/** PATCH /api/v1/steps/{stepId} */
export interface UpdatedStep {
  stepId: number;
  name: string;
  /** 수정 대상이 아니라 **현재값 에코**다 (미소속이면 `null`) */
  stageId: number | null;
  startedOn: string | null;
  endedOn: string | null;
  owner: StepOwner | null;
  updatedAt: string;
  /** ⚠️ 저장 후의 새 값 */
  version: number;
}

/** DELETE /api/v1/steps/{stepId} */
export interface DeletedStep {
  deletedStepId: number;
  /** `moveBlockIds` 로 살려서 옮긴 블록 수 */
  movedBlockCount: number;
  deletedBlockCount: number;
  /** ⛔ 이슈는 선택지가 없다 — 스텝을 지우면 무조건 함께 삭제된다 (STP-013) */
  deletedIssueCount: number;
}

/** 스텝 완료 시 남은 미완료 이슈를 어떻게 할지 */
export type OpenIssueAction = 'KEEP' | 'CLOSE';

/** POST /api/v1/steps/{stepId}/complete */
export interface CompletedStep {
  stepId: number;
  status: StepStatus;
  /** 완료 시점의 미완료 이슈 수 */
  openIssueCount: number;
  openIssueAction: OpenIssueAction;
  /** 함께 종료된 이슈 수 (`KEEP` 이면 0) */
  closedIssueCount: number;
  completedBy: StepOwner | null;
  completedAt: string;
}
