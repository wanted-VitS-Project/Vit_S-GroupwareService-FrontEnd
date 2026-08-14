'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';

import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { messageOf } from '@/lib/api';
import { useModal, useModalRouter } from '@/lib/useModal';

import {
  deleteImageItem,
  downloadBlockImages,
  getImageItem,
  getImageItems,
} from './api';
import BlockCard from './BlockCard';
import {
  imageAltText,
  isCount,
  isPositiveInteger,
  readImageBlockDetail,
  type BlockImage,
  type StepBlock,
} from './types';

const loadImageUploadModal = () => import('./ImageUploadModal');
const loadImageEditModal = () => import('./ImageEditModal');
const loadImageLightbox = () => import('./ImageLightbox');
const ImageUploadModal = dynamic(loadImageUploadModal, {
  loading: () => <ModalLoadingFallback title="이미지 등록" />,
});
const ImageEditModal = dynamic(loadImageEditModal, {
  loading: () => <ModalLoadingFallback title="이미지 수정" />,
});
const ImageLightbox = dynamic(loadImageLightbox, {
  loading: () => (
    <ModalLoadingFallback
      title="이미지 크게 보기"
      className="flex h-[85vh] w-full max-w-[920px] flex-col rounded-base p-6 shadow-2xl"
      bodyClassName="mt-5 min-h-0 flex-1"
    />
  ),
});

function preloadImageModals() {
  void loadImageUploadModal();
  void loadImageEditModal();
  void loadImageLightbox();
}

/**
 * 어느 이미지를 받아 올지 — **서버가 준 정렬 번호**와 방향으로 지정한다.
 *
 * ❗ `from` 에 **지어낸 값을 넣지 않는다.** 예전에는 첫 장을 받으려고 `{ from: 0 }` 을
 *    보냈는데(정렬 번호가 1부터니 0의 `next` 가 1번이라는 자체 규약), 서버에 0 번은
 *    없는 자리라 요청이 그대로 실패했다. `다시 시도` 도 같은 0 을 다시 보내
 *    **몇 번을 눌러도 복구되지 않았다.** 지금은 정렬 번호를 늘 응답에서만 받아 쓴다.
 */
interface ImageRequest {
  from: number;
  direction: 'prev' | 'next';
}

/**
 * 카드를 그릴 밑천이 `detail` 에 실려 왔는지.
 * 대표 이미지가 있거나 "0장" 이라고 확정해 주면 목록을 따로 받을 이유가 없다.
 */
