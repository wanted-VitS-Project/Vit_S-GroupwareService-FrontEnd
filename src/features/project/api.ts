import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  CompletedStep,
  CreatedStage,
  CreatedStep,
  CreateStageRequest,
  CreateStepRequest,
  DeletedStage,
  DeletedStep,
  OpenIssueAction,
  ProjectDetail,
  ProjectListItem,
  ProjectListQuery,
  ProjectMember,
  ProjectPage,
  ProjectStage,
  ProjectStatus,
  ProjectStep,
  StageOrderItem,
  StageOrderResult,
  StepOrderItem,
  StepOrderResult,
  UpdatedStage,
  UpdatedStep,
  UpdateStageRequest,
  UpdateStepRequest,
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
