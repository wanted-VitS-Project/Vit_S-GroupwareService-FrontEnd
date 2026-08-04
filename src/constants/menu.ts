/**
 * 역할별 사이드바 메뉴 정의. 메뉴를 컴포넌트에 하드코딩하지 않는다.
 *
 * ⚠️ 메뉴 노출은 화면 편의일 뿐 권한 통제가 아니다. 실제 차단은 백엔드가 한다.
 */

// TODO: 로그인 연동되면 features/auth/types.ts 로 옮긴다
export type Role = 'ADMIN' | 'MASTER' | 'MEMBER';

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
const NOTICES: MenuItem = {
  label: '공고 조회',
  href: '/notices',
  icon: 'search',
};
const FINANCE: MenuItem = {
  label: '재무 관리',
  href: '/finance/invoices',
  icon: 'card',
};

/** ADMIN — 전체 프로젝트를 조회하고 조직 설정을 관리한다 (결재 대상이 아니다) */
const ADMIN_MENU: MenuItem[] = [
  DASHBOARD,
  NOTICES,
  { label: '프로젝트 조회', href: '/projects', icon: 'folder' },
  FINANCE,
  { label: '설정', href: '/settings', icon: 'settings' },
];

/**
 * MASTER(중간관리자) · MEMBER(사원) — 프로젝트를 직접 만들고 자기 프로젝트를 본다.
 * 두 역할의 메뉴는 같고, 항목별 접근 권한은 백엔드가 판단한다.
 * (권한 없이 들어가면 403 → /forbidden)
 */
const STAFF_MENU: MenuItem[] = [
  DASHBOARD,
  { label: '결재 관리', href: '/approvals', icon: 'approval' },
  NOTICES,
  { label: '프로젝트 생성', href: '/projects/new', icon: 'plus', exact: true },
  { label: '내 프로젝트', href: '/projects', icon: 'folder' },
  FINANCE,
];

export const MENU_BY_ROLE: Record<Role, MenuItem[]> = {
  ADMIN: ADMIN_MENU,
  MASTER: STAFF_MENU,
  MEMBER: STAFF_MENU,
};

/** 공통 레이아웃(사이드바 · 헤더)을 씌우지 않는 경로 */
export const BARE_LAYOUT_PATHS = ['/login', '/forbidden'];

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
 */
export function findActiveMenu(pathname: string, role: Role) {
  return MENU_BY_ROLE[role]
    .filter((item) =>
      item.exact ? pathname === item.href : isUnder(pathname, item.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
