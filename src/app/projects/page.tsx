import type { Metadata } from 'next';
import { Suspense } from 'react';

import MyProjectList from '@/features/project/MyProjectList';
import ProjectPageSkeleton from '@/features/project/ProjectPageSkeleton';

/** 없으면 전역 제목(`VitaS`)이 그대로 상속돼 탭 · 북마크에서 화면을 구분할 수 없다 */
export const metadata: Metadata = {
  title: '내 프로젝트',
};

export default function ProjectsPage() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  /*
   * 폴백은 목록이 아니라 **화면 골격**이다 — 목록만 그리면 실제 화면이 뜨는 순간
   * 머리글 · 통계 카드 · 필터 높이만큼(300px 넘게) 목록이 아래로 내려앉는다
   */
  return (
    <Suspense fallback={<ProjectPageSkeleton rows={10} />}>
      <MyProjectList />
    </Suspense>
  );
}
