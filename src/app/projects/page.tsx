// SSR - 내 프로젝트: 목록 화면을 Suspense 로 감싸는 진입점.
import type { Metadata } from 'next';
import { Suspense } from 'react';

import MyProjectList from '@/features/project/MyProjectList';
import ProjectPageSkeleton from '@/features/project/ProjectPageSkeleton';

// 없으면 전역 제목(VitaS)이 상속돼 탭·북마크에서 화면을 구분할 수 없다.
export const metadata: Metadata = {
  title: '내 프로젝트',
};

export default function ProjectsPage() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다.
  // 폴백은 목록이 아니라 화면 골격이다 — 목록만 그리면 머리글·요약 카드·필터 높이만큼 목록이 내려앉는다.
  return (
    <Suspense fallback={<ProjectPageSkeleton rows={10} />}>
      <MyProjectList />
    </Suspense>
  );
}
