'use client';

import { useContext, useMemo } from 'react';

import {
  FIXED_HEAD_BY_ROLE,
  FIXED_TAIL_BY_ROLE,
  type MenuItem,
} from '@/constants/menu';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

import { toMenuItems } from './catalog';
import { MyPagesContext } from './MyPagesProvider';
import type { PagePermission } from './types';

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
 * 고정 앞 → `/my/pages` 동적 → 고정 뒤 순서로 이어 붙인다.
 */
export function useMenuItems(): {
  items: ResolvedMenuItem[];
  status: ReturnType<typeof useMyPages>['status'];
  refetch: () => void;
} {
  const { role } = useCurrentUser();
  const { pages, status, refetch } = useMyPages();

  const items = useMemo(
    () => [
      ...FIXED_HEAD_BY_ROLE[role],
      ...toMenuItems(pages),
      ...FIXED_TAIL_BY_ROLE[role],
    ],
    [role, pages],
  );

  return { items, status, refetch };
}
