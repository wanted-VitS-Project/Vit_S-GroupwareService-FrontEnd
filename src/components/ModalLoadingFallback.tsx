'use client';

import Modal from './Modal';
import { Skeleton } from './Skeleton';

/**
 * 곁패널(`SIDE_PANEL`)들의 공통 헤더 모양 — 아이콘 · 제목 · 부제 · (배지) · 닫기.
 * 실물과 **높이가 같아야** 청크가 도착할 때 본문이 위아래로 튀지 않는다:
 * 제목 줄 16px + 부제 줄 12px = 28px.
 */
export function SidePanelFallbackHeader({
  title,
  /** 실물 헤더에 건수 배지가 있는 패널만 켠다 */
  hasBadge = false,
}: {
  title: string;
  hasBadge?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border-default px-4 py-3">
      <Skeleton className="size-5 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <h2 className="text-xs font-semibold text-text-primary">{title}</h2>
        <Skeleton className="h-3 w-24" />
      </div>
      {hasBadge && <Skeleton className="h-5 w-10 shrink-0 rounded-full" />}
      <span aria-hidden className="size-6 shrink-0" />
    </div>
  );
}

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
