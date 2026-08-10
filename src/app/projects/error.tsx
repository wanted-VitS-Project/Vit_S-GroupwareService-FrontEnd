'use client';

import { ErrorStateTwoButton } from '@/components/ErrorState';

/** 프로젝트 하위 페이지 렌더링 중 발생한 예외를 공용 오류 화면으로 안내한다. */
export default function ProjectsError({ reset }: { reset: () => void }) {
  return (
    <ErrorStateTwoButton
      title="프로젝트 페이지를 불러오지 못했습니다."
      description="일시적인 오류일 수 있습니다. 잠시 후 다시 시도해주세요."
      retryLabel="다시 시도"
      onRetry={reset}
    />
  );
}
