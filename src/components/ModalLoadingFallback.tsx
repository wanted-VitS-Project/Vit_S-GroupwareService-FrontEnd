'use client';

import { useEffect, useState } from 'react';

import Modal from './Modal';
import { Skeleton } from './Skeleton';
import LoadingSpinner from './Spinner';

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
      <Skeleton className="size-5 shrink-0 rounded-button-sm" />
      <div className="min-w-0 flex-1">
        {/* 배지가 붙으면 제목이 접힌다 — 실물 패널과 같이 한 줄로 붙든다 */}
        <h2 className="truncate text-label font-semibold text-text-primary">
          {title}
        </h2>
        <Skeleton className="h-3 w-24" />
      </div>
      {hasBadge && <Skeleton className="h-5 w-10 shrink-0 rounded-pill" />}
      <span aria-hidden className="size-6 shrink-0" />
    </div>
  );
}

/**
 * 폴백을 띄우기 전에 기다리는 시간(ms).
 *
 * ⚠️ 폴백은 **실물과 다른 `<dialog>`** 다 — 뜨면 곧바로 닫히고 실물이 새로 열리므로
 *    사용자 눈에는 `스피너 창 → 다른 창` 두 개가 연달아 열린 것처럼 보인다.
 *    청크는 대개 미리 받아 두거나(각 화면의 `preload*`) 곧바로 도착하니,
 *    그 사이에는 **아무것도 그리지 않아** 창이 한 번만 열리게 한다.
 *    정말 느릴 때만 스피너 창을 띄운다.
 */
const FALLBACK_DELAY_MS = 300;

/*
 * 값이 다 온 뒤에 창을 펼치는 모달이 스피너를 띄우기까지 기다리는 시간(ms).
 *
 * 청크 지연용 FALLBACK_DELAY_MS 로는 API 응답이 거의 매번 걸려,
 * 스피너 창 → 실물 창 두 번 열리는 덜컥임이 그대로 남는다.
 * 죽은 클릭처럼 보이지 않게 하는 안전망일 뿐이라 넉넉히 잡는다.
 */
const SLOW_LOADING_MS = 1_200;

// 값이 이만큼 늦게 오는지. 참이 될 때만 실물 대신 스피너 창을 띄운다 —
// 그 전에는 아무것도 그리지 않아야 창이 한 번만 열린다.
export function useSlowLoading(isPending: boolean) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isPending) return;

    const timer = setTimeout(() => setIsSlow(true), SLOW_LOADING_MS);
    return () => clearTimeout(timer);
  }, [isPending]);

  return isSlow;
}

/** 동적 모달 청크가 늦게 올 때만 기존 모달과 같은 top-layer와 크기를 유지한다. */
export default function ModalLoadingFallback({
  title,
  className = 'w-full max-w-[480px] rounded-base p-6 shadow-2xl',
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
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isSlow) return null;

  return (
    <Modal title={title} header={header} className={className}>
      {/**
       * 모달마다 크기가 달라 뼈대를 맞출 수 없다 — 자리(`bodyClassName`)만 잡아 두고
       * 안은 스피너 하나로 통일한다.
       */}
      <LoadingSpinner
        label={`${title} 화면을 불러오는 중입니다`}
        className={bodyClassName}
      />
    </Modal>
  );
}
