/**
 * 사이드바 **고정** 메뉴 정의.
 *
 * 메뉴는 `GET /my/pages` 응답이 그린다 (`features/pagePermission/catalog.ts`).
 * 여기 남은 것은 **카탈로그에 대응하는 코드가 없는** 항목뿐이다.
 *
 * ⚠️ 대응 코드가 생기면 `PAGE_ROUTES` 로 옮기고 여기서 지운다.
 * ⚠️ 메뉴 노출은 화면 편의일 뿐 권한 통제가 아니다. 실제 차단은 백엔드가 한다.
 */

import type { Role } from '@/features/auth/types';

export type MenuIcon =
  | 'dashboard'
  | 'approval'
  | 'search'
  | 'plus'
  | 'folder'
  | 'file'
  | 'card'
  | 'settings';

export interface MenuItem {
  label: string;
  href: string;
  icon: MenuIcon;
  /** 하위 경로까지 활성으로 보지 않고 정확히 일치할 때만 활성 */
  exact?: boolean;
}

/**
 * 사이드바 노출 **순서**의 유일한 기준 (`href` 기준).
 *
 * 동적 · 고정을 한 줄에 세워야 하는데 백엔드 응답 순서는 화면 흐름과 무관하고,
 * 고정 항목을 앞뒤로 붙이는 방식으로는 `프로젝트 조회` 를 `관리자` 앞에 둘 수 없다.
 * 그래서 합친 뒤 **이 배열 순서로 정렬한다** (여기 없는 항목은 뒤로 밀린다).
 */
export const MENU_ORDER = [
  '/',
  '/approvals',
  '/notices',
  '/projects/new',
  '/projects',
  '/files',
  '/finance',
  '/settings',
];

/** `내 파일` 은 두 역할이 같은 항목을 쓴다 — 라벨 · 경로를 두 벌 두지 않는다 */
const MY_FILE_MENU: MenuItem = {
  label: '내 파일',
  href: '/files',
  icon: 'file',
};

/**
 * `/my/pages` 로 대체되지 않는 고정 항목.
 *
 * `MY_PROJECT` 는 ADMIN 에게 내려오지 않는다 — 시스템 계정이라 프로젝트 참여자가
 * 될 수 없다. 전사 프로젝트 조회는 그와 별개 화면이라 고정으로 둔다.
 * `내 파일` 은 반대로 **ADMIN 만 뺀다** — 멤버가 될 수 없어 늘 빈 목록이다.
 * (`pageCode` 가 아직 응답에 없어 고정으로 둔 것이다 — `catalog.ts` 의 `MY_FILE` 참고)
 *
 * ⚠️ 같은 `href` 가 동적 메뉴에도 오면 `useMenuItems()` 가 이쪽을 걷어낸다 (중복 방지).
 */
export const FIXED_BY_ROLE: Record<Role, MenuItem[]> = {
  ADMIN: [{ label: '프로젝트 조회', href: '/projects', icon: 'folder' }],
  MASTER: [MY_FILE_MENU],
  MEMBER: [MY_FILE_MENU],
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
 * 프로젝트 화면에서 **한 칸 위**로 나가는 길.
 *
 * - 스텝 화면(`/projects/{id}/steps/{stepId}`) → 그 프로젝트(`/projects/{id}`)
 * - 그 밖의 프로젝트 화면 → 메인(`/`)
 *
 * 스텝에서 곧장 홈으로 튀면 스텝 사이를 오가던 사람이 매번 프로젝트를 다시 찾아 들어와야 한다.
 * `label` 은 조사가 붙은 채로 돌려준다 — `홈으로` / `프로젝트로` 가 갈리기 때문이다.
 */
export function projectScopeUpLink(pathname: string): {
  href: string;
  label: '홈으로' | '프로젝트로';
} {
  const segments = pathname.split('/').filter(Boolean);
  const isStepScope =
    segments[0] === 'projects' &&
    segments[1] !== undefined &&
    segments[2] === 'steps' &&
    segments[3] !== undefined;

  return isStepScope
    ? { href: `/projects/${segments[1]}`, label: '프로젝트로' }
    : { href: '/', label: '홈으로' };
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
