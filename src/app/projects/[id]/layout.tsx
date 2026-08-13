import ProjectSidebar from '@/components/ProjectSidebar';

/**
 * 프로젝트 상세 중첩 레이아웃.
 * 공통 사이드바 자리를 `ProjectSidebar` 가 대신한다. (AppShell 에서 분기)
 *
 * 본문 영역에는 여백을 주지 않는다 — 스텝 탭바처럼 화면 끝까지 닿아야 하는
 * 요소가 있어서, 여백은 각 화면이 직접 잡는다.
 *
 * 높이는 셸에서 내려온 화면 높이를 그대로 쓴다 (`AppShell` 참고).
 * 사이드바는 고정이고 오른쪽 영역만 굴러간다 — 스텝 화면처럼 자기 안에서 다시
 * 스크롤 영역을 나누는 경우에는 이 래퍼가 넘치지 않아 조용히 비켜준다.
 *
 * ⚠️ `scrollbar-gutter: stable` 로 스크롤바 자리를 항상 비워 둔다 —
 *    재조회 중 내용이 짧아졌다 길어지면 스크롤바가 사라졌다 생기면서
 *    본문 폭이 바뀌어 화면이 좌우로 흔들린다 (`AppShell` 의 `main` 과 같은 이유).
 */
export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      <ProjectSidebar />
      <div className="min-w-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
