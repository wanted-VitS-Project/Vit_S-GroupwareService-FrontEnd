'use client';

import { useEffect, useState } from 'react';

/**
 * 화면 오른쪽 아래에 잠깐 떴다 사라지는 알림. (공용)
 *
 * **뒤에서 끝난 일**을 알리는 용도다 — 휴지통 복구 · 영구 삭제처럼 화면은 이미 결과를
 * 보여 줬고 요청만 남아 있는 경우, 그 요청이 끝났는지 알릴 곳이 달리 없다.
 * 화면을 막고 답을 받아야 하는 확인은 여전히 `AlertDialog` 가 맡는다.
 *
 * 구독은 `AppShell` 의 `ToastHost` 한 곳뿐이고, 띄우는 쪽은 어디서나 `notifyToast()` 를 부른다 —
 * 컨텍스트를 화면마다 끼워 넣지 않으려고 전역 이벤트로 뒀다 (`issue:changed` 와 같은 방식).
 *
 * ⚠️ 네이티브 `<dialog>` 는 최상위 레이어에 떠서 토스트를 가린다.
 *    그래서 모달을 **닫은 뒤에** 띄운다 (낙관적 처리라 자연스럽게 그렇게 된다).
 */

export type ToastTone = 'success' | 'error';

export const TOAST_EVENT = 'app:toast';

/** 떠 있는 시간. 실패는 읽을 것이 많아 조금 더 둔다 */
const VISIBLE_MS: Record<ToastTone, number> = {
  success: 3_500,
  error: 6_000,
};

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

/** 같은 밀리초에 두 개가 떠도 key 가 겹치지 않게 한다 */
let nextToastId = 0;

/** 어디서나 부를 수 있다. 서버 렌더 중에는 아무 일도 하지 않는다 */
export function notifyToast(message: string, tone: ToastTone = 'success') {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<Omit<Toast, 'id'>>(TOAST_EVENT, {
      detail: { message, tone },
    }),
  );
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function receive(event: Event) {
      const { detail } = event as CustomEvent<Omit<Toast, 'id'>>;
      if (!detail?.message) return;

      const id = (nextToastId += 1);
      setToasts((prev) => [...prev, { id, ...detail }]);

      // 각자 자기 타이머로 사라진다 — 하나로 묶으면 뒤에 뜬 것이 먼저 지워진다
      setTimeout(
        () => setToasts((prev) => prev.filter((toast) => toast.id !== id)),
        VISIBLE_MS[detail.tone],
      );
    }

    window.addEventListener(TOAST_EVENT, receive);
    return () => window.removeEventListener(TOAST_EVENT, receive);
  }, []);

  return (
    <div
      // 비어 있을 때도 자리를 지운다 — `pointer-events-none` 이라 아래 화면을 막지 않는다
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto max-w-sm animate-panel-in rounded-lg border px-3.5 py-2.5 text-[11px] leading-snug font-medium shadow-lg motion-reduce:animate-none ${
            toast.tone === 'error'
              ? 'border-red-border bg-red-bg-soft text-text-danger'
              : 'border-border-default bg-white text-text-primary'
          }`}
        >
          <span className="flex items-start gap-2">
            <ToastIcon tone={toast.tone} />
            <span className="min-w-0 break-keep">{toast.message}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** 색만 다르면 색을 구별하지 못하는 사용자에게는 같아 보인다 — 모양도 가른다 */
function ToastIcon({ tone }: { tone: ToastTone }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`mt-px size-3.5 shrink-0 ${
        tone === 'error' ? 'text-text-danger' : 'text-text-primary-blue'
      }`}
    >
      {tone === 'error' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5M12 16h.01" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" />
        </>
      )}
    </svg>
  );
}
