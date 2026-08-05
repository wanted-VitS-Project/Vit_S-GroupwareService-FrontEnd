'use client';

import { useEffect } from 'react';

interface ModalProps {
  title: string;
  /** 없으면 닫을 수 없는 모달이다 (강제 흐름) */
  onClose?: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!onClose) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose?.();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={title}
      onClick={
        onClose &&
        ((event) => {
          // 오버레이를 직접 눌렀을 때만 닫는다
          if (event.target === event.currentTarget) onClose();
        })
      }
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="cursor-pointer text-slate-400 hover:text-slate-900"
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

/** 모달 하단 기본 버튼 */
export function ModalButton(props: React.ComponentProps<'button'>) {
  return (
    <button
      {...props}
      className="mt-6 w-full cursor-pointer rounded-lg bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    />
  );
}
