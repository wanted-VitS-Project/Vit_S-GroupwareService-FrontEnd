import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  ProjectDetail,
  ProjectListItem,
  ProjectListQuery,
  ProjectMember,
  ProjectPage,
  ProjectStage,
  ProjectStatus,
  ProjectStep,
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
