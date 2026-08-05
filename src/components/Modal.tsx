'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  title: string;
  /** 여러 단계로 이어지는 흐름에서 남은 단계를 알려준다 — 예: '1 / 2' */
  stepLabel?: string;
  /** 없으면 닫을 수 없는 모달이다 (강제 흐름) */
  onClose?: () => void;
  children: React.ReactNode;
}

/**
 * 네이티브 <dialog> 기반 모달.
 * 포커스 트랩 · 초기 포커스 · 닫힐 때 트리거로 복귀 · 배경 비활성화를 브라우저가 처리한다.
 */
export default function Modal({
  title,
  stepLabel,
  onClose,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();

    // 열려 있는 동안 배경 스크롤을 막는다
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
      dialog?.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      // 기본 닫기를 막고 onClose 가 있을 때만 닫는다 (ESC)
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
      // 내용 영역 클릭은 자식이 target 이라 백드롭만 걸린다
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose?.();
      }}
      className="m-auto w-full max-w-sm rounded-xl bg-white p-8 shadow-lg backdrop:bg-slate-900/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {stepLabel && (
            <p className="text-xs font-bold text-slate-400">{stepLabel}</p>
          )}
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
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
    </dialog>
  );
}

/** 모달 하단 기본 버튼 */
export function ModalButton({
  className = '',
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      {...props}
      className={`mt-6 w-full cursor-pointer rounded-lg bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 ${className}`}
    />
  );
}
