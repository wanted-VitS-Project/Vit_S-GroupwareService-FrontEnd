/**
 * 사이드바 **고정** 메뉴 정의.
 *
 * 페이지 권한이 붙는 항목은 여기 없다 — `GET /my/pages` 응답이 그린다
 * (`features/pagePermission/catalog.ts`). 여기 남은 것은
 * **카탈로그 `pageCode` 가 아직 확인되지 않은** 항목들이다.
 *
 * ⚠️ 코드 값이 확인되는 대로 하나씩 `PAGE_ROUTES` 로 옮기고 여기서 지운다.
 * ⚠️ 메뉴 노출은 화면 편의일 뿐 권한 통제가 아니다. 실제 차단은 백엔드가 한다.
 */

import type { Role } from '@/features/auth/types';

export type MenuIcon =
  'dashboard' | 'approval' | 'search' | 'plus' | 'folder' | 'card' | 'settings';

export interface MenuItem {
  label: string;
  href: string;
  icon: MenuIcon;
  /** 하위 경로까지 활성으로 보지 않고 정확히 일치할 때만 활성 */
  exact?: boolean;
}

const DASHBOARD: MenuItem = {
  label: '대시보드',
  href: '/',
  icon: 'dashboard',
  exact: true,
};

/** 동적 메뉴(`/my/pages`) **앞**에 붙는 고정 항목 */
export const FIXED_HEAD_BY_ROLE: Record<Role, MenuItem[]> = {
  // ADMIN 은 결재 대상이 아니라 결재 관리를 쓰지 않는다
  ADMIN: [DASHBOARD],
  MASTER: [
    DASHBOARD,
    { label: '결재 관리', href: '/approvals', icon: 'approval' },
  ],
  MEMBER: [
    DASHBOARD,
    { label: '결재 관리', href: '/approvals', icon: 'approval' },
  ],
};

/**
 * 동적 메뉴 **뒤**에 붙는 고정 항목 (ADMIN 전용).
 *
 * `MY_PROJECT` 는 ADMIN 에게 내려오지 않는다(시스템 계정이라 참여자가 될 수 없다) —
 * 전사 프로젝트 조회는 그와 별개 화면이라 고정으로 둔다.
 */
export const FIXED_TAIL_BY_ROLE: Record<Role, MenuItem[]> = {
  ADMIN: [
    { label: '프로젝트 조회', href: '/projects', icon: 'folder' },
    // 하위 관리 화면(사원 · 부서 · 카테고리 …)은 전사 관리 허브에서 타고 들어간다
    { label: '전사 관리', href: '/settings', icon: 'settings' },
  ],
  MASTER: [],
  MEMBER: [],
};

/** 공통 레이아웃(사이드바 · 헤더)을 씌우지 않는 경로 */
export const BARE_LAYOUT_PATHS = ['/login', '/forbidden'];

/**
 * 프로젝트 전용 사이드바를 쓰는 경로인지 판단한다.
 * `/projects/{id}` 와 그 하위 화면은 공통 사이드바 대신 `ProjectSidebar` + 헤더만 쓴다.
 *
 * `/projects` (목록) · `/projects/new` (생성) 는 공통 사이드바를 그대로 쓴다.
 */
export function isProjectScope(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);

  return (
    segments[0] === 'projects' &&
    segments[1] !== undefined &&
    segments[1] !== 'new'
  );
}

/**
 * 경로가 base 에 속하는지 판단한다.
 * `/login-help` 가 `/login` 에 걸리지 않도록 `/` 경계까지 확인한다.
 */
export function isUnder(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * 현재 경로에 해당하는 메뉴 하나.
 * `/projects/new` 처럼 여러 항목이 걸리면 가장 구체적인(경로가 긴) 것을 고른다.
 *
 * 메뉴가 역할 고정이 아니라 `/my/pages` 응답까지 합쳐진 목록이라,
 * 역할이 아니라 **완성된 목록**을 받는다 (`useMenuItems()`).
 */
export function findActiveMenu<T extends MenuItem>(
  pathname: string,
  items: T[],
) {
  return items
    .filter((item) =>
      item.exact ? pathname === item.href : isUnder(pathname, item.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
