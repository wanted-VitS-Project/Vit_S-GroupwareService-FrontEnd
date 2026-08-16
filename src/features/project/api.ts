import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  AddedMember,
  AddMemberRequest,
  AppliedStepPermissions,
  ClosedProject,
  CloseProjectRequest,
  CompletedStep,
  CreatedProject,
  CreatedStage,
  CreatedStep,
  CreateProjectRequest,
  CreateStageRequest,
  CreateStepRequest,
  DeletedStage,
  DeletedStep,
  LinkedBusinessCategories,
  OpenIssueAction,
  ProjectDetail,
  ProjectListItem,
  ProjectListQuery,
  ProjectMember,
  ProjectPage,
  ProjectPermission,
  ProjectStage,
  ProjectStatus,
  ProjectStep,
  StageOrderItem,
  StageOrderResult,
  StepOrderItem,
  StepOrderResult,
  StepPermission,
  StepPermissionEntry,
  StepPermissionResult,
  UpdatedMember,
  UpdatedProject,
  UpdatedProjectStatus,
  UpdatedStage,
  UpdatedStep,
  UpdatedStepStatus,
  UpdateProjectRequest,
  UpdateProjectStatusRequest,
  UpdateStageRequest,
  UpdateStepRequest,
  UpdateStepStatusRequest,
} from './types';

/** 값이 있는 필터만 실어 보낸다 — 빈 문자열을 보내면 그 값으로 검색한다 */
function toSearchParams(query: ProjectListQuery) {
  const params = new URLSearchParams();

  if (query.status) params.set('status', query.status);
  if (query.businessCategoryId !== undefined) {
    params.set('businessCategoryId', String(query.businessCategoryId));
  }
  if (query.startedOnFrom) params.set('startedOnFrom', query.startedOnFrom);
  if (query.startedOnTo) params.set('startedOnTo', query.startedOnTo);
  if (query.keyword) params.set('keyword', query.keyword);
  // page 는 0 이 유효한 값이라 falsy 로 거르지 않는다
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.size) params.set('size', String(query.size));

  return params.toString();
}

/**
 * 내 프로젝트 목록. (PRJ-013 · PRJ-015)
 *
 * ⚠️ 권한이 없는 프로젝트는 403 이 아니라 **목록에서 빠진다** —
 * 일반 사용자는 참여 중인 건만, `MASTER` · `ADMIN` 은 전 건을 본다.
 * 그래서 화면이 역할별로 목록을 걸러낼 필요가 없다.
 */
export function getProjects(
  query: ProjectListQuery = {},
  signal?: AbortSignal,
) {
  const search = toSearchParams(query);
  const path = search
    ? `${ENDPOINTS.projects.root}?${search}`
    : ENDPOINTS.projects.root;

  return api.get<ProjectPage<ProjectListItem>>(path, signal);
}

/**
 * 상태별 건수 하나. 집계 API 가 따로 없어 **가장 작은 페이지를 받아 `totalElements` 만 쓴다**.
 * `status` 를 빼면 전체 건수다.
 */
export function getProjectCount(status?: ProjectStatus, signal?: AbortSignal) {
  return getProjects({ status, page: 0, size: 1 }, signal).then(
    (page) => page.totalElements,
  );
}

export function getProject(projectId: number | string, signal?: AbortSignal) {
  return api.get<ProjectDetail>(ENDPOINTS.projects.detail(projectId), signal);
}

/** 응답이 `{ stages: [...] }` 로 한 겹 더 감싸져 있어 여기서 벗겨 반환한다 */
export function getProjectStages(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api
    .get<{
      stages: ProjectStage[];
    }>(ENDPOINTS.projects.stages(projectId), signal)
    .then((data) => data.stages);
}

/** 응답이 `{ steps: [...] }` 로 한 겹 더 감싸져 있어 여기서 벗겨 반환한다 */
export function getProjectSteps(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api
    .get<{ steps: ProjectStep[] }>(ENDPOINTS.projects.steps(projectId), signal)
    .then((data) => data.steps);
}

/** 담당자 지정과 사이드바에서 함께 쓰는 프로젝트 참여자 목록 */
export function getProjectMembers(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api
    .get<{ members: ProjectMember[] }>(
      ENDPOINTS.projects.members(projectId),
      signal,
    )
    .then((data) => data.members);
}

/* ─────────────── 참여자 추가 · 권한 변경 · 제거 ─────────────── */

