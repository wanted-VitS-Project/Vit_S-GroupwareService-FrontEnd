import ProjectSettings from '@/features/project/settings/ProjectSettings';

// 프로젝트 설정 — 과업 정보·상태·사업 카테고리·참여자.
// 프로젝트 ID 는 경로에서만 오므로 여기서 꺼내 클라이언트 컴포넌트로 넘긴다.
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ProjectSettings projectId={id} />;
}
