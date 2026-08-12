import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  AddMembersResult,
  CreateEmployeeGroupRequest,
  EmployeeGroup,
  GroupMemberPage,
  RemoveMemberResult,
  UpdateEmployeeGroupRequest,
} from './types';

/**
 * 그룹 목록 (전체 사용자). 페이징 없음 · 이름 오름차순.
 * `{ content: [...] }` 래퍼를 벗겨 배열만 반환한다 (부서 목록과 같은 규약).
 */
export function getEmployeeGroups(keyword?: string, signal?: AbortSignal) {
  // 빈 문자열을 보내면 그 값으로 검색한다 — 값이 있을 때만 싣는다
  const search = keyword
    ? `?${new URLSearchParams({ keyword }).toString()}`
    : '';

  return api
    .get<{
      content: EmployeeGroup[];
    }>(`${ENDPOINTS.employeeGroups.root}${search}`, signal)
    .then((data) => data.content);
}

/** 그룹 생성 (ADMIN). 빈 그룹을 만든 뒤 구성원을 따로 추가하는 2단계다 */
export function createEmployeeGroup(body: CreateEmployeeGroupRequest) {
  return api.post<EmployeeGroup>(ENDPOINTS.employeeGroups.root, body);
}

/**
 * 그룹 수정 (ADMIN). **보낸 필드만** 바뀐다 —
 * 호출 측이 바뀐 필드만 담아야 한다. 하나도 없으면 400 이다.
 */
export function updateEmployeeGroup(
  groupId: number,
  body: UpdateEmployeeGroupRequest,
) {
  return api.patch<EmployeeGroup>(
    ENDPOINTS.employeeGroups.detail(groupId),
    body,
  );
}

/**
 * 그룹 삭제 (ADMIN).
 *
 * ⚠️ 부서 · 직급과 달리 **구성원이 있어도 삭제된다** (매핑 CASCADE).
 * 막아주는 409 가 없으므로 확인 모달이 인원수를 보여줘야 한다.
 */
export function deleteEmployeeGroup(groupId: number) {
  return api.delete<null>(ENDPOINTS.employeeGroups.detail(groupId));
}

/** 구성원 목록 (전체 사용자). 이름 오름차순 · 그룹 정보가 함께 온다 */
export function getGroupMembers(groupId: number, signal?: AbortSignal) {
  return api.get<GroupMemberPage>(
    ENDPOINTS.employeeGroups.members(groupId),
    signal,
  );
}

/**
 * 구성원 추가 (ADMIN). **멱등**이라 이미 소속인 사번은 조용히 skip 된다.
 *
 * ⚠️ 없는 사번 · 시스템 계정이 하나라도 섞이면 **요청 전체가 거부된다**
 * (`ADD_MEMBER_REJECTED_CODES`). 부분 성공이 아니라서 "몇 명은 됐다" 로 안내하면 안 된다.
 */
export function addGroupMembers(groupId: number, userIds: string[]) {
  return api.post<AddMembersResult>(ENDPOINTS.employeeGroups.members(groupId), {
    userIds,
  });
}

/** 구성원 제거 (ADMIN). 다건 API 가 없어 **한 명씩** 부른다 */
export function removeGroupMember(groupId: number, userId: string) {
  return api.delete<RemoveMemberResult>(
    ENDPOINTS.employeeGroups.member(groupId, userId),
  );
}
