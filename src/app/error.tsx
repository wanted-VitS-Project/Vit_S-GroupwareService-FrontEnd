'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      error.tsx
      <button onClick={reset}>다시 시도</button>
    </div>
  );
}
