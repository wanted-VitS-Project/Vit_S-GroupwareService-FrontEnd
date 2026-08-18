'use client';

import { useContext, useMemo } from 'react';

import { FIXED_BY_ROLE, MENU_ORDER, type MenuItem } from '@/constants/menu';
import type { Role } from '@/features/auth/types';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

import { toMenuItems } from './catalog';
import { MyPagesContext } from './MyPagesProvider';
import type { MyPage, PagePermission } from './types';

/** /my/pages 원본이 필요할 때 (접근 가드 · 권한 표시) */
export function useMyPages() {
  const value = useContext(MyPagesContext);

  if (!value) {
    throw new Error('useMyPages 는 MyPagesProvider 안에서만 쓴다.');
  }
  return value;
}

/**
 * 사이드바에 실제로 그려지는 한 줄.
 * 고정 항목은 pageCode 가 없어 등급 판단 대상이 아니다.
 */
export interface ResolvedMenuItem extends MenuItem {
  pageCode?: string;
  permission?: PagePermission;
}

/**
 * 사이드바 · 헤더가 함께 쓰는 완성된 메뉴 목록.
 * 동적 항목에 고정 항목을 섞고 MENU_ORDER 로 한 줄로 세운다.
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
 * /my/pages 응답과 고정 항목을 화면에 그릴 순서대로 세운다.
 * 셸 스켈레톤도 같은 규칙을 써야 새로고침할 때 메뉴 자리가 흔들리지 않는다.
 */
export function buildMenuItems(
  role: Role,
  pages: MyPage[],
): ResolvedMenuItem[] {
  {
    const dynamic = toMenuItems(pages);
    /**
     * 같은 화면이 두 줄로 나오지 않게 한다.
     * 고정 항목의 pageCode 가 나중에 내려오면 응답 쪽을 남긴다.
     */
    const dynamicHrefs = new Set(dynamic.map((item) => item.href));
    const fixed: MenuItem[] = FIXED_BY_ROLE[role].filter(
      (item) => !dynamicHrefs.has(item.href),
    );

    /** MENU_ORDER 에 없는 항목은 뒤로 보낸다 */
    const rank = (href: string) => {
      const index = MENU_ORDER.indexOf(href);
      return index === -1 ? MENU_ORDER.length : index;
    };

    return [...fixed, ...dynamic].sort((a, b) => rank(a.href) - rank(b.href));
  }
}
