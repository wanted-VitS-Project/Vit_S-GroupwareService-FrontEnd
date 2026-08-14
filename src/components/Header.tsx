'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Logo from '@/components/Logo';
import ProfileMenu from '@/components/ProfileMenu';
import {
  findActiveMenu,
  isProjectScope,
  isUnder,
  projectScopeUpLink,
} from '@/constants/menu';
import NotificationBell from '@/features/notification/NotificationBell';
import {
  type ResolvedMenuItem,
  useMenuItems,
} from '@/features/pagePermission/useMyPages';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_WIDTH,
  useProjectSidebarCollapse,
} from '@/features/project/SidebarCollapse';

/**
 * 화면 제목(`h1`). 눈에는 보이지 않고 **보조기술에만** 읽힌다.
 * 메뉴에 없는 화면은 별도로 적어둔다.
 */
const EXTRA_TITLES: Record<string, string> = {
  '/notifications': '알림',
  '/mypage': '마이페이지',
  '/settings': '전사 관리',
};

function titleOf(pathname: string, items: ResolvedMenuItem[]) {
  const menu = findActiveMenu(pathname, items);
  if (menu) return menu.label;

  const extra = Object.keys(EXTRA_TITLES).find((path) =>
    isUnder(pathname, path),
  );
  /*
   * 제목이 화면에 없던 시절에는 빈 문자열이 그냥 빈 자리였지만, 이제는 `h1` 이 통째로
   * 비어 스크린리더가 제목을 못 읽는다 — 못 찾으면 서비스 이름이라도 남긴다.
   */
  return extra ? EXTRA_TITLES[extra] : 'VitaS';
}

export default function Header() {
  const pathname = usePathname();
  const { items } = useMenuItems();
  /**
   * 프로젝트 상세는 왼쪽 `ProjectSidebar` 가 흰색이라 화면에서 어두운 면이 사라진다 —
   * 그 자리를 헤더가 대신 든다. 색만 바뀌고 구조는 같다.
   */
  const isDark = isProjectScope(pathname);
  const { isCollapsed } = useProjectSidebarCollapse();
  /** 프로젝트 화면에서만 쓰인다 — 로고가 곧 이탈 경로다 */
  const upLink = projectScopeUpLink(pathname);

  return (
    // 사이드바 로고 줄과 같은 52px — 두 영역의 밑줄이 한 선으로 이어진다
    <header
      className={`flex h-13 shrink-0 items-center justify-between border-b pr-8 ${
        isDark
          ? 'border-bg-sidebar-hover bg-bg-sidebar pl-0'
          : 'border-border-default bg-bg-header pl-8'
      }`}
    >
      <div className="flex h-full min-w-0 items-center">
        {/*
          프로젝트 화면에는 공통 사이드바가 없어 로고가 사라진다 —
          홈과 같은 자리(왼쪽 위)에 로고 칸을 둔다.
          폭은 아래 `ProjectSidebar` 와 같은 값(`SidebarCollapse` 의 상수)이라 오른쪽 선이
          사이드바 경계선과 **한 줄로 이어진다** — 사이드바를 접으면 여기도 같이 줄어든다.
          접힌 폭(58px)에는 `VitaS` 가 안 들어가 `S` 한 글자만 남긴다.
        */}
        {isDark && (
          <Link
            /*
             * 나가는 곳은 **한 칸 위**다 — 스텝 화면이면 그 프로젝트로, 프로젝트 화면이면 홈으로.
             * 왼쪽 `ProjectSidebar` 의 이탈 링크와 같은 규칙을 쓴다 (`projectScopeUpLink`).
             */
            href={upLink.href}
            aria-label={`${upLink.label} 이동`}
            /*
             * 사이드바와 **같은 시간 · 같은 곡선**이어야 두 경계선이 나란히 움직인다.
             * `padding` 도 함께 전환한다 — 폭만 전환하면 좌우 여백이 첫 프레임에 툭 바뀌어
             * 로고 글자가 한 번 튄다.
             */
            className={`flex h-full shrink-0 items-center overflow-hidden border-r border-bg-sidebar-hover transition-[width,padding] duration-200 ease-out motion-reduce:transition-none ${
              isCollapsed
                ? `${SIDEBAR_COLLAPSED_WIDTH} justify-center px-0`
                : `${SIDEBAR_WIDTH} px-6`
            }`}
          >
            {/* 접히면 `S` 한 글자짜리 로고로 바뀐다 — 서비스 이름은 위 `aria-label` 이 든다 */}
            <Logo variant={isCollapsed ? 'mark' : 'full'} />
          </Link>
        )}

        {/*
          제목은 **화면에 적지 않는다** — 왼쪽 메뉴 · 프로젝트 사이드바가 이미 현재 위치를
          말해주고 있어, 헤더에 한 번 더 적으면 같은 말이 두 번 보인다.
          다만 지우기만 하면 화면에 `h1` 이 없어져 스크린리더의 제목 탐색(H)으로
          현재 화면을 짚을 수 없다 — 눈에만 안 보이게 남긴다.
        */}
        <h1 className="sr-only">{titleOf(pathname, items)}</h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell isDark={isDark} />
        {/* 로그아웃은 이 안 드롭다운에 있다 — 헤더에 버튼으로 내놓지 않는다 */}
        <ProfileMenu isDark={isDark} />
      </div>
    </header>
  );
}
