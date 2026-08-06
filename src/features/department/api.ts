import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from './types';

/** 페이징 없음 · 생성 순. `{ content: [...] }` 래퍼를 벗겨 배열만 반환한다 */
export function getDepartments(signal?: AbortSignal) {
  return api
    .get<{ content: Department[] }>(ENDPOINTS.departments.root, signal)
    .then((data) => data.content);
}

/** 최상위 · 하위 공용 — `parentId` 유무로 갈린다 */
export function createDepartment(body: CreateDepartmentRequest) {
  return api.post<Department>(ENDPOINTS.departments.root, body);
}

export function updateDepartment(
  departmentId: number,
  body: UpdateDepartmentRequest,
) {
  return api.patch<Department>(
    ENDPOINTS.departments.detail(departmentId),
    body,
  );
}

/** 하드 삭제. 직속 사원 · 하위 부서가 있으면 409 */
export function deleteDepartment(departmentId: number) {
  return api.delete<void>(ENDPOINTS.departments.detail(departmentId));
}