/**
 * 참여자 추가. 프로젝트 EDITOR 전용. (.ai/API.md 125)
 *
 * ⛔ **한 명씩 부른다** — 팀 · 부서 일괄 추가 파라미터가 없다 (PRJ-009 · INV-07).
 * 🗑️ 삭제된 사원은 404 `USER_NOT_FOUND` 다 — 후보 목록에서 미리 빼야 한다.
 */
export function addProjectMember(
  projectId: number | string,
  body: AddMemberRequest,
  signal?: AbortSignal,
) {
  return api.post<AddedMember>(
    ENDPOINTS.projects.members(projectId),
    body,
    signal,
  );
}

/**
 * 참여자 권한 변경. 대상은 사번이 아니라 **참여자 행 ID** 다. (.ai/API.md 126)
 *
 * ⛔ 자기 자신은 403 `MEMBER_SELF_EDIT_DENIED` 다 — 화면이 미리 막지만
 *    목록이 낡아 뚫릴 수 있으므로 호출 측이 응답 코드도 함께 다뤄야 한다.
 * ⛔ `NONE` 은 폐기됐다 (2026-08-06) — 차단은 제거로 표현한다.
 */
export function updateProjectMemberPermission(
  projectId: number | string,
  memberId: number,
  permission: ProjectPermission,
  signal?: AbortSignal,
) {
  return api.patch<UpdatedMember>(
    ENDPOINTS.projects.member(projectId, memberId),
    { permission },
    signal,
  );
}

/**
 * 참여자 제거. (.ai/API.md 127)
 *
 * ⚠️ **하드 삭제다** — `project_member` 에 soft delete 컬럼이 없다.
 *    활동 기록는 이름 스냅샷을 들고 있어 고아가 되지 않는다.
 * ⭐ 그 프로젝트 스텝의 권한 오버라이드도 함께 지워진다 (2026-08-06 · 권한 누수 방지).
 */
export function removeProjectMember(
  projectId: number | string,
  memberId: number,
  signal?: AbortSignal,
) {
  return api.delete<null>(
    ENDPOINTS.projects.member(projectId, memberId),
    signal,
  );
}

/* ─────────────── 프로젝트 생성 ─────────────── */

/**
 * 프로젝트 직접 생성. 전체 사용자. (.ai/API.md 138 · PRJ-001)
 *
 * ⭐ 공고 연결 여부로 엔드포인트가 갈리지 않는다 — `bidNoticeId` 를 실으면 연결된 채로,
 *    빼면 공고 없이 만들어진다. `/projects/new` 화면은 **빼고 부른다**.
 * ⚠️ 응답에 `version` 이 없다 — 생성 직후 수정하려면 상세를 다시 읽는다.
 */
export function createProject(
  body: CreateProjectRequest,
  signal?: AbortSignal,
) {
  return api.post<CreatedProject>(ENDPOINTS.projects.root, body, signal);
}

/* ─────────────── 프로젝트 수정 · 상태 · 종결 ─────────────── */

/**
 * 프로젝트 수정. (.ai/API.md 129)
 *
 * ⚠️ **전체 덮어쓰기다** — 폼 전체를 매번 보낸다. 생략한 필드는 유지가 아니라 해제된다.
 * ⚠️ 낙관적 락 — 409 `PROJECT_VERSION_CONFLICT` 면 재조회 / 덮어쓰기를 사용자에게 묻는다.
 * ⚠️ 응답 `version` 은 저장 후의 새 값이라 화면 상태를 갈아끼워야 다음 저장이 통과한다.
 */
export function updateProject(
  projectId: number | string,
  body: UpdateProjectRequest,
  signal?: AbortSignal,
) {
  return api.patch<UpdatedProject>(
    ENDPOINTS.projects.detail(projectId),
    body,
    signal,
  );
}

/**
 * 프로젝트 상태 변경. (.ai/API.md 130)
 *
 * ⛔ **`CLOSED` 는 이 API 로 보낼 수 없다** — 종결(`closeProject`) 소관이고 400 이다.
 * ℹ️ 역방향 전이는 막지 않는다 (PRJ-003).
 */
export function updateProjectStatus(
  projectId: number | string,
  body: UpdateProjectStatusRequest,
  signal?: AbortSignal,
) {
  return api.patch<UpdatedProjectStatus>(
    ENDPOINTS.projects.status(projectId),
    body,
    signal,
  );
}

/**
 * 프로젝트 종결. 어느 상태에서든 부를 수 있다. (.ai/API.md 131)
 *
 * ⛔ **낙관적 락 대상이 아니다** — `version` 을 받지 않고 409 도 없다.
 * ℹ️ 종결해도 목록 · 활동 기록에서 사라지지 않는다 (PRJ-004) — 삭제와 다른 동작이다.
 */
