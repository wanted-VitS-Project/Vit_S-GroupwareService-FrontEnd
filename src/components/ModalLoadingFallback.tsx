'use client';

import Modal from './Modal';

/** 동적 모달 청크를 받는 짧은 동안 기존 모달과 같은 top-layer와 크기를 유지한다. */
export default function ModalLoadingFallback({
  title,
  className = 'w-full max-w-[480px] rounded-xl p-6 shadow-2xl',
  bodyClassName = 'h-40',
}: {
  title: string;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Modal title={title} className={className}>
      <div
        role="status"
        aria-label={`${title} 화면을 불러오는 중입니다`}
        className={`mt-5 animate-pulse rounded-lg bg-bg-surface ${bodyClassName}`}
      />
    </Modal>
  );
}
