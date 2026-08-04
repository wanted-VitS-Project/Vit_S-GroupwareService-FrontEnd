'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { findActiveMenu, isUnder, type Role } from '@/constants/menu';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

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
  const { role } = useCurrentUser();

  return (
    <header className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 px-6">
      <h1 className="font-bold">{titleOf(pathname, role)}</h1>

      <div className="flex items-center gap-4 text-sm">
        <Link href="/notifications">알림</Link>
        <Link href="/mypage">내 정보</Link>
      </div>
    </header>
  );
}
