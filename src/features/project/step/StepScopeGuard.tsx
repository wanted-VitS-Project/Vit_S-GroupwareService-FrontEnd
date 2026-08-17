'use client';

import { useParams } from 'next/navigation';

import { ErrorStateOneButton } from '@/components/ErrorState';
import { useProjectSteps } from '@/features/project/useProjectSteps';
import { PROJECT_ROUTES } from '@/features/project/routes';

// 스텝 화면이 그 프로젝트의 스텝인지 확인하는 문지기.
// 블록·이슈·활동 기록은 모두 stepId 하나만으로 조회한다
// (GET /steps/{stepId}/blocks 등 — 경로에 프로젝트가 없다).
// 그래서 주소창에서 /projects/1/steps/5 의 1 만 2 로 고쳐도 요청은 그대로 나가고,
// 프로젝트 2의 껍데기 안에 프로젝트 1의 블록이 그려진다. 캐시 문제가 아니라
// 소속을 아무도 확인하지 않아서다.
// 판정 근거는 사이드바가 이미 받아 둔 스텝 목록이다 (['project-steps', projectId]
// 같은 캐시) — 이 문지기 때문에 요청이 더 나가지는 않는다.
// 모르는 동안에는 막지 않는다. 목록이 아직 없거나 실패했으면 그대로 통과시킨다 —
// 판정 전에 가로막으면 정상 진입에도 오류 화면이 한 번 스친다. 조회에 성공했고
// 그 안에 없을 때만 막는다.
export default function StepScopeGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string; stepId: string }>();
  const { data: steps } = useProjectSteps(params.id);

  const isKnownForeign =
    steps !== undefined &&
    !steps.some((step) => String(step.stepId) === params.stepId);

  if (!isKnownForeign) return <>{children}</>;

  return (
    <ErrorStateOneButton
      title="이 프로젝트의 스텝이 아닙니다."
      description="주소가 잘못되었거나 스텝이 다른 프로젝트로 옮겨졌을 수 있습니다."
      actionLabel="프로젝트로 이동"
      actionHref={PROJECT_ROUTES.detail(params.id)}
    />
  );
}
