'use client';

// CSR - 대시보드 프로젝트 요약: 건수 카드는 내 프로젝트 화면과 같은 컴포넌트·같은 조회를 재사용한다.

import ProjectSummaryCards from '@/features/project/ProjectSummaryCards';

export default function DashboardSummary() {
  return <ProjectSummaryCards label="프로젝트 요약" />;
}
