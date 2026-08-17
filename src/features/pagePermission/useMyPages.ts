'use client';

import { useContext, useMemo } from 'react';

import { FIXED_BY_ROLE, MENU_ORDER, type MenuItem } from '@/constants/menu';
import type { Role } from '@/features/auth/types';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

import { toMenuItems } from './catalog';
import { MyPagesContext } from './MyPagesProvider';
import type { MyPage, PagePermission } from './types';

/** `/my/pages` 원본이 필요할 때 (접근 가드 · 권한 표시) */
export function useMyPages() {
  const value = useContext(MyPagesContext);

  if (!value) {
    throw new Error('useMyPages 는 MyPagesProvider 안에서만 쓴다.');
  }
  return value;
}

/**
 * 사이드바에 실제로 그려지는 한 줄.
 *
 * `catalog.ts` 의 `PageMenuItem` 과 달리 두 값이 **선택**이다 —
 * 고정 항목(대시보드 · 전사 관리 …)은 `pageCode` 가 없어 등급 판단 대상이 아니고,
 * 접근 가드가 그냥 통과시킨다.
 */
export interface ResolvedMenuItem extends MenuItem {
  pageCode?: string;
  permission?: PagePermission;
}

/**
 * 사이드바 · 헤더가 함께 쓰는 **완성된 메뉴 목록**.
 * `/my/pages` 동적 항목에 고정 항목을 섞고 `MENU_ORDER` 로 한 줄로 세운다.
 */
export function useMenuItems(): {
  items: ResolvedMenuItem[];
  status: ReturnType<typeof useMyPages>['status'];
  refetch: () => void;
} {
  const { role } = useCurrentUser();
  const { pages, status, refetch } = useMyPages();

  const items = useMemo(() => buildMenuItems(role, pages), [role, pages]);

  return { items, status, refetch };
}

/**
 * `/my/pages` 응답 + 고정 항목 → **화면에 그릴 순서 그대로의 메뉴**.
 *
 * 훅 밖으로 빼 둔 이유가 있다 — 세션을 확인하는 동안 그리는 셸(`AppShellSkeleton`)이
 * 캐시된 응답으로 **같은 목록**을 만들어야 한다. 조립 규칙이 두 벌이면 새로고침할 때
 * 메뉴가 미묘하게 달라져 자리가 흔들린다.
 */
export function buildMenuItems(
  role: Role,
  pages: MyPage[],
): ResolvedMenuItem[] {
  {
    const dynamic = toMenuItems(pages);
    /**
     * 같은 화면이 두 줄로 나오지 않게 한다 —
     * 고정으로 둔 항목의 `pageCode` 가 나중에 확인돼 동적 메뉴로 내려오면
     * 걷어내는 것을 잊기 쉽다. 응답이 있으면 **응답 쪽을 남긴다.**
     */
    const dynamicHrefs = new Set(dynamic.map((item) => item.href));
    const fixed: MenuItem[] = FIXED_BY_ROLE[role].filter(
      (item) => !dynamicHrefs.has(item.href),
    );

    /** `MENU_ORDER` 에 없는 항목은 뒤로 (등록을 잊어도 메뉴가 사라지진 않는다) */
    const rank = (href: string) => {
      const index = MENU_ORDER.indexOf(href);
      return index === -1 ? MENU_ORDER.length : index;
    };

    return [...fixed, ...dynamic].sort((a, b) => rank(a.href) - rank(b.href));
  }
}
