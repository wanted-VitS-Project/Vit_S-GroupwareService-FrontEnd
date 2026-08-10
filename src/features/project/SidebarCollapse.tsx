'use client';

import { createContext, useContext, useMemo, useState } from 'react';

/**
 * 프로젝트 사이드바 접힘 상태.
 *
 * `ProjectSidebar` 혼자 들고 있을 수 없다 — 헤더 왼쪽 로고 칸이 사이드바와 **같은 폭**이라
 * 오른쪽 경계선이 한 줄로 이어진다. 한쪽만 줄면 선이 어긋난다.
 * 그래서 둘의 공통 조상인 `AppShell` 에 두고 양쪽이 같은 값을 읽는다.
 */

/** 펼쳤을 때 폭 (`w-70`) */
export const SIDEBAR_WIDTH = 'w-70';
/** 접었을 때 폭 (시안 58px = `w-14.5`) */
export const SIDEBAR_COLLAPSED_WIDTH = 'w-14.5';

interface SidebarCollapse {
  isCollapsed: boolean;
  toggle: () => void;
  expand: () => void;
}

const Context = createContext<SidebarCollapse | null>(null);

export function ProjectSidebarCollapseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const value = useMemo(
    () => ({
      isCollapsed,
      toggle: () => setIsCollapsed((collapsed) => !collapsed),
      expand: () => setIsCollapsed(false),
    }),
    [isCollapsed],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useProjectSidebarCollapse() {
  const value = useContext(Context);
  if (!value) {
    throw new Error(
      'useProjectSidebarCollapse 는 ProjectSidebarCollapseProvider 안에서만 쓸 수 있습니다.',
    );
  }
  return value;
}
