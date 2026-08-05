'use client';

import { usePathname } from 'next/navigation';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { BARE_LAYOUT_PATHS, isProjectScope, isUnder } from '@/constants/menu';
import CurrentUserProvider from '@/features/auth/CurrentUserProvider';

/**
 * 공통 레이아웃 분기.
 * - 로그인 · 권한 없음 화면: 사이드바 · 헤더 없이 페이지만 그린다
 * - 프로젝트 상세(`/projects/{id}/**`): 공통 사이드바를 빼고 헤더만 쓴다.
 *   왼쪽 사이드바는 `projects/[id]/layout.tsx` 의 `ProjectSidebar` 가 맡는다
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_LAYOUT_PATHS.some((path) => isUnder(pathname, path));

  if (isBare) return <>{children}</>;

  // 프로젝트 상세는 자기 레이아웃에서 여백을 잡는다 — main 의 패딩을 빼준다
  const isProject = isProjectScope(pathname);

  return (
    <CurrentUserProvider>
      <div className="flex min-h-screen">
        {!isProject && <Sidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main
            className={`min-w-0 flex-1 bg-slate-50 ${isProject ? '' : 'p-6'}`}
          >
            {children}
          </main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}