export function closeProject(
  projectId: number | string,
  body: CloseProjectRequest,
  signal?: AbortSignal,
) {
  return api.post<ClosedProject>(
    ENDPOINTS.projects.close(projectId),
    body,
    signal,
  );
}

/**
 * 프로젝트 삭제. 프로젝트 `EDITOR` 전용. (.ai/API.md 139 · PRJ-014)
 *
 * ⛔ **`진행 전` 이면서 스텝이 0개일 때만** 지워진다 — 아니면 409 `PROJECT_DELETE_NOT_ALLOWED` 다.
 *    이미 굴러간 프로젝트는 삭제가 아니라 **종결**(`closeProject`)로 남긴다.
 * ℹ️ `deleted_at` 논리 삭제이고, **연결된 공고(`bid_notice_id`)는 비워진다** —
 *    그렇게 하지 않으면 UNIQUE 를 시체가 점유해 그 공고로 다시 만들 수 없다.
 * ℹ️ 블록 수는 보지 않는다 — 블록은 스텝에만 붙어 스텝이 0개면 블록도 0개다.
 */
export function deleteProject(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api.delete<null>(ENDPOINTS.projects.detail(projectId), signal);
}

/* ─────────────── 사업 카테고리 연결 · 해제 ─────────────── */

/**
 * 사업 카테고리 연결. (.ai/API.md 132)
 *
 * ⚠️ **이미 붙은 것이 하나라도 섞이면 요청 전체가 409** 다 — 호출 측이 걸러서 보낸다.
 * ℹ️ 응답이 **연결 후 전체 목록**이라 화면 상태를 통째로 교체한다.
 */
export function linkBusinessCategories(
  projectId: number | string,
  categoryIds: number[],
  signal?: AbortSignal,
) {
  return api
    .post<LinkedBusinessCategories>(
      ENDPOINTS.projects.businessCategories(projectId),
      { categoryIds },
      signal,
    )
    .then((data) => data.businessCategories);
}

/**
 * 사업 카테고리 해제. (.ai/API.md 133)
 *
 * ℹ️ 마스터가 삭제된 카테고리도 해제할 수 있다 — 연결 행은 그대로 남아 있다 (D-3).
 */
export function unlinkBusinessCategory(
  projectId: number | string,
  categoryId: number,
  signal?: AbortSignal,
) {
  return api.delete<null>(
    ENDPOINTS.projects.businessCategory(projectId, categoryId),
    signal,
  );
}

/* ─────────────── 스텝 권한 (오버라이드) ─────────────── */

/**
 * 스텝 권한 목록 조회. 프로젝트 EDITOR 전용. (.ai/API.md 134)
 *
 * 참여자 **전원**의 최종 판정이 온다 — `overridden: false` 는 차단이 아니라
 * **프로젝트 권한 상속**이다 (STP-011). 응답이 `{ permissions: [...] }` 라 여기서 벗긴다.
 */
export function getStepPermissions(
  stepId: number | string,
  signal?: AbortSignal,
) {
  return api
    .get<{
      permissions: StepPermissionEntry[];
    }>(ENDPOINTS.steps.permissions(stepId), signal)
    .then((data) => data.permissions);
}

/**
 * 스텝 권한 부여 · 변경. (.ai/API.md 135)
 *
 * ⚠️ **특정 스텝만 가리려면 `NONE` 행을 명시적으로 넣어야 한다** (STP-011) —
 *    행이 없는 상태는 차단이 아니라 상속이다.
 * ⛔ 자기 자신의 행은 바꿀 수 없다 (INV-10).
 */
export function setStepPermission(
  stepId: number | string,
  userId: string,
  permission: StepPermission,
  signal?: AbortSignal,
) {
  return api.put<StepPermissionResult>(
    ENDPOINTS.steps.permission(stepId, userId),
    { permission },
    signal,
  );
}

/**
 * 스텝 권한 회수 — 오버라이드 행을 지워 **프로젝트 권한 상속으로 되돌린다**. (.ai/API.md 136)
 *
 * ⚠️ 차단이 아니다. 응답 `permission` 은 회수 후 **상속된 등급**이다.
 * ℹ️ 행이 원래 없으면 404 `STEP_PERMISSION_NOT_FOUND` — 이미 상속 상태라는 뜻이다.
 */
export function revokeStepPermission(
  stepId: number | string,
  userId: string,
  signal?: AbortSignal,
) {
  return api.delete<StepPermissionResult>(
    ENDPOINTS.steps.permission(stepId, userId),
    signal,
  );
}

