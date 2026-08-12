'use client';

import { ErrorStateTwoButton } from '@/components/ErrorState';

/**
 * 렌더 중 던져진 오류를 받는다.
 *
 * 일시적인 실패일 수 있어 **다시 해볼 길**(`reset`)을 함께 둔다 —
 * `reset` 은 새로고침이 아니라 이 구간만 다시 그리는 것이라 화면이 덜 끊긴다.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorStateTwoButton
      title="데이터를 불러오지 못했습니다."
      description="잠시 후 다시 시도해주세요."
      onRetry={reset}
    />
  );
}