function hasSeedImages(
  detail: { images: unknown[]; totalCount: number | null } | null,
) {
  return Boolean(
    detail && (detail.images.length > 0 || detail.totalCount === 0),
  );
}

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
  const [request, setRequest] = useState<ImageRequest | null>(null);
  /**
   * 목록을 통째로 다시 받아야 하는 자리 (71번).
   *
   * 정렬 번호를 **모르는** 상황이 셋 있다 — 화면 진입 때 대표 이미지가 안 실려 온 경우 ·
   * `다시 시도` · 이미지 삭제 직후(삭제 응답이 남은 이미지를 알려 주지 않는다).
   * 셋 다 번호를 지어내는 대신 목록을 받아 **서버가 준 번호로** 다시 맞춘다.
   *
   * ⚠️ 71번은 **편집 권한**이 필요하다. 열람 전용 사용자는 여기까지 오지 않는다 —
   *    삭제 · 재시도는 편집자만 하고, 진입 때는 대표 이미지가 실려 오는 것이 정상 경로다.
   */
  const [resyncCount, setResyncCount] = useState(() =>
    hasSeedImages(detail) ? 0 : 1,
  );
  const [isResyncing, setIsResyncing] = useState(() => !hasSeedImages(detail));
  /**
   * 지금 유효한 재동기화가 몇 번째인지.
   *
   * ⚠️ 목록 요청이 날아가 있는 동안 **업로드가 끝날 수 있다.** 그대로 두면 늦게 도착한
   *    목록(업로드 **전**의 것)이 `applyImages` 로 캐시를 통째로 갈아엎어 방금 올린
   *    이미지가 카드에서 사라진다. 세대가 어긋난 응답은 버린다.
   */
  const resyncEpoch = useRef(0);
  const [hasFailed, setHasFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  /** ⫰ 드롭다운. 모달은 아니지만 여닫이가 같아 같은 훅을 쓴다 */
  const menu = useModal();
  /** 카드가 여는 세 가지 — 하나만 열린다 */
  const modal = useModalRouter<'upload' | 'edit' | 'lightbox'>(
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
        // 정렬 번호가 성하지 않으면 캐시 · 다음 요청이 전부 어긋난다 — 실패로 본다
        if (!isPositiveInteger(item.orderIndex)) {
          setHasFailed(true);
          setRequest(null);
          return;
        }

        cacheRef.current.set(item.orderIndex, item);
        setCurrent(item);
        // 장수를 못 믿을 값으로 받으면 차라리 "모름" 으로 둔다
        setTotalCount(isCount(item.totalCount) ? item.totalCount : null);
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

  /**
   * 목록을 통째로 다시 받아 카드를 맞춘다.
   * 정렬 번호를 지어내지 않는 유일한 복구 수단이다 — 서버가 준 번호만 쓴다.
   */
  useEffect(() => {
    if (imgBlockId === null || resyncCount === 0) return;

    const controller = new AbortController();
    const { signal } = controller;
    // 이 요청이 몇 번째 세대인지 붙들어 둔다 — 도착했을 때 아직 유효한지 가리는 표다
    const epoch = resyncEpoch.current + 1;
    resyncEpoch.current = epoch;

    getImageItems(imgBlockId, signal)
      .then((data) => {
        // 기다리는 사이 업로드가 끝났다 — 이 목록은 그때보다 옛것이라 쓰지 않는다
        if (resyncEpoch.current !== epoch) return;

        applyImages(data.images);
        setIsResyncing(false);
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (signal.aborted || resyncEpoch.current !== epoch) return;
        setHasFailed(true);
        setIsResyncing(false);
      });

    return () => controller.abort();
  }, [imgBlockId, resyncCount]);

  const isLoading = request !== null || isResyncing;
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

  /** 목록을 다시 받아 카드를 맞춘다 (`다시 시도` · 삭제 후) */
  function resync() {
    setHasFailed(false);
    setIsResyncing(true);
    setResyncCount((count) => count + 1);
  }

  /** 서버가 확정해 준 목록으로 카드를 통째로 맞춘다 (수정 저장 · 재동기화) */
  function applyImages(images: BlockImage[]) {
    cacheRef.current.clear();
    images.forEach((image) => cacheRef.current.set(image.orderIndex, image));
    setTotalCount(images.length);
    // 보고 있던 이미지가 남아 있으면 그 자리를 유지한다
    setCurrent(
      (previous) =>
        images.find((image) => image.imgId === previous?.imgId) ??
        images[0] ??
        null,
    );
    setHasFailed(false);
  }

  /**
   * 방금 올린 이미지를 카드에 얹는다 (업로드 직후 — 보통 **재조회 없음**).
   *
   * 생성 응답(67번)에는 **새로 올린 것만** 담기므로 기존 캐시를 비우지 않고 합친다.
   * 장수도 알던 값에 더한다 — 몰랐으면(`null`) 계속 모르는 채로 둔다.
   * 화면은 새로 올린 첫 장으로 옮긴다.
   */
  function applyCreated(created: BlockImage[]) {
    if (created.length === 0) return;

    /*
     * 목록 요청이 날아가 있었다면 **그 응답을 버린다** — 업로드 전의 목록이라
     * 그대로 적용되면 방금 올린 이미지가 사라진다.
     */
    const wasResyncing = isResyncing;
    resyncEpoch.current += 1;

    created.forEach((image) => cacheRef.current.set(image.orderIndex, image));
    setCurrent(created[0]);
    setHasFailed(false);

    if (wasResyncing) {
      /*
       * 버린 목록이 들고 있던 장수를 우리는 모른다 (삭제 직후였을 수도 있다).
       * 이때만 목록을 다시 받아 확정한다 — 평상시 업로드는 아래 덧셈으로 끝난다.
       */
      resync();
      return;
    }

    setTotalCount((previous) =>
      previous === null ? null : previous + created.length,
    );
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
    // 순환이 아닌데 범위를 벗어나거나, 정렬 번호가 성치 않으면 부를 곳이 없다
    if (!isPositiveInteger(target) || (last !== null && target > last)) return;

    const cached = cacheRef.current.get(target);
    if (cached) {
      setCurrent(cached);
      return;
    }

    /*
     * 이웃 장만 서버에 부른다 — `from` 이 **지금 보고 있는 장의 진짜 정렬 번호**라 안전하다.
     *
     * ❗ 양 끝을 건너뛰는 순환 이동은 방향으로 표현할 수 없다. 예전에는 `target - 1` 을
     *    지어내 "앞 장의 다음" 으로 집어 왔는데, 1번으로 갈 때 `0` 이 되어 없는 자리를 불렀다.
     *    지금은 **캐시에 있을 때만** 순환한다 — 첫 장은 블록 응답(10번)으로 이미 받아 두었고
     *    목록을 다시 받은 뒤에는 전부 캐시에 있어, 실제로 막히는 경우는 거의 없다.
     */
    const isNeighbor = Math.abs(target - current.orderIndex) === 1;
    if (!isNeighbor) return;

    setRequest({
      from: current.orderIndex,
      direction: step === 1 ? 'next' : 'prev',
    });
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

      /*
       * 삭제 응답은 `null` 이라 **남은 이미지를 알려 주지 않는다.**
       * 게다가 뒤 장들의 정렬 번호가 앞으로 당겨져, 화면이 들고 있던 번호는 전부 옛것이 된다.
       * 번호를 계산해 맞히려다 없는 자리(0)를 부르던 것이 이 화면의 버그였다 —
       * 이때만은 목록을 다시 받아 **서버가 준 번호로** 통째로 맞춘다.
       *
       * 비었으면 `applyImages([])` 가 0장으로 정리해 `이미지 추가` 판이 뜬다.
       */

      /*
       * ⚠️ 재동기화 **전에** 지워진 자리를 비운다. 그대로 두면 목록 조회가 실패했을 때
       *    `showRetry` 가 `current` 를 보고 거짓이 되어, 사용자는 **이미 지운 이미지를
       *    계속 보면서 다시 시도할 방법도 없다.** (같은 이미지에 삭제를 또 걸 수도 있다)
       */
      cacheRef.current.clear();
      setCurrent(null);
      setTotalCount(null);

      resync();
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
        <p className="text-caption text-text-secondary">
          이미지를 불러올 수 없습니다.
        </p>
      </BlockCard>
    );
  }

  /**
   * 빈 블록과 **조회 실패**를 갈라 놓는다.
   * 실패했는데 "이미지 추가" 판을 띄우면 있는 이미지를 없는 것처럼 속이게 된다.
   */
  const showRetry = !current && !isLoading && hasFailed;
  const isEmpty = !current && !isLoading && !hasFailed;

  return (
    <BlockCard
      block={block}
      headerExtra={
        totalCount !== null && totalCount > 0 ? (
          <span className="shrink-0 font-mono text-micro text-text-secondary">
            {totalCount}장
          </span>
        ) : undefined
      }
    >
      <div
        onPointerEnter={preloadImageModals}
        onFocusCapture={preloadImageModals}
        className="flex h-full flex-col gap-1.5"
      >
        {showRetry ? (
          // 못 불러온 것뿐이다 — 이미지가 없다고 단정하지 않는다
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-button-md border border-border-default bg-bg-surface">
            <p role="alert" className="text-caption text-text-secondary">
              이미지를 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={resync}
              className="cursor-pointer rounded-button-md border border-border-default bg-bg-card px-2.5 py-1 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft"
            >
              다시 시도
            </button>
          </div>
        ) : isEmpty ? (
          <button
            type="button"
            onClick={() => modal.open('upload')}
            className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-button-md border-2 border-dashed border-border-default bg-bg-surface hover:border-border-primary/40 hover:bg-blue-bg-soft"
          >
            <ImageIcon />
            <span className="text-caption text-text-secondary">
              이미지 추가
            </span>
          </button>
        ) : (
          <div className="group/image relative aspect-video overflow-hidden rounded-button-md bg-bg-hover">
            {current ? (
              /* eslint-disable-next-line @next/next/no-img-element -- 저장소(S3) 도메인이 확정되지 않아 next/image 원격 패턴을 걸 수 없다 */
              <img
                src={current.imageUrl}
                alt={imageAltText(current)}
                className="size-full object-cover"
              />
            ) : (
              <span
                aria-label="이미지를 불러오는 중입니다"
                role="status"
                className="block size-full animate-pulse bg-bg-hover"
              />
            )}

            {current && (
              <>
                <button
                  type="button"
                  aria-label="크게 보기"
                  onClick={() => modal.open('lightbox')}
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
                  isOpen={menu.isOpen}
                  isDeleting={isDeleting}
                  onToggle={() => (menu.isOpen ? menu.close() : menu.open())}
                  onEdit={() => {
                    menu.close();
                    modal.open('edit');
                  }}
                  onDownload={() => {
                    menu.close();
                    download(current.imgId);
                  }}
                  onDelete={() => {
                    menu.close();
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
          className="h-3.5 truncate text-caption leading-[14px] text-text-secondary"
        >
          {current?.caption || ' '}
        </p>

        {/* 조회 실패는 위 재시도 판이 맡는다. 여기는 다운로드 · 삭제처럼 동작 실패만 */}
        {errorMessage && (
          <p role="alert" className="text-micro break-keep text-text-danger">
            {errorMessage}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
          <span className="shrink-0 font-mono text-micro text-text-secondary">
            {current && totalCount ? `${orderIndex} / ${totalCount}` : '—'}
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            <TextButton onClick={() => modal.open('upload')}>
              <PlusIcon /> 추가
            </TextButton>
            {current && (
              <>
                <span className="text-caption text-text-muted">|</span>
                <TextButton onClick={() => download()}>
                  <DownloadIcon /> 전체 다운로드
                </TextButton>
              </>
            )}
          </div>
        </div>
      </div>

      {modal.isOpen('upload') && (
        <ImageUploadModal
          imgBlockId={imgBlockId}
          onClose={modal.close}
          onUploaded={(created) => {
            modal.close();
            /*
             * 생성 응답이 **서버가 매긴 정렬 번호까지 담아** 준다 — 따로 조회하지 않는다.
             * (예전에는 `orderIndex - 1` 로 되짚어 받으려다 첫 장에서 0 을 불러 실패했다)
             */
            applyCreated(created);
          }}
        />
      )}

      {modal.isOpen('edit') && (
        <ImageEditModal
          imgBlockId={imgBlockId}
          seed={current}
          onClose={modal.close}
          onSaved={(images) => {
            modal.close();
            applyImages(images);
          }}
          // 부분 실패 뒤 서버에서 다시 읽어 온 목록 — 모달은 열어 둔 채 카드만 맞춘다
          onResynced={applyImages}
        />
      )}

      {modal.isOpen('lightbox') && current && (
        <ImageLightbox
          image={current}
          orderIndex={orderIndex}
          totalCount={totalCount}
          isLoading={isLoading}
          // 모달이 카드를 덮는다 — 다운로드 실패는 모달 안에서 보여야 한다
          errorMessage={errorMessage}
          canGoPrev={canGoPrev || canLoop}
          canGoNext={canGoNext || canLoop}
          onPrev={() => go(-1, true)}
          onNext={() => go(1, true)}
          onDownload={() => download(current.imgId)}
          onClose={modal.close}
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
      className={`absolute top-1/2 ${position} flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-pill bg-black/50 text-text-white opacity-0 group-focus-within/image:opacity-100 group-hover/image:opacity-100 hover:bg-black/70 disabled:cursor-progress`}
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
        className={`flex size-6 cursor-pointer items-center justify-center rounded-button-md bg-black/50 text-text-white hover:bg-black/70 ${
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
          className="absolute top-7 right-0 z-20 flex w-32 flex-col overflow-hidden rounded-lg border border-border-default bg-bg-card shadow-lg"
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
      className={`cursor-pointer px-2.5 py-1.5 text-left text-caption font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'text-text-danger hover:bg-red-bg-soft'
          : 'text-text-primary hover:bg-bg-surface'
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
      className="flex cursor-pointer items-center gap-1 rounded-button-sm px-1 py-0.5 text-caption text-text-secondary hover:bg-blue-bg-soft hover:text-text-primary-blue"
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
      className="size-5 text-text-secondary"
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
