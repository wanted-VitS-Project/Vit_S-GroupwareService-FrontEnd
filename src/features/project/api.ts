import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  ProjectDetail,
  ProjectMember,
  ProjectStage,
  ProjectStep,
} from './types';

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
