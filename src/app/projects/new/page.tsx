import type { Metadata } from 'next';

import ProjectCreateForm from '@/features/project/ProjectCreateForm';

/** 없으면 전역 제목(`VitaS`)이 그대로 상속돼 탭 · 북마크에서 화면을 구분할 수 없다 */
export const metadata: Metadata = {
  title: '프로젝트 생성',
};

export default function Page() {
  return <ProjectCreateForm />;
}
