import type { Role } from '@/features/auth/types';

/**
 * 페이지 접근 등급.
 * `NONE` 은 "메뉴는 보이되 들어갈 수 없다" 는 뜻이다 — 메뉴에서 빼라는 뜻이 아니다.
 */
export type PagePermission = 'NONE' | 'VIEWER' | 'EDITOR';

/** 부여 화면에서 고를 수 있는 등급 — `NONE` 은 회수(DELETE)로 표현한다 */
export type GrantablePermission = Exclude<PagePermission, 'NONE'>;

/**
 * 접근 근거.
 * `GRANTED` 만 회수할 수 있다 — 나머지는 전역 권한 · 기본값이라 화면에서 손댈 수 없다.
 */
export type PageAccessSource =
  'GRANTED' | 'GLOBAL_ROLE' | 'ADMIN_ONLY' | 'DEFAULT';

/** GET /my/pages — 사이드바 노출의 유일한 근거 */
export interface MyPage {
  pageCode: string;
  /** 백엔드가 주는 표시명. 프론트 라벨보다 이 값을 우선한다 */
  name: string;
  permission: PagePermission;
  source: PageAccessSource;
}

/** GET /pages — 권한 부여 대상 페이지(BIDDING · FINANCE) */
export interface PageSummary {
  pageCode: string;
  name: string;
  description: string | null;
  /** 접근 가능 총 인원 = 명시 부여 + 전역 권한 */
  accessCount: number;
  grantedCount: number;
  globalRoleCount: number;
  lastModifiedAt: string | null;
}

/** GET /pages/{pageCode}/permissions — 접근 가능자 한 명 */
export interface PageAccessor {
  userId: string;
  name: string;
  departmentPath: string | null;
  jobPositionName: string | null;
  role: Role;
  permission: PagePermission;
  source: PageAccessSource;
  /** `false` 면 회수 대상이 아니다 (전역 권한으로 보는 사람) */
  revocable: boolean;
}

export interface PageAccessorList {
  pageCode: string;
  name: string;
  content: PageAccessor[];
  grantedCount: number;
  globalRoleCount: number;
}

export interface GrantPermissionItem {
  userId: string;
  permission: GrantablePermission;
}

/** POST 응답 — 부여 · 갱신 · 변화없음이 나뉘어 온다 */
export interface GrantPermissionsResult {
  pageCode: string;
  requestedCount: number;
  grantedCount: number;
  updatedCount: number;
  unchangedCount: number;
}

/** DELETE 응답 — 회수해도 전역 권한으로 계속 보일 수 있다 */
export interface RevokePermissionResult {
  pageCode: string;
  userId: string;
  stillAccessible: boolean;
  accessSource: PageAccessSource | null;
}
