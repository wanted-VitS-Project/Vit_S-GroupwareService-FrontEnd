'use client';

import Modal from '@/components/Modal';

import { imageAltText, type BlockImage } from './types';

/**
 * 이미지 크게 보기.
 *
 * 좌우 이동은 카드가 들고 있는 상태를 그대로 쓴다 — 여기서 따로 받아 오면
 * 닫았을 때 카드가 보여 주는 장과 어긋난다.
 */
export default function ImageLightbox({
  image,
  orderIndex,
  totalCount,
  isLoading,
  errorMessage,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onDownload,
  onClose,
}: {
  image: BlockImage;
  orderIndex: number;
  totalCount: number | null;
  isLoading: boolean;
  /** 카드가 들고 있는 동작 실패 문구 — 모달이 카드를 덮으므로 여기서도 보여준다 */
  errorMessage: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={image.caption || image.originalName || '이미지 크게 보기'}
      onClose={onClose}
      className="flex max-h-[90vh] w-full max-w-[880px] flex-col overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      header={
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#1C1F2A]/10 px-5 py-3">
          <p className="min-w-0 truncate text-[11px] font-semibold text-[#1C1F2A]">
            {image.originalName || '이미지'}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="cursor-pointer rounded-lg px-2.5 py-1 text-[10px] font-medium text-[#3B5BDB] hover:bg-[#3B5BDB]/10"
            >
              다운로드
            </button>
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className="cursor-pointer text-[#6C7389] hover:text-[#1C1F2A]"
            >
              ✕
            </button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 items-center gap-3 bg-[#1C1F2A]/[0.03] p-4">
        <NavButton
          label="이전 이미지"
          disabled={!canGoPrev || isLoading}
          onClick={onPrev}
        >
          <ChevronIcon direction="left" />
        </NavButton>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          {/*
            이미지 칸을 먼저 고정한다 — 캡션이 붙거나 빠질 때, 좌우로 넘길 때
            이미지 크기가 따라 흔들리지 않게 한다.
          */}
          <div className="flex h-[62vh] w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- 저장소(S3) 도메인이 확정되지 않아 next/image 원격 패턴을 걸 수 없다 */}
            <img
              src={image.imageUrl}
              alt={imageAltText(image)}
              className={`max-h-full max-w-full rounded-lg object-contain ${
                isLoading ? 'opacity-50' : ''
              }`}
            />
          </div>
          {/* 캡션도 있든 없든 한 줄 자리를 잡아 둔다 */}
          <p className="line-clamp-2 h-8 max-w-lg text-center text-[11px] leading-4 text-[#1C1F2A]">
            {image.caption}
          </p>
        </div>

        <NavButton
          label="다음 이미지"
          disabled={!canGoNext || isLoading}
          onClick={onNext}
        >
          <ChevronIcon direction="right" />
        </NavButton>
      </div>

      <div className="shrink-0 border-t border-[#1C1F2A]/10 bg-[#ECEEF4]/20 px-5 py-2 text-center">
        {errorMessage ? (
          <p role="alert" className="text-[10px] break-keep text-[#E7000B]">
            {errorMessage}
          </p>
        ) : (
          <p className="font-mono text-[10px] text-[#6C7389]">
            {totalCount ? `${orderIndex} / ${totalCount}` : orderIndex}
          </p>
        )}
      </div>
    </Modal>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#1C1F2A]/10 bg-white text-[#1C1F2A] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4"
    >
      <path d={direction === 'left' ? 'm14 5-7 7 7 7' : 'm10 5 7 7-7 7'} />
    </svg>
  );
}
