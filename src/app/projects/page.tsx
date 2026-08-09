import { Suspense } from 'react';

import ProjectListSkeleton from '@/components/project/ProjectListSkeleton';
import MyProjectList from '@/features/project/MyProjectList';

export default function ProjectsPage() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  return (
    <Suspense fallback={<ProjectListSkeleton rows={10} />}>
      <MyProjectList />
    </Suspense>
  );
}
