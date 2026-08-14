'use client';

import ProjectSummaryCards from '@/features/project/ProjectSummaryCards';

/**
 * 대시보드 상단 `프로젝트 요약`.
 *
 * 카드 · 건수 조회는 `내 프로젝트` 화면과 **같은 것**을 쓴다
 * (`ProjectSummaryCards` + `useProjectCounts`) — 예전에는 두 화면이 같은 카드를
 * 각자 그리고 같은 4콜을 각자 쏘았다. 여기 남는 것은 이 화면에서만 다른 값뿐이다.
 */
export default function DashboardSummary() {
  return <ProjectSummaryCards label="프로젝트 요약" />;
}
