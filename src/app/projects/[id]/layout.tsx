import ProjectSidebar from '@/components/ProjectSidebar';

/**
 * 프로젝트 상세 중첩 레이아웃.
 * 공통 사이드바 자리를 `ProjectSidebar` 가 대신한다. (AppShell 에서 분기)
 *
 * 본문 영역에는 여백을 주지 않는다 — 스텝 탭바처럼 화면 끝까지 닿아야 하는
 * 요소가 있어서, 여백은 각 화면이 직접 잡는다.
 */
export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <ProjectSidebar />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
