'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  title: string;
  /** 없으면 닫을 수 없는 모달이다 (강제 흐름) */
  onClose?: () => void;
  /** 기본 제목 · 닫기 줄 대신 그릴 헤더. 넘기면 title 은 aria-label 로만 쓰인다 */
  header?: React.ReactNode;
  /**
   * 패널 크기 · 여백을 바꿀 때만 넘긴다.
   * 뒤에 덧붙여지므로 배경 딤 같은 필수 스타일은 지워지지 않는다.
   */
  className?: string;
  children: React.ReactNode;
}

/** 모달 동작에 필요해 항상 적용한다 */
const BASE_PANEL = 'm-auto bg-white backdrop:bg-slate-900/50';
/** className 을 넘기지 않을 때의 크기 · 여백 */
const DEFAULT_PANEL = 'w-full max-w-sm rounded-xl p-8 shadow-lg';

/**
 * 네이티브 <dialog> 기반 모달.
 * 포커스 트랩 · 초기 포커스 · 닫힐 때 트리거로 복귀 · 배경 비활성화를 브라우저가 처리한다.
 */
export default function Modal({
  title,
  onClose,
  header,
  className = DEFAULT_PANEL,
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
      className={`${BASE_PANEL} ${className}`}
    >
      {header ?? (
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
      )}
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
