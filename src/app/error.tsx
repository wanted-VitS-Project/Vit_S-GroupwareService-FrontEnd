'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h1>문제가 발생했습니다</h1>
      <p>잠시 후 다시 시도해주세요. 문제가 계속되면 담당자에게 문의해주세요.</p>
      <button type="button" onClick={reset}>
        다시 시도
      </button>
    </div>
  );
}
