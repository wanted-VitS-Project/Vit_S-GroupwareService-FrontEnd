'use client';

import Modal from './Modal';

/** 동적 모달 청크를 받는 짧은 동안 기존 모달과 같은 top-layer와 크기를 유지한다. */
export default function ModalLoadingFallback({
  title,
  className = 'w-full max-w-[480px] rounded-xl p-6 shadow-2xl',
  // 여백까지 부르는 쪽이 정한다 — 패널형처럼 안쪽 여백이 없는 모달도 있다
  bodyClassName = 'mt-5 h-40',
  header,
}: {
  title: string;
  className?: string;
  bodyClassName?: string;
  /** 실물이 제목 줄을 따로 그리는 모달이면 같은 모양을 넘긴다 — 안 그러면 청크 도착 때 헤더가 튄다 */
  header?: React.ReactNode;
}) {
  return (
    <Modal title={title} header={header} className={className}>
      <div
        role="status"
        aria-label={`${title} 화면을 불러오는 중입니다`}
        className={`animate-pulse rounded-lg bg-bg-surface ${bodyClassName}`}
      />
    </Modal>
  );
}
