import ProjectTabs from '@/components/ProjectTabs';

/**
 * 프로젝트 전체 화면(이슈 · 문서함 · 이미지 · 휴지통) 중첩 레이아웃.
 *
 * **라우트 그룹 `(overview)` 이라 URL 에는 나타나지 않는다** — `/projects/{id}` 는 그대로다.
 * 그룹으로 감싼 이유는 형제인 `steps` · `settings` · `settlement` 에 이 탭바가 붙으면 안 되기 때문이다
 * (스텝 화면에는 자기 탭바 `StepTabs` 가 따로 있다).
 *
 * 탭바는 화면 폭에 꽉 채워 붙이고, 여백은 아래 본문 영역에만 준다.
 * `scrollbar-gutter: stable` 은 스텝 레이아웃과 같은 이유다 — 목록이 늘어 스크롤바가 생길 때
 * 폭이 줄어 내용이 왼쪽으로 밀리는 흔들림을 막는다.
 */
export default function ProjectOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <ProjectTabs />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
}
