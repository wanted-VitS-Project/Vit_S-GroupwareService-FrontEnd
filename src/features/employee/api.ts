import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  EmployeeListQuery,
  EmployeePage,
  PasswordResetResult,
} from './types';

/** 값이 있는 필터만 실어 보낸다 — 빈 문자열을 보내면 그 값으로 검색한다 */
function toSearchParams(query: EmployeeListQuery) {
  const params = new URLSearchParams();

  if (query.keyword) params.set('keyword', query.keyword);
  if (query.departmentId)
    params.set('departmentId', String(query.departmentId));
  if (query.role) params.set('role', query.role);
  if (query.status) params.set('status', query.status);
  if (query.resigned) params.set('resigned', 'true');
  if (query.page) params.set('page', String(query.page));
  if (query.size) params.set('size', String(query.size));

  return params.toString();
}

/** 인사관리용 목록 (ADMIN). 결재선 검색(`/employees/search`)과 다른 API 다 */
export function getEmployees(query: EmployeeListQuery, signal?: AbortSignal) {
  const search = toSearchParams(query);

  const path = search
    ? `${ENDPOINTS.employees.root}?${search}`
    : ENDPOINTS.employees.root;

  return api.get<EmployeePage>(path, signal);
}

/**
 * 비밀번호 재설정 — 1명이든 여러 명이든 같은 API 다.
 * 실패가 섞여도 200 이라 집계를 화면에 보여줘야 한다.
 */
export function resetPasswords(userIds: string[]) {
  return api.post<PasswordResetResult>(ENDPOINTS.accounts.passwordResets, {
    userIds,
  });
}
