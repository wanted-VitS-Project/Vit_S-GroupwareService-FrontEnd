'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  title: string;
  /**
   * 여러 단계로 이어지는 흐름에서 남은 단계를 알려준다 — 예: '1 / 2'.
   * 기본 헤더에만 그려지므로 `header` 를 넘기면 무시된다.
   */
  stepLabel?: string;
  /** 없으면 닫을 수 없는 모달이다 (강제 흐름) */
  onClose?: () => void;
  /**
   * 배경(백드롭) 클릭으로 닫을지. 기본 `true`.
   *
   * 여러 단계로 이어지거나 입력이 쌓이는 흐름에서는 꺼 둔다 —
   * 표를 훑다 바깥을 한 번 잘못 눌러 처음부터 다시 하게 되면 곤란하다.
   * 끄더라도 닫기 버튼 · Esc 는 그대로 살아 있어 갇히지 않는다.
   */
  dismissOnBackdrop?: boolean;
  /** 기본 제목 · 닫기 줄 대신 그릴 헤더. 넘기면 title 은 aria-label 로만 쓰인다 */
  header?: React.ReactNode;
  /**
   * 패널 크기 · 여백을 바꿀 때만 넘긴다.
   * 뒤에 덧붙여지므로 배경 딤 같은 필수 스타일은 지워지지 않는다.
   */
  className?: string;
  children: React.ReactNode;
}

/**
 * 모달 동작에 필요해 항상 적용한다.
 *
 * ⚠️ **폭 상한(`max-w-…`)을 여기서 걸지 않는다.** 호출부가 이미 `max-w-[420px]` 처럼
 *    자기 폭을 정하는데 여기서 `max-w-[calc(100dvw-2rem)]` 를 함께 걸면 같은 성질의
 *    클래스가 둘이 되어 **어느 쪽이 이길지 CSS 순서에 달린다** — 넓은 화면에서 창이
 *    화면 폭만큼 늘어나는 일이 실제로 있었다 (2026-08-16).
 *    좁은 화면 보호는 브라우저가 이미 한다 — `<dialog>` 는 기본 스타일로 뷰포트를 넘지 않는다.
 * ℹ️ 높이 상한만 남긴다. 이건 호출부가 잘 정하지 않고, 넘치면 닫기 버튼까지 화면 밖으로 나간다.
 */
const BASE_PANEL =
  'm-auto max-h-[calc(100dvh-2rem)] bg-bg-card backdrop:bg-text-primary/50';
/**
 * className 을 넘기지 않을 때의 크기 · 여백.
 *
 * 그림자는 `shadow-2xl` 로 고정한다 — 모달 대부분이 이미 그 값을 직접 붙이고 있어,
 * 기본값만 `shadow-lg` 로 두면 className 을 안 넘긴 모달만 유독 얕게 뜬다.
 */
const DEFAULT_PANEL = 'w-full max-w-sm rounded-base p-8 shadow-2xl';

/**
 * 화면 오른쪽 아래에 붙는 곁패널의 자리 · 높이.
 *
 * 실물과 **동적 로딩 폴백**이 같은 값을 써야 한다 — 한쪽만 다르면 청크가 도착하는 순간
 * 패널이 다른 자리로 튄다. 그래서 문자열을 여기 한 곳에만 둔다.
 */
const SIDE_PANEL_BASE =
  'mt-auto mr-4 mb-4 ml-auto flex h-[72vh] max-h-[560px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl';

/** 곁패널 기본 폭 — `연결된 이슈` · `블록 활동 기록` */
export const SIDE_PANEL = `${SIDE_PANEL_BASE} w-[380px]`;
/** 한 줄이 긴 목록을 담는 곁패널 — `비타메이트 분석 이력` */
export const SIDE_PANEL_WIDE = `${SIDE_PANEL_BASE} w-[420px]`;

/** 확인 모달이 편집 모달 위에 겹쳐도 먼저 닫힌 모달이 스크롤 잠금을 풀지 않게 한다. */
let openModalCount = 0;
let originalBodyOverflow = '';

/**
 * 네이티브 <dialog> 기반 모달.
 * 포커스 트랩 · 초기 포커스 · 닫힐 때 트리거로 복귀 · 배경 비활성화를 브라우저가 처리한다.
 */
export default function Modal({
  title,
  stepLabel,
  onClose,
  dismissOnBackdrop = true,
  header,
  className = DEFAULT_PANEL,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();

    // 열려 있는 동안 배경 스크롤을 막는다
    if (openModalCount === 0)
      originalBodyOverflow = document.body.style.overflow;
    openModalCount += 1;
    document.body.style.overflow = 'hidden';

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0)
        document.body.style.overflow = originalBodyOverflow;
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
        if (!dismissOnBackdrop) return;
        if (event.target === dialogRef.current) onClose?.();
      }}
      className={`${BASE_PANEL} ${className}`}
    >
      {header ?? (
        <div className="flex items-start justify-between gap-4">
          <div>
            {stepLabel && (
              <p className="text-label font-bold text-text-muted">
                {stepLabel}
              </p>
            )}
            <h2 className="text-heading-m font-bold">{title}</h2>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="cursor-pointer text-text-muted hover:text-text-primary"
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
      className={`mt-6 w-full cursor-pointer rounded-lg bg-text-primary py-3 text-body-m font-bold text-text-white transition-colors hover:bg-bg-sidebar-hover disabled:cursor-not-allowed disabled:bg-bg-hover-secondary ${className}`}
    />
  );
}
