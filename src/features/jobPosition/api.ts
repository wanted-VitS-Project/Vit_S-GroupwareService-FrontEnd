import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  CreateJobPositionRequest,
  JobPosition,
  JobPositionEmployeePage,
  UpdateJobPositionRequest,
} from './types';

/** 페이징 없음. `{ content: [...] }` 래퍼를 벗겨 배열만 반환한다 */
export function getJobPositions(signal?: AbortSignal) {
  return api
    .get<{ content: JobPosition[] }>(ENDPOINTS.jobPositions.root, signal)
    .then((data) => data.content);
}

export function createJobPosition(body: CreateJobPositionRequest) {
  return api.post<JobPosition>(ENDPOINTS.jobPositions.root, body);
}

/** 직급명 수정과 순서 변경이 같은 API 다 */
export function updateJobPosition(
  jobPositionId: number,
  body: UpdateJobPositionRequest,
) {
  return api.patch<JobPosition>(
    ENDPOINTS.jobPositions.detail(jobPositionId),
    body,
  );
}

/**
 * 그 직급인 사원 목록 (ADMIN, .ai/API.md 90).
 * **0명이어도 404 가 아니라 빈 배열**이라 목록 유무로 분기하면 된다.
 */
export function getJobPositionEmployees(
  jobPositionId: number,
  signal?: AbortSignal,
) {
  return api.get<JobPositionEmployeePage>(
    ENDPOINTS.jobPositions.employees(jobPositionId),
    signal,
  );
}

/** 하드 삭제. 사용 인원이 있으면 409 `POS_IN_USE` */
export function deleteJobPosition(jobPositionId: number) {
  return api.delete<void>(ENDPOINTS.jobPositions.detail(jobPositionId));
}
