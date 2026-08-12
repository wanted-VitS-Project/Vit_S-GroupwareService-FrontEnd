import type { Metadata } from 'next';
import { Suspense } from 'react';

import ProjectListSkeleton from '@/components/project/ProjectListSkeleton';
import MyProjectList from '@/features/project/MyProjectList';

/** 없으면 전역 제목(`VitaS`)이 그대로 상속돼 탭 · 북마크에서 화면을 구분할 수 없다 */
export const metadata: Metadata = {
  title: '내 프로젝트',
};

export default function ProjectsPage() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  return (
    <Suspense fallback={<ProjectListSkeleton rows={10} />}>
      <MyProjectList />
    </Suspense>
  );
}
