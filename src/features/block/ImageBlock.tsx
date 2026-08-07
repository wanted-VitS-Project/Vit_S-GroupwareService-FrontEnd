'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { messageOf } from '@/lib/api';

import { deleteImageItem, downloadBlockImages, getImageItem } from './api';
import BlockCard from './BlockCard';
import ImageEditModal from './ImageEditModal';
import ImageLightbox from './ImageLightbox';
import ImageUploadModal from './ImageUploadModal';
import { readImageBlockDetail, type BlockImage, type StepBlock } from './types';

/** 어느 이미지를 받아 올지 — 현재 정렬 번호와 방향으로 지정한다 */
interface ImageRequest {
  from: number;
  direction: 'prev' | 'next';
}

/** 첫 장 예비 요청. 정렬 번호가 1부터라 0 의 `next` 가 1번이다 */
const FIRST_REQUEST: ImageRequest = { from: 0, direction: 'next' };

/**
 * 이미지 블록.
 *
 * **첫 장은 블록 목록 조회(10번)의 `detail` 로 함께 온다** — 카드가 뜨자마자 그린다.
 *
 * ⚠️ 두 번째 장부터는 **목록 조회 API 가 없다.** 서버가 `현재 정렬 번호 + 방향`으로
 *    **한 장씩만** 준다 (`GET /blocks/images/{imgBlockId}/items/{orderIndex}?direction=`).
 *    그래서 좌우 이동마다 한 번씩 부르고, 받아 온 장은 정렬 번호로 캐싱해
 *    되돌아올 때는 요청하지 않는다.
 *    순서 편집 모달만 전체 목록이 필요해 그때 처음부터 걸어서 모은다.
 */
