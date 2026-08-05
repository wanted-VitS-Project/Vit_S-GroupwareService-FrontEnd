import ProjectSidebar from '@/components/ProjectSidebar';

/**
 * 프로젝트 상세 중첩 레이아웃.
 * 공통 사이드바 자리를 `ProjectSidebar` 가 대신한다. (AppShell 에서 분기)
 */
export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <ProjectSidebar />
      <div className="min-w-0 flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
