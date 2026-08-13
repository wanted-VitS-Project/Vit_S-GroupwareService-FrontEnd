/**
 * 페이지 카탈로그 ↔ 프론트 라우트 매핑.
 *
 * 백엔드는 `pageCode` 만 주고 **어느 화면인지는 모른다** — 경로 · 아이콘은 프론트 몫이다.
 * 반대로 노출 여부 · 등급은 전적으로 백엔드(`GET /my/pages`) 몫이다.
 * 즉 이 파일은 "무엇을 보여줄지" 가 아니라 **"어디로 보낼지"** 만 정한다.
 *
 * ℹ️ 권한이 걸린 페이지는 `BIDDING` · `FINANCE` 둘뿐이고 나머지는 전원 열람이다
 *    (2026-08-10 백엔드 확인). 그래도 **노출 근거는 전부 `/my/pages` 로 통일**한다 —
 *    화면이 있는 코드는 여기 매핑해 두고, 고정 메뉴는 화면이 없는 것만 남긴다.
 *
 * ⚠️ 카탈로그 11개 중 아직 **화면이 없는 코드**는 `UNROUTED_PAGES` 에 이유와 함께 적어
 *    콘솔 경고를 막는다. 화면이 생기면 `PAGE_ROUTES` 로 옮긴다.
 */

import { isUnder, type MenuIcon, type MenuItem } from '@/constants/menu';

import type { MyPage, PagePermission } from './types';

interface PageRoute {
  href: string;
  icon: MenuIcon;
  /** 하위 경로까지 활성으로 보지 않고 정확히 일치할 때만 활성 */
  exact?: boolean;
  /**
   * 권한이 걸린 페이지 — **접근 가드가 검사하는 유일한 표시**다.
   *
   * 메뉴에 그리는 것과 접근을 막는 것은 다른 문제라 여기서 갈라둔다.
   * 이 표시가 없으면 가드가 `/my/pages` 응답을 기다리지 않는다 —
   * 전원 열람 화면까지 기다리게 하면 **모든 화면의 첫 렌더가 응답 속도에 묶인다.**
   */
  requiresPermission?: boolean;
  /**
   * 백엔드 표시명 대신 쓸 라벨. **꼭 필요한 코드에만** 둔다.
   *
   * 라벨은 원칙적으로 `/my/pages` 의 `name` 을 쓴다 — 이름이 바뀌어도 배포가 필요 없다.
   * 다만 `ADMIN_CONSOLE` 은 백엔드 이름이 `관리자` 라 사이드바에서 **역할(권한 등급)로
   * 읽힌다.** 이 화면은 전사 관리 허브라 브레드크럼 · 설정 화면과도 문구가 어긋난다.
   */
  label?: string;
}

/**
 * 확인된 `pageCode` → 라우트.
 * 노출 **순서**는 여기가 아니라 `MENU_ORDER` 가 정한다 (고정 항목까지 함께 세워야 해서).
 */
export const PAGE_ROUTES: Record<string, PageRoute> = {
  HOME: { href: '/', icon: 'dashboard', exact: true },
  APPROVAL: { href: '/approvals', icon: 'approval' },
  BIDDING: { href: '/notices', icon: 'search', requiresPermission: true },
  PROJECT_CREATE: { href: '/projects/new', icon: 'plus', exact: true },
  MY_PROJECT: { href: '/projects', icon: 'folder' },
  // 하위 화면(입출금 내역 · 세금계산서 · 정산 현황)은 이 허브에서 타고 들어간다
  FINANCE: {
    href: '/finance',
    icon: 'card',
    requiresPermission: true,
  },
  // 하위 관리 화면(사원 · 부서 · 카테고리 …)은 이 허브에서 타고 들어간다
  ADMIN_CONSOLE: { href: '/settings', icon: 'settings', label: '전사 관리' },
};

/**
 * 화면이 없거나 사이드바에 두지 않기로 한 코드 — **경고를 내지 않는다.**
 * 값은 "왜 빠졌는지" 다. 화면이 생기면 여기서 지우고 `PAGE_ROUTES` 로 옮긴다.
 */