export default function ImageBlock({
  block,
  autoUpload = false,
}: {
  block: StepBlock;
  /** 블록을 막 만든 직후 — 업로드 모달을 바로 띄운다 */
  autoUpload?: boolean;
}) {
  const detail = useMemo(
    () => readImageBlockDetail(block.detail),
    [block.detail],
  );
  const imgBlockId = detail?.imgBlockId ?? null;

  /** 정렬 번호 → 이미지. 좌우로 오갈 때 같은 장을 다시 받지 않으려고 둔다 */
  const cacheRef = useRef(new Map<number, BlockImage>());
  const [current, setCurrent] = useState<BlockImage | null>(
    () => detail?.images[0] ?? null,
  );
  const [totalCount, setTotalCount] = useState<number | null>(
    detail?.totalCount ?? null,
  );
  const [request, setRequest] = useState<ImageRequest | null>(() => {
    // 정상 경로 — 첫 장이나 "0장" 이 detail 에 실려 오면 여기서 부를 게 없다
    if (detail && (detail.images.length > 0 || detail.totalCount === 0)) {
      return null;
    }
    // 예비 경로 — detail 이 비어 있을 때만 첫 장을 직접 받아 본다
    return FIRST_REQUEST;
  });
  const [hasFailed, setHasFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modal, setModal] = useState<'upload' | 'edit' | 'lightbox' | null>(
    autoUpload ? 'upload' : null,
  );

  // detail 에 목록이 실려 왔으면 캐시를 미리 채워 둔다
  useEffect(() => {
    detail?.images.forEach((image) =>
      cacheRef.current.set(image.orderIndex, image),
    );
  }, [detail]);

  useEffect(() => {
    if (imgBlockId === null || request === null) return;

    const controller = new AbortController();
    const { signal } = controller;

    getImageItem(imgBlockId, request.from, request.direction, signal)
      .then((item) => {
        cacheRef.current.set(item.orderIndex, item);
        setCurrent(item);
        setTotalCount(item.totalCount);
        setHasFailed(false);
        setRequest(null);
      })
      .catch(() => {
        if (signal.aborted) return;
        setHasFailed(true);
        setRequest(null);
      });

    return () => controller.abort();
  }, [imgBlockId, request]);

  const isLoading = request !== null;
  const orderIndex = current?.orderIndex ?? 0;
  const canGoPrev = current !== null && orderIndex > 1;
  // 장수를 모르면(detail 이 안 실어 준 경우) 막지 않는다 — 서버 응답으로 채워진다
  const canGoNext =
    current !== null && (totalCount === null || orderIndex < totalCount);
  /**
   * 양 끝에서 반대쪽 끝으로 넘어갈 수 있는지 (카드 · 전체보기 공통).
   * 장수를 알아야 마지막 장이 몇 번인지 계산할 수 있다 — 모르면 순환하지 않는다.
   */
  const canLoop = current !== null && totalCount !== null && totalCount > 1;

  /** 캐시를 버리고 `orderIndex` 장으로 다시 맞춘다 (업로드 · 삭제 후) */
  function reloadFrom(target: number) {
    cacheRef.current.clear();
    setCurrent(null);
    setHasFailed(false);
    setRequest({ from: Math.max(0, target - 1), direction: 'next' });
  }

  /**
   * 좌우 이동.
   *
   * `wrap` 이면 마지막 → 첫 장, 첫 장 → 마지막으로 넘어간다.
   * 카드 · 전체보기 모두 켜 두고, 장수를 모를 때만 순환하지 않는다.
   */
  function go(step: 1 | -1, wrap = false) {
    if (!current || isLoading) return;

    const last = totalCount;
    let target = current.orderIndex + step;

    if (wrap && last !== null && last > 1) {
      if (target > last) target = 1;
      if (target < 1) target = last;
    }
    // 순환이 아닌데 범위를 벗어나면 부를 곳이 없다
    if (target < 1 || (last !== null && target > last)) return;

    const cached = cacheRef.current.get(target);
    if (cached) {
      setCurrent(cached);
      return;
    }

    /*
     * 이웃 장은 방향 그대로 부른다.
     * 양 끝을 건너뛰는 순환 이동은 방향으로 표현할 수 없어 **"앞 장의 다음"** 으로 집어 온다 —
     * 정렬 번호가 1..N 로 이어져 있어 `target - 1` 은 항상 실재하는 장이다
     * (1번으로 갈 때만 0 이 되고, 이는 첫 장 예비 경로와 같은 규약이다).
     */
    const isNeighbor = Math.abs(target - current.orderIndex) === 1;

    setRequest(
      isNeighbor
        ? {
            from: current.orderIndex,
            direction: step === 1 ? 'next' : 'prev',
          }
        : { from: target - 1, direction: 'next' },
    );
  }

  async function download(imgId?: number) {
    if (imgBlockId === null) return;
    setErrorMessage('');

    try {
      await downloadBlockImages(
        imgBlockId,
        imgId,
        imgId === undefined
          ? '이미지.zip'
          : (current?.originalName ?? '이미지'),
      );
    } catch (caught) {
      setErrorMessage(messageOf(caught, '다운로드에 실패했습니다.'));
    }
  }

  async function removeCurrent() {
    if (!current || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      await deleteImageItem(current.imgId);
      const remaining = (totalCount ?? 1) - 1;
      setTotalCount(remaining);

      if (remaining <= 0) {
        cacheRef.current.clear();
        setCurrent(null);
        setTotalCount(0);
      } else {
        // 뒤 장들의 정렬 번호가 당겨진다 — 지운 자리(마지막이면 앞 장)로 옮긴다
        reloadFrom(Math.min(current.orderIndex, remaining));
      }
    } catch (caught) {
      setErrorMessage(messageOf(caught, '이미지를 삭제하지 못했습니다.'));
    } finally {
      setIsDeleting(false);
    }
  }

  if (imgBlockId === null) {
    // detail.imgBlockId 없이는 어느 이미지 블록인지 지목할 수 없다
    return (
      <BlockCard block={block}>
        <p className="text-[10px] text-[#6C7389]">
          이미지를 불러올 수 없습니다.
        </p>
      </BlockCard>
    );
  }

  const isEmpty = !current && !isLoading;

  return (
    <BlockCard
      block={block}
      headerExtra={
        totalCount !== null && totalCount > 0 ? (
          <span className="shrink-0 font-mono text-[9px] text-[#6C7389]">
            {totalCount}장
          </span>
        ) : undefined
      }
    >
      <div className="flex h-full flex-col gap-1.5">
        {isEmpty ? (
          <button
            type="button"
            onClick={() => setModal('upload')}
            className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-[#1C1F2A]/10 bg-[#ECEEF4]/40 hover:border-[#3B5BDB]/40 hover:bg-[#3B5BDB]/5"
          >
            <ImageIcon />
            <span className="text-[10px] text-[#6C7389]">이미지 추가</span>
          </button>
        ) : (
          <div className="group/image relative aspect-video overflow-hidden rounded-md bg-[#ECEEF4]">
            {current ? (
              /* eslint-disable-next-line @next/next/no-img-element -- 저장소(S3) 도메인이 확정되지 않아 next/image 원격 패턴을 걸 수 없다 */
              <img
                src={current.imageUrl}
                alt={current.caption || current.originalName || '이미지'}
                className="size-full object-cover"
              />
            ) : (
              <span
                aria-label="이미지를 불러오는 중입니다"
                role="status"
                className="block size-full animate-pulse bg-[#ECEEF4]"
              />
            )}

            {current && (
              <>
                <button
                  type="button"
                  aria-label="크게 보기"
                  onClick={() => setModal('lightbox')}
                  className="absolute inset-0 cursor-zoom-in bg-black/0 transition-colors group-hover/image:bg-black/15"
                />

                {(canGoPrev || canLoop) && (
                  <OverlayButton
                    label="이전 이미지"
                    position="left-1.5"
                    disabled={isLoading}
                    onClick={() => go(-1, true)}
                  >
                    <ChevronIcon direction="left" />
                  </OverlayButton>
                )}
                {(canGoNext || canLoop) && (
                  <OverlayButton
                    label="다음 이미지"
                    position="right-1.5"
                    disabled={isLoading}
                    onClick={() => go(1, true)}
                  >
                    <ChevronIcon direction="right" />
                  </OverlayButton>
                )}

                <ImageMenu
                  isOpen={isMenuOpen}
                  isDeleting={isDeleting}
                  onToggle={() => setIsMenuOpen((wasOpen) => !wasOpen)}
                  onEdit={() => {
                    setIsMenuOpen(false);
                    setModal('edit');
                  }}
                  onDownload={() => {
                    setIsMenuOpen(false);
                    download(current.imgId);
                  }}
                  onDelete={() => {
                    setIsMenuOpen(false);
                    removeCurrent();
                  }}
                />
              </>
            )}
          </div>
        )}

        {/*
          캡션은 있든 없든 **항상 한 줄 자리를 차지한다.**
          조건부로 그리면 캡션을 붙이는 순간 카드가 커지고, 같은 행의 블록 높이까지 딸려 움직인다.
          여러 줄로 늘어나지 않게 `truncate` 로 한 줄에 가둔다.
        */}
        <p
          title={current?.caption || undefined}
          className="h-3.5 truncate text-[10px] leading-[14px] text-[#6C7389]"
        >
          {current?.caption || ' '}
        </p>

        {(errorMessage || hasFailed) && (
          <p role="alert" className="text-[9px] break-keep text-[#E7000B]">
            {errorMessage || '이미지를 불러오지 못했습니다.'}
            {hasFailed && (
              <button
                type="button"
                onClick={() => reloadFrom(1)}
                className="ml-1 cursor-pointer font-medium text-[#3B5BDB] underline"
              >
                다시 시도
              </button>
            )}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
          <span className="shrink-0 font-mono text-[9px] text-[#6C7389]">
            {current && totalCount ? `${orderIndex} / ${totalCount}` : '—'}
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            <TextButton onClick={() => setModal('upload')}>
              <PlusIcon /> 추가
            </TextButton>
            {current && (
              <>
                <span className="text-[10px] text-[#6C7389]/40">|</span>
                <TextButton onClick={() => download()}>
                  <DownloadIcon /> 전체 다운로드
                </TextButton>
              </>
            )}
          </div>
        </div>
      </div>

      {modal === 'upload' && (
        <ImageUploadModal
          imgBlockId={imgBlockId}
          onClose={() => setModal(null)}
          onUploaded={(created) => {
            setModal(null);
            // 새로 올린 첫 장으로 옮기고 전체 장수를 다시 받는다
            reloadFrom(created[0]?.orderIndex ?? 1);
          }}
        />
      )}

      {modal === 'edit' && (
        <ImageEditModal
          imgBlockId={imgBlockId}
          seed={current}
          onClose={() => setModal(null)}
          onSaved={(images) => {
            setModal(null);
            cacheRef.current.clear();
            images.forEach((image) =>
              cacheRef.current.set(image.orderIndex, image),
            );
            setTotalCount(images.length);
            // 보고 있던 이미지가 남아 있으면 그 자리를 유지한다
            setCurrent(
              images.find((image) => image.imgId === current?.imgId) ??
                images[0] ??
                null,
            );
            setHasFailed(false);
          }}
        />
      )}

      {modal === 'lightbox' && current && (
        <ImageLightbox
          image={current}
          orderIndex={orderIndex}
          totalCount={totalCount}
          isLoading={isLoading}
          canGoPrev={canGoPrev || canLoop}
          canGoNext={canGoNext || canLoop}
          onPrev={() => go(-1, true)}
          onNext={() => go(1, true)}
          onDownload={() => download(current.imgId)}
          onClose={() => setModal(null)}
        />
      )}
    </BlockCard>
  );
}

function OverlayButton({
  label,
  position,
  disabled,
  onClick,
  children,
}: {
  label: string;
  /** 좌우 위치 클래스 */
  position: string;
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
      className={`absolute top-1/2 ${position} flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-focus-within/image:opacity-100 group-hover/image:opacity-100 hover:bg-black/70 disabled:cursor-progress`}
    >
      {children}
    </button>
  );
}

/** 이미지 위 `⋯` 메뉴 — 수정 · 다운로드 · 삭제 */
function ImageMenu({
  isOpen,
  isDeleting,
  onToggle,
  onEdit,
  onDownload,
  onDelete,
}: {
  isOpen: boolean;
  isDeleting: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="absolute top-1.5 right-1.5">
      <button
        type="button"
        aria-label="이미지 메뉴"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
        className={`flex size-6 cursor-pointer items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70 ${
          isOpen
            ? 'opacity-100'
            : 'opacity-0 group-focus-within/image:opacity-100 group-hover/image:opacity-100'
        }`}
      >
        <MoreIcon />
      </button>

      {isOpen && (
        <span
          role="menu"
          className="absolute top-7 right-0 z-20 flex w-32 flex-col overflow-hidden rounded-lg border border-[#1C1F2A]/10 bg-white shadow-lg"
        >
          <MenuItem onClick={onEdit}>이미지 수정</MenuItem>
          <MenuItem onClick={onDownload}>다운로드</MenuItem>
          <MenuItem danger disabled={isDeleting} onClick={onDelete}>
            {isDeleting ? '삭제 중…' : '삭제'}
          </MenuItem>
        </span>
      )}
    </span>
  );
}

function MenuItem({
  danger = false,
  disabled = false,
  onClick,
  children,
}: {
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`cursor-pointer px-2.5 py-1.5 text-left text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'text-[#E7000B] hover:bg-red-50'
          : 'text-[#1C1F2A] hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function TextButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[10px] text-[#6C7389] hover:bg-[#3B5BDB]/10 hover:text-[#3B5BDB]"
    >
      {children}
    </button>
  );
}

function ImageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5 text-[#6C7389]"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 5-5 4 4 3-3 4 4" />
    </svg>
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
      className="size-3"
    >
      <path d={direction === 'left' ? 'm14 5-7 7 7 7' : 'm10 5 7 7-7 7'} />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="size-2.5 shrink-0"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5 shrink-0"
    >
      <path d="M4 20h16" />
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="size-2.5"
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
