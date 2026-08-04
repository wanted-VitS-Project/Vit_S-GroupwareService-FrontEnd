'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { findActiveMenu, isUnder, type Role } from '@/constants/menu';
import { logout } from '@/features/auth/api';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

/** 헤더 제목. 메뉴에 없는 화면은 별도로 적어둔다. */
const EXTRA_TITLES: Record<string, string> = {
  '/notifications': '알림',
  '/mypage': '마이페이지',
  '/settings': '설정',
};

function titleOf(pathname: string, role: Role | undefined) {
  if (!role) return '';

  const menu = findActiveMenu(pathname, role);
  if (menu) return menu.label;

  const extra = Object.keys(EXTRA_TITLES).find((path) =>
    isUnder(pathname, path),
  );
  return extra ? EXTRA_TITLES[extra] : '';
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    if (isPending) return;
    setIsPending(true);

    // 401(이미 만료)이든 성공이든 갈 곳은 로그인 화면이라 결과를 나누지 않는다
    await logout().catch(() => {});

    // refresh 로 라우터 캐시를 비워야 미들웨어가 만료된 쿠키를 다시 판단한다
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 px-6">
      <h1 className="font-bold">{titleOf(pathname, user?.role)}</h1>

      <div className="flex items-center gap-4 text-sm">
        <Link href="/notifications">알림</Link>
        <Link href="/mypage">내 정보</Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className="cursor-pointer text-slate-500 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          {isPending ? '로그아웃 중…' : '로그아웃'}
        </button>
      </div>
    </header>
  );
}
