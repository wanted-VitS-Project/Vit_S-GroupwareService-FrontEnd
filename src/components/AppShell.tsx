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
 *
 * 셸은 **화면 높이에 고정**된다 (`h-screen` + `overflow-hidden`).
 * 문서가 통째로 굴러가면 내용이 길어질 때 헤더 · 사이드바까지 화면 밖으로 밀려난다.
 * 스크롤은 본문 안쪽에서만 일어나게 하고, 높이를 자식에게 넘겨주려면
 * 중간 flex 래퍼마다 `min-h-0` 이 필요하다 — 없으면 flex 자식이 내용만큼 부풀어
 * `overflow-y-auto` 가 걸린 영역이 넘치지 않아 스크롤바가 생기지 않는다.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_LAYOUT_PATHS.some((path) => isUnder(pathname, path));

  if (isBare) return <>{children}</>;

  // 프로젝트 상세는 자기 레이아웃에서 여백을 잡는다 — main 의 패딩을 빼준다
  const isProject = isProjectScope(pathname);

  return (
    <CurrentUserProvider>
      <div className="flex h-screen overflow-hidden">
        {!isProject && <Sidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          {/*
            프로젝트 상세는 자기 레이아웃이 사이드바 · 스크롤 영역을 다시 나눈다 —
            여기서 스크롤을 잡으면 `ProjectSidebar` 까지 함께 밀린다
          */}
          <main
            className={`min-h-0 min-w-0 flex-1 bg-slate-50 ${
              isProject ? '' : 'overflow-y-auto p-6'
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}