/**
 * 이 스테이지에 **새로 생길 스텝**의 권한 기본값 저장. (.ai/API.md 128)
 *
 * ⚠️ 기본값은 권한 판정에 쓰이지 않는다 — 스텝 생성 시 복사될 뿐이고
 *    **이미 만들어진 스텝에 소급되지 않는다.** 지금 적용하려면 `applyToExistingSteps` 를 쓴다
 *    (생략하면 백엔드 기본값이 `true` 라, 화면 뜻을 분명히 하려고 항상 실어 보낸다).
 */
export function applyStepPermissions(
  stageId: number | string,
  body: {
    userId: string;
    permission: StepPermission;
    applyToExistingSteps: boolean;
  },
  signal?: AbortSignal,
) {
  return api.post<AppliedStepPermissions>(
    ENDPOINTS.stages.stepPermissions(stageId),
    body,
    signal,
  );
}

/* ─────────────── 스테이지 생성 · 수정 · 삭제 ─────────────── */

/** 프로젝트 EDITOR 전용. `sortOrder` 를 비우면 서버가 맨 뒤(`max+1`)에 붙인다 */
export function createStage(
  projectId: number | string,
  body: CreateStageRequest,
  signal?: AbortSignal,
) {
  return api.post<CreatedStage>(
    ENDPOINTS.projects.stages(projectId),
    body,
    signal,
  );
}

/**
 * 스테이지 이름 수정.
 *
 * ⚠️ **낙관적 락이다.** 그 사이 남이 먼저 저장했으면 409 `STAGE_VERSION_CONFLICT` 가 온다 —
 *    부르는 쪽이 재조회 / 덮어쓰기(`overwrite: true`)를 사용자에게 물어야 한다.
 * ⚠️ 응답 `version` 은 **저장 후의 새 값**이라 화면 상태를 갈아끼워야 다음 저장이 통과한다.
 */
export function updateStage(
  stageId: number | string,
  body: UpdateStageRequest,
  signal?: AbortSignal,
) {
  return api.patch<UpdatedStage>(
    ENDPOINTS.stages.detail(stageId),
    body,
    signal,
  );
}

/**
 * 스테이지 삭제.
 *
 * ⛔ **하위 스텝은 함께 삭제되지 않는다** (STG-003) — 이전 대상이 없으면 400 이라
 *    `moveToStageId` 를 필수 인자로 둔다. `UNASSIGN_STEPS`(0) 면 미소속으로 옮긴다.
 * ⛔ 낙관적 락 대상이 아니다 — `version` 을 받지 않고 409 도 없다 (두 번 눌러도 결과가 같다).
 */
export function deleteStage(
  stageId: number | string,
  moveToStageId: number,
  signal?: AbortSignal,
) {
  const path = `${ENDPOINTS.stages.detail(stageId)}?moveToStageId=${moveToStageId}`;

  return api.delete<DeletedStage>(path, signal);
}

/**
 * 스테이지 순서 변경 (STG-002).
 *
 * ⚠️ **전체 최종 순서**를 보낸다 — 일부만 보내면 나머지와 `sort_order` 가 겹친다.
 * ⚠️ 낙관적 락은 **항목마다** 검사하고, 하나라도 어긋나면 요청 전체가 409 로 롤백된다.
 *    `overwrite` 가 없어 409 면 재조회 후 다시 끄는 수밖에 없다.
 *
 * `sort_order` 만 갱신한다 — 하위 스텝은 건드리지 않는다.
 */
export function updateStageOrder(
  projectId: number | string,
  orders: StageOrderItem[],
  signal?: AbortSignal,
) {
  return api
    .patch<{ stages: StageOrderResult[] }>(
      ENDPOINTS.projects.stagesOrder(projectId),
      { orders },
      signal,
    )
    .then((data) => data.stages);
}

/* ─────────────── 스텝 생성 · 수정 · 삭제 · 완료 ─────────────── */

/** 프로젝트 EDITOR 전용. `stageId` 를 비우면 미소속 스텝이 된다 */
export function createStep(
  projectId: number | string,
  body: CreateStepRequest,
  signal?: AbortSignal,
) {
  return api.post<CreatedStep>(
    ENDPOINTS.projects.steps(projectId),
    body,
    signal,
  );
}

/**
 * 스텝 수정. 권한은 프로젝트가 아니라 **스텝** 기준이다 (오버라이드가 있다).
 *
 * ⚠️ **전체 덮어쓰기다** — 폼 전체를 매번 보낸다. 생략한 필드는 해제된다.
 * ⚠️ 낙관적 락 — 409 `STEP_VERSION_CONFLICT` 면 재조회 / 덮어쓰기를 묻는다.
 */
