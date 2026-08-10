/**
 * 페이지 카탈로그 ↔ 프론트 라우트 매핑.
 *
 * 백엔드는 `pageCode` 만 주고 **어느 화면인지는 모른다** — 경로 · 아이콘은 프론트 몫이다.
 * 반대로 노출 여부 · 등급은 전적으로 백엔드(`GET /my/pages`) 몫이다.
 * 즉 이 파일은 "무엇을 보여줄지" 가 아니라 **"어디로 보낼지"** 만 정한다.
 *
 * ℹ️ 카탈로그는 11개지만 **권한이 걸린 페이지는 `BIDDING` · `FINANCE` 둘뿐**이고
 *    나머지는 전원 열람이라 `constants/menu.ts` 고정 항목으로 둔다 (2026-08-10 백엔드 확인).
 *    그래서 여기 매핑은 4개면 충분하다 — 모르는 코드가 오면 경로를 몰라 메뉴에서 빠지고,
 *    개발 모드에서 콘솔로 알린다.
 */

import { isUnder, type MenuIcon, type MenuItem } from '@/constants/menu';

import type { MyPage, PagePermission } from './types';

interface PageRoute {
  href: string;
  icon: MenuIcon;
  /** 하위 경로까지 활성으로 보지 않고 정확히 일치할 때만 활성 */
  exact?: boolean;
}

/**
 * 확인된 `pageCode` → 라우트.
 * 키 순서가 곧 사이드바 노출 순서다 (백엔드 응답 순서를 따르지 않는다).
 */
export const PAGE_ROUTES: Record<string, PageRoute> = {
  BIDDING: { href: '/notices', icon: 'search' },
  PROJECT_CREATE: { href: '/projects/new', icon: 'plus', exact: true },
  MY_PROJECT: { href: '/projects', icon: 'folder' },
  FINANCE: { href: '/finance/invoices', icon: 'card' },
};

const PAGE_ORDER = Object.keys(PAGE_ROUTES);

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
      unmapped.push(page.pageCode);
      return [];
    }

    return [
      {
        ...route,
        // 라벨은 백엔드 표시명을 그대로 쓴다 — 이름이 바뀌어도 배포가 필요 없다
        label: page.name,
        pageCode: page.pageCode,
        permission: page.permission,
      },
    ];
  });

  if (unmapped.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      `[pagePermission] 경로를 모르는 pageCode 라 메뉴에서 빠졌습니다: ${unmapped.join(', ')}\n` +
        'src/features/pagePermission/catalog.ts 의 PAGE_ROUTES 에 추가하세요.',
    );
  }

  return items.sort(
    (a, b) => PAGE_ORDER.indexOf(a.pageCode) - PAGE_ORDER.indexOf(b.pageCode),
  );
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
