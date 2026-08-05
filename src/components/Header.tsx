'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { findActiveMenu, isUnder } from '@/constants/menu';
import { logout } from '@/features/auth/api';
import type { Role } from '@/features/auth/types';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { ApiError } from '@/lib/api';

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
  const router = useRouter();
  const user = useCurrentUser();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    if (isPending) return;

    setError('');
    setIsPending(true);

    try {
      await logout();
    } catch (caught) {
      // 401 은 세션이 이미 없다는 뜻이라 성공과 같게 본다
      const isGone = caught instanceof ApiError && caught.status === 401;

      if (!isGone) {
        // 쿠키가 살아 있으므로 이동하면 안 된다. 이동해도 프록시가 되돌려 보낸다
        setError('로그아웃하지 못했습니다.');
        setIsPending(false);
        return;
      }
    }

    // refresh 로 라우터 캐시를 비워야 프록시가 쿠키를 다시 판단한다
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 px-6">
      <h1 className="font-bold">{titleOf(pathname, user.role)}</h1>

      <div className="flex items-center gap-4 text-sm">
        {error && (
          <span role="alert" className="text-rose-600">
            {error}
          </span>
        )}
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
