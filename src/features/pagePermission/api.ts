import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  GrantPermissionItem,
  GrantPermissionsResult,
  MyPage,
  PageAccessorList,
  PageSummary,
  RevokePermissionResult,
} from './types';

/**
 * 내 페이지 목록 (로그인 사용자 전체).
 * 사이드바가 이 응답만 그린다. 프론트가 메뉴 노출 규칙을 갖지 않는다.
 */
export function getMyPages(signal?: AbortSignal) {
  return api
    .get<{ content: MyPage[] }>(ENDPOINTS.pages.mine, signal)
    .then((data) => data.content);
}

/** 권한 부여 대상 페이지 목록 (ADMIN). getMyPages 와 반환 집합이 다르다 */
export function getPages(signal?: AbortSignal) {
  return api
    .get<{ content: PageSummary[] }>(ENDPOINTS.pages.root, signal)
    .then((data) => data.content);
}

/**
 * 페이지 접근 가능자 목록 (ADMIN).
 * 명시 부여자와 전역 권한 열람자를 함께 주고 revocable 로 갈린다.
 */
export function getPageAccessors(pageCode: string, signal?: AbortSignal) {
  return api.get<PageAccessorList>(
    ENDPOINTS.pages.permissions(pageCode),
    signal,
  );
}

/**
 * 권한 부여 · 등급 변경 (같은 API 다).
 * 전체 교체가 아니라 요청에 없는 사용자는 그대로 남는다.
 */
export function grantPagePermissions(
  pageCode: string,
  permissions: GrantPermissionItem[],
) {
  return api.post<GrantPermissionsResult>(
    ENDPOINTS.pages.permissions(pageCode),
    { permissions },
  );
}

/** 권한 회수. 전역 권한이 있으면 회수해도 계속 보인다 */
export function revokePagePermission(pageCode: string, userId: string) {
  return api.delete<RevokePermissionResult>(
    ENDPOINTS.pages.permission(pageCode, userId),
  );
}
