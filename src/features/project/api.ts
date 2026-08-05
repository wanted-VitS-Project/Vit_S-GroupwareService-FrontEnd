import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type { ProjectDetail, ProjectStage, ProjectStep } from './types';

export function getProject(projectId: number | string) {
  return api.get<ProjectDetail>(ENDPOINTS.projects.detail(projectId));
}

/** 응답이 `{ stages: [...] }` 로 한 겹 더 감싸져 있어 여기서 벗겨 반환한다 */
export function getProjectStages(projectId: number | string) {
  return api
    .get<{ stages: ProjectStage[] }>(ENDPOINTS.projects.stages(projectId))
    .then((data) => data.stages);
}

/** 응답이 `{ steps: [...] }` 로 한 겹 더 감싸져 있어 여기서 벗겨 반환한다 */
export function getProjectSteps(projectId: number | string) {
  return api
    .get<{ steps: ProjectStep[] }>(ENDPOINTS.projects.steps(projectId))
    .then((data) => data.steps);
}