const UNROUTED_PAGES: Record<string, string> = {
  NOTIFICATION: '헤더 알림 벨로 들어간다 — 사이드바 항목이 아니다',
  COMPANY_STATUS: '전사 현황 화면 미구현',
  TEMPLATE: '템플릿 관리 화면 미구현',
  // 전원에게 내려오는 개인 설정이다. 관리자 허브(/settings)는 `ADMIN_CONSOLE` 쪽
  SETTINGS: '개인 설정 화면 미구현',
};

/** 메뉴 항목 + 접근 등급 — 사이드바는 노출에, 가드는 등급에 쓴다 */
export interface PageMenuItem extends MenuItem {
  pageCode: string;
  permission: PagePermission;
}

/**
 * `/my/pages` 응답을 사이드바 메뉴로 바꾼다.
 *
 * 경로를 모르는 코드는 **버튼을 만들지 않는다** — 눌러도 갈 곳이 없어
 * 404 로 보내는 것보다 안 그리는 편이 정직하다.
 */
export function toMenuItems(pages: MyPage[]): PageMenuItem[] {
  const unmapped: string[] = [];

  const items = pages.flatMap((page) => {
    const route = PAGE_ROUTES[page.pageCode];

    if (!route) {
      // 이유를 적어 둔 코드는 이미 아는 것이라 경고하지 않는다
      if (!(page.pageCode in UNROUTED_PAGES)) unmapped.push(page.pageCode);
      return [];
    }

    return [
      {
        ...route,
        // 라벨은 백엔드 표시명을 쓴다 — 이름이 바뀌어도 배포가 필요 없다.
        // 덮어쓴 코드만 예외다 (`PageRoute.label` 주석 참고)
        label: route.label ?? page.name,
        pageCode: page.pageCode,
        permission: page.permission,
      },
    ];
  });

  if (unmapped.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      `[pagePermission] 처음 보는 pageCode 라 메뉴에서 빠졌습니다: ${unmapped.join(', ')}\n` +
        'src/features/pagePermission/catalog.ts 의 PAGE_ROUTES(화면 있음) 또는 UNROUTED_PAGES(화면 없음) 에 추가하세요.',
    );
  }

  // 정렬은 고정 항목까지 섞인 뒤에 해야 한다 — `useMenuItems()` 가 `MENU_ORDER` 로 한다
  return items;
}

/**
 * 경로가 어느 `pageCode` 에 속하는지 찾는다 (`toMenuItems` 의 역방향).
 * `/projects/new` 처럼 여러 항목이 걸리면 가장 구체적인(경로가 긴) 것을 고른다.
 */
export function findPageCode(pathname: string) {
  return Object.entries(PAGE_ROUTES)
    .filter(([, route]) =>
      route.exact ? pathname === route.href : isUnder(pathname, route.href),
    )
    .sort(([, a], [, b]) => b.href.length - a.href.length)[0]?.[0];
}

/**
 * 이 경로가 **권한 판단 대상**인지.
 *
 * 매핑이 있다고 전부 대상은 아니다 — 대시보드 · 결재 관리처럼 전원 열람인 화면도
 * 메뉴를 그리려고 매핑돼 있다. 가드는 `requiresPermission` 이 붙은 경로만 본다.
 */
export function isPageGated(pathname: string) {
  const pageCode = findPageCode(pathname);

  return pageCode ? PAGE_ROUTES[pageCode].requiresPermission === true : false;
}

/**
 * 이 경로에 들어가도 되는지 판단한다.
 *
 * - 매핑 없는 경로(고정 메뉴 · 마이페이지 등) → 판단 대상이 아니다
 * - 응답에 없는 페이지 → 프론트가 막지 않는다. 백엔드가 403 으로 돌려보낸다
 * - `permission: NONE` → **여기서 막는다** (메뉴에는 보이지만 들어갈 수 없다)
 */
export function isPageDenied(pathname: string, pages: MyPage[]) {
  const pageCode = findPageCode(pathname);
  if (!pageCode) return false;

  const page = pages.find((item) => item.pageCode === pageCode);

  return page?.permission === 'NONE';
}
