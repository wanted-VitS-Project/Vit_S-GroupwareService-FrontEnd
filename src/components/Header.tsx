'use client';

import { usePathname } from 'next/navigation';

import ProfileMenu from '@/components/ProfileMenu';
import { findActiveMenu, isProjectScope, isUnder } from '@/constants/menu';
import type { Role } from '@/features/auth/types';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import NotificationBell from '@/features/notification/NotificationBell';

/** 헤더 제목. 메뉴에 없는 화면은 별도로 적어둔다. */
const EXTRA_TITLES: Record<string, string> = {
  '/notifications': '알림',
  '/mypage': '마이페이지',
  '/settings': '설정',
};

function titleOf(pathname: string, role: Role) {
  const menu = findActiveMenu(pathname, role);
  if (menu) return menu.label;

  const extra = Object.keys(EXTRA_TITLES).find((path) =>
    isUnder(pathname, path),
  );
  return extra ? EXTRA_TITLES[extra] : '';
}

export default function Header() {
  const pathname = usePathname();
  const user = useCurrentUser();
  /**
   * 프로젝트 상세는 왼쪽 `ProjectSidebar` 가 흰색이라 화면에서 어두운 면이 사라진다 —
   * 그 자리를 헤더가 대신 든다. 색만 바뀌고 구조는 같다.
   */
  const isDark = isProjectScope(pathname);

  return (
    // 사이드바 로고 줄과 같은 60px — 두 영역의 밑줄이 한 선으로 이어진다
    <header
      className={`flex h-15 shrink-0 items-center justify-between border-b pr-8 ${
        isDark
          ? 'border-bg-sidebar-hover bg-bg-sidebar pl-0'
          : 'border-border-default bg-bg-header pl-8'
      }`}
    >
      <div className="flex h-full min-w-0 items-center">
        {/*
          프로젝트 화면에는 공통 사이드바가 없어 로고가 사라진다 —
          홈과 같은 자리(왼쪽 위)에 로고 칸을 둔다.
          폭 `w-70` 은 아래 `ProjectSidebar` 와 같은 값이라 오른쪽 선이 사이드바
          경계선과 **한 줄로 이어진다** — 폭을 바꿀 때는 둘을 함께 고친다.
        */}
        {isDark && (
          <span className="flex h-full w-70 shrink-0 items-center border-r border-bg-sidebar-hover px-6">
            <span className="text-heading-l font-bold tracking-tight text-text-white">
              Vita<span className="text-text-primary-blue">S</span>
            </span>
          </span>
        )}

        <h1
          className={`truncate text-heading-l font-semibold ${
            isDark ? 'pl-8 text-text-white' : 'text-text-primary'
          }`}
        >
          {titleOf(pathname, user.role)}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell isDark={isDark} />
        {/* 로그아웃은 이 안 드롭다운에 있다 — 헤더에 버튼으로 내놓지 않는다 */}
        <ProfileMenu isDark={isDark} />
      </div>
    </header>
  );
}
