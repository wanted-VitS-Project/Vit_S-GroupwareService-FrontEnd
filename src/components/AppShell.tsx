'use client';

import { usePathname } from 'next/navigation';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { BARE_LAYOUT_PATHS } from '@/constants/menu';

/**
 * 공통 레이아웃 분기.
 * 로그인 · 권한 없음 화면은 사이드바 없이 페이지만 그린다.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_LAYOUT_PATHS.some((path) => pathname.startsWith(path));

  if (isBare) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="min-w-0 flex-1 bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}