export function updateStep(
  stepId: number | string,
  body: UpdateStepRequest,
  signal?: AbortSignal,
) {
  return api.patch<UpdatedStep>(ENDPOINTS.steps.detail(stepId), body, signal);
}

/**
 * 스텝 순서 · 소속 스테이지 변경 (STP-002).
 *
 * ⚠️ **위치를 바꾸는 유일한 경로다** — 스텝 수정(`PATCH /steps/{stepId}`)은 `stageId` 를 받지 않는다.
 * ⚠️ 보드 전체의 최종 배치를 보낸다. 낙관적 락은 항목별이고 실패하면 전체 롤백이다.
 * ⚠️ 선행 스텝 완료를 검사하지 않는다 — 끌어 놓은 대로 저장된다.
 *
 * 2026-08-11 BE 확인 3건:
 * - `sortOrder` 는 **프로젝트 단위 통번호**다 — 스테이지마다 1부터 다시 세지 않는다.
 *   그래서 **스테이지 순서만 바꿔도 이 API 를 함께 불러야** 스텝 번호가 맞는다.
 * - 미소속은 `stageId: null` 이다 (스테이지 삭제의 `moveToStageId=0` 과 규약이 다르다).
 * - 스텝 `version` 은 **`sort_order` 와 이름이 바뀔 때** 오른다 — 스테이지 순서 변경은
 *   스텝을 건드리지 않으므로 두 요청을 잇달아 보내도 뒤엣것이 헛돌지 않는다.
 */
export function updateStepOrder(
  projectId: number | string,
  orders: StepOrderItem[],
  signal?: AbortSignal,
) {
  return api
    .patch<{ steps: StepOrderResult[] }>(
      ENDPOINTS.projects.stepsOrder(projectId),
      { orders },
      signal,
    )
    .then((data) => data.steps);
}

/**
 * 스텝 삭제.
 *
 * `moveBlockIds` 를 비우면 하위 블록을 **전부 삭제**한다. 살릴 블록만 골라 넘기면
 * `moveToStepId` 로 옮긴다 (⚠️ 옮긴 블록의 이슈 연결은 끊긴다 · BLK-014).
 * ⛔ 이슈는 선택지가 없다 — 무조건 함께 삭제된다.
 */
export function deleteStep(
  stepId: number | string,
  options: { moveBlockIds?: number[]; moveToStepId?: number } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();

  // 빈 배열을 보내면 "옮길 블록 0개" 가 아니라 400 (`moveToStepId` 누락)이 된다
  if (options.moveBlockIds?.length) {
    params.set('moveBlockIds', options.moveBlockIds.join(','));
  }
  if (options.moveToStepId !== undefined) {
    params.set('moveToStepId', String(options.moveToStepId));
  }

  const search = params.toString();
  const path = search
    ? `${ENDPOINTS.steps.detail(stepId)}?${search}`
    : ENDPOINTS.steps.detail(stepId);

  return api.delete<DeletedStep>(path, signal);
}

/**
 * 스텝 상태 변경. 스텝 EDITOR 전용. (.ai/API.md 137)
 *
 * ⛔ **`DONE` 은 보낼 수 없다** — 미완료 이슈 처리 선택이 필요해 `completeStep` 소관이다.
 * ⚠️ 낙관적 락 — 409 `STEP_VERSION_CONFLICT` 면 재조회 / 덮어쓰기를 묻는다.
 * ⚠️ `DONE` 에서 되돌리면 완료 기록(`completedAt` · `completedBy`)도 함께 비워진다.
 *    스텝 상태는 **진척률과 별개 값**이다 (STP-004).
 */
export function updateStepStatus(
  stepId: number | string,
  body: UpdateStepStatusRequest,
  signal?: AbortSignal,
) {
  return api.patch<UpdatedStepStatus>(
    ENDPOINTS.steps.status(stepId),
    body,
    signal,
  );
}

/**
 * 스텝 완료 처리. **이슈가 미완료여도 완료할 수 있다** (STP-005).
 *
 * ℹ️ 멱등이다 — 이미 완료된 스텝을 다시 완료해도 완료자·완료시각을 덮어쓰지 않는다.
 *    그래서 낙관적 락 대상이 아니고 `version` 을 받지 않는다.
 */
export function completeStep(
  stepId: number | string,
  openIssueAction: OpenIssueAction,
  signal?: AbortSignal,
) {
  return api.post<CompletedStep>(
    ENDPOINTS.steps.complete(stepId),
    { openIssueAction },
    signal,
  );
}
