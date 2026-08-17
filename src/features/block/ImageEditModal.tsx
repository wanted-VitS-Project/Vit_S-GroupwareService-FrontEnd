'use client';

import { useEffect, useRef, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/Spinner';
import { messageOf } from '@/lib/api';
import { useFlipReorder } from '@/lib/useFlipReorder';

import { deleteImageItem, getImageItems, updateImageItems } from './api';
import {
  IMAGE_CONFLICT_MESSAGE,
  isImageVersionConflict,
  NO_VERSION_MESSAGE,
} from './errorCodes';
import {
  imageAltText,
  IMAGE_CAPTION_MAX_LENGTH,
  type BlockImage,
} from './types';
import { useDragAutoScroll } from './useDragAutoScroll';

/** 모달 안 목록은 짧다 — 가장자리 띠와 속도를 보드보다 좁게 잡는다 */
const MODAL_AUTO_SCROLL = { edgePx: 56, maxStepPx: 12 };

function imageSignature(images: BlockImage[]) {
  return JSON.stringify(
    images.map(({ imgId, caption }) => ({ imgId, caption })),
  );
}

/**
 * 목록에 담긴 이미지가 **같은 식구인지**. (개수 · `imgId` 만 본다 — 순서는 저장 대상이라 뺀다)
 *
 * ⚠️ 낙관적 락은 **남아 있는 항목의 변경**만 잡는다. 그 사이 남이 이미지를 지우거나
 *    새로 올린 것은 버전으로 드러나지 않는다 — 지워진 것은 요청에서 빠져 있어도
 *    409 가 안 나고, 새로 올라온 것은 우리 배열에 없어서 **저장하는 순간 삭제된다.**
 *    그래서 저장 직전에 목록을 한 번 더 읽어 이걸로 대조한다.
 */
function sameMembers(left: BlockImage[], right: BlockImage[]) {
  if (left.length !== right.length) return false;

  const ids = new Set(right.map((image) => image.imgId));
  return left.every((image) => ids.has(image.imgId));
}

/**
 * 이미지 수정 모달 — 순서 변경 · 캡션 편집 · 삭제.
 *
 * 수정 API 가 **정렬된 전체 목록**을 받는 전체 치환이라, 카드가 들고 있는 한 장으로는
 * 부족하다. 열 때 전체 목록 조회(`getImageItems`)로 한 번에 받아 그대로 되보낸다.
 * (이 조회와 수정 · 삭제는 모두 **편집 권한**이 필요하다)
 *
 * 삭제는 모달 안에서 표시만 해 두고 **저장할 때** 실제로 지운다 —
 * 취소로 닫으면 아무것도 바뀌지 않아야 한다.
 */
export default function ImageEditModal({
  imgBlockId,
  seed,
  onClose,
  onSaved,
  onResynced,
}: {
  imgBlockId: number;
  /** 카드가 이미 들고 있는 한 장 — 목록을 받는 동안 보여줄 값 */
  seed: BlockImage | null;
  onClose: () => void;
  /** 저장 후의 정렬된 전체 목록 */
  onSaved: (images: BlockImage[]) => void;
  /** 부분 실패 뒤 서버에서 다시 읽은 목록 — 모달은 열린 채 카드만 맞춘다 */
  onResynced: (images: BlockImage[]) => void;
}) {
  const [images, setImages] = useState<BlockImage[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  /** 저장할 때 지울 이미지 */
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmation, setConfirmation] = useState<'save' | 'leave' | null>(
    null,
  );
  const [initialSignature, setInitialSignature] = useState('');
  /** 자리가 바뀌는 순간에만 도는 미끄러짐 효과 */
  const slide = useFlipReorder<number>();
  /** 위·아래 끝으로 끌면 목록이 따라 굴러가게 한다 */
  const listRef = useRef<HTMLUListElement>(null);
  useDragAutoScroll(draggingIndex !== null, listRef, MODAL_AUTO_SCROLL);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getImageItems(imgBlockId, signal)
      .then((loaded) => {
        // 서버가 정렬해 주지만, 순서가 곧 저장 값이라 화면에서 한 번 더 맞춘다
        const sorted = [...loaded.images].sort(
          (left, right) => left.orderIndex - right.orderIndex,
        );
        setInitialSignature(imageSignature(sorted));
        setImages(sorted);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!signal.aborted) setLoadFailed(true);
      });

    return () => controller.abort();
  }, [imgBlockId, retryCount]);

  const shown = images ?? (seed ? [seed] : []);
  const remaining = shown.filter((image) => !removedIds.includes(image.imgId));
  const isDirty = Boolean(
    images &&
    (removedIds.length > 0 || imageSignature(images) !== initialSignature),
  );

  function requestClose() {
    if (isSaving) return;
    if (isDirty) setConfirmation('leave');
    else onClose();
  }

  function requestSave() {
    if (isSaving || !images) return;
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirmation('save');
  }

  function move(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    // 바뀌기 **직전**의 자리를 기록해 둬야 새 자리까지 미끄러진다
    slide.capture();
    setImages((previous) => {
      if (!previous) return previous;
      const next = [...previous];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function updateCaption(imgId: number, caption: string) {
    setImages(
      (previous) =>
        previous?.map((image) =>
          image.imgId === imgId ? { ...image, caption } : image,
        ) ?? previous,
    );
  }

  /**
   * 저장이 중간에 끊긴 뒤 **서버가 진짜 어떤 상태인지** 다시 읽어 온다.
   *
   * 삭제 3건 중 2건만 나갔거나, 삭제는 됐는데 순서 저장이 실패할 수 있다.
   * 그대로 두면 화면은 옛 목록을 들고 있는데 서버에는 이미 지워진 이미지가 있다 —
   * 사용자가 다시 저장을 눌러도 없는 `imgId` 를 보내게 된다.
   */
  /** 서버에서 읽어 온 목록으로 화면을 갈아끼운다 — 편집 중이던 순서 · 캡션은 버린다 */
  function applyLatest(latest: BlockImage[], reason: string) {
    const sorted = [...latest].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    );
    setImages(sorted);
    setRemovedIds([]);
    setInitialSignature(imageSignature(sorted));
    onResynced(sorted);
    setErrorMessage(`${reason} 서버의 최신 목록으로 되돌렸습니다.`);
  }

  async function resync(reason: string) {
    try {
      const loaded = await getImageItems(imgBlockId);
      applyLatest(loaded.images, reason);
    } catch {
      setErrorMessage(
        `${reason} 최신 목록도 불러오지 못했습니다 — 창을 닫고 새로고침해주세요.`,
      );
    }
  }

  async function save() {
    if (isSaving || !images) return;

    setConfirmation(null);
    setIsSaving(true);
    setErrorMessage('');

    const kept = images.filter((image) => !removedIds.includes(image.imgId));

    /*
     * ⚠️ 버전 없이 보내면 400 (`IMAGE_VERSION_REQUIRED`) 이다. 한 장이라도 없으면
     *    배열 전체가 막히므로, 부분만 보내지 않고 저장 자체를 멈추고 새로고침을 안내한다.
     */
    if (kept.some((image) => image.version === undefined)) {
      setErrorMessage(NO_VERSION_MESSAGE);
      setIsSaving(false);
      return;
    }

    /*
     * 저장 직전에 목록을 한 번 더 읽어 **식구가 그대로인지** 본다 (`sameMembers` 주석 참고).
     * 다르면 저장하지 않고 최신 목록으로 갈아 끼운 뒤 사용자에게 확인을 맡긴다 —
     * 이 상태로 보내면 남이 방금 올린 이미지가 배열에서 빠져 **조용히 삭제된다.**
     */
    try {
      const latest = await getImageItems(imgBlockId);
      if (!sameMembers(images, latest.images)) {
        applyLatest(
          latest.images,
          '다른 사람이 이미지를 추가하거나 삭제했습니다.',
        );
        setIsSaving(false);
        return;
      }
    } catch {
      setErrorMessage(
        '최신 이미지 목록을 확인하지 못해 저장을 멈췄습니다. 다시 시도해주세요.',
      );
      setIsSaving(false);
      return;
    }

    /*
     * 삭제 → 순서·캡션 순으로 나간다. 지운 이미지가 섞인 목록을 보내면 정렬이 어긋난다.
     * ⚠️ 이 둘을 한 번에 처리하는 API 가 없어 **중간에 끊길 수 있다** (부분 반영).
     *    그래서 실패하면 반드시 서버 상태를 다시 읽어 화면과 맞춘다.
     */
    let hasDeleted = false;

    try {
      for (const imgId of removedIds) {
        await deleteImageItem(imgId);
        hasDeleted = true;
      }

      if (kept.length > 0) {
        await updateImageItems(
          imgBlockId,
          /*
           * ⚠️ 방금 재조회한 버전이 아니라 **화면이 들고 있던 버전**을 보낸다.
           *    재조회 값을 실으면 그 사이 남이 고친 캡션까지 조용히 덮어쓰게 된다 —
           *    재조회는 추가 · 삭제를 알아내는 데만 쓰고, 충돌 판정은 서버에 맡긴다.
           */
          kept.map((image) => ({
            imgId: image.imgId,
            caption: image.caption,
            version: image.version as number,
          })),
        );
      }

      // 응답에 `imageUrl` 이 없어 화면에 있던 값에 새 정렬 번호만 얹는다
      onSaved(
        kept.map((image, index) => ({ ...image, orderIndex: index + 1 })),
      );
    } catch (caught) {
      // 남이 먼저 저장했다 — ⛔ `overwrite` 가 없어 재조회가 유일한 출구다
      if (isImageVersionConflict(caught)) {
        await resync(IMAGE_CONFLICT_MESSAGE);
        setIsSaving(false);
        return;
      }

      const message = messageOf(caught, '이미지를 저장하지 못했습니다.');

      // 아무것도 안 지워졌으면 서버는 그대로다 — 굳이 다시 읽지 않고 재시도만 열어 둔다
      if (hasDeleted) await resync(message);
      else setErrorMessage(message);

      setIsSaving(false);
    }
  }

  return (
    <>
      <Modal
        title="이미지 수정"
        onClose={isSaving ? undefined : requestClose}
        className="flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
        header={
          <div className="flex shrink-0 items-center justify-between border-b border-border-default px-5 py-3.5">
            <div className="flex items-center gap-2">
              <h2 className="text-body-m font-semibold text-text-primary">
                이미지 수정
              </h2>
              <span className="font-mono text-caption text-text-secondary">
                {remaining.length}장
              </span>
            </div>
            <button
              type="button"
              aria-label="닫기"
              disabled={isSaving}
              onClick={requestClose}
              className="cursor-pointer text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        }
      >
        <p className="shrink-0 border-b border-border-default bg-bg-surface px-5 py-2 text-caption text-text-secondary">
          순서를 바꾸려면 왼쪽 핸들을 드래그하세요
        </p>

        {/* 스크롤바는 감추고 스크롤은 그대로 둔다 (등록 모달과 동일) */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          {loadFailed ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-detail text-text-secondary">
                이미지 목록을 불러오지 못했습니다.
              </p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="cursor-pointer rounded-button-md border border-border-default px-2.5 py-1 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft"
              >
                다시 시도
              </button>
            </div>
          ) : !images ? (
            <LoadingSpinner
              label="이미지 목록을 불러오는 중입니다"
              className="py-16"
            />
          ) : (
            <ul ref={listRef} className="flex flex-col gap-3">
              {images.map((image, index) => {
                const isRemoved = removedIds.includes(image.imgId);

                return (
                  <li
                    key={image.imgId}
                    ref={slide.register(image.imgId)}
                    draggable={!isRemoved && !isSaving}
                    onDragStart={() => setDraggingIndex(index)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setHoverIndex(index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggingIndex !== null) move(draggingIndex, index);
                      setDraggingIndex(null);
                      setHoverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggingIndex(null);
                      setHoverIndex(null);
                    }}
                    className={`flex gap-3 rounded-base border p-2.5 ${
                      hoverIndex === index && draggingIndex !== index
                        ? 'border-border-primary/50 bg-blue-bg-soft'
                        : 'border-border-default'
                    } ${draggingIndex === index ? 'opacity-40' : ''} ${
                      isRemoved ? 'opacity-50' : ''
                    }`}
                  >
                    <span
                      aria-hidden
                      className="flex cursor-grab flex-col justify-center gap-0.5 text-text-muted active:cursor-grabbing"
                    >
                      {[0, 1, 2].map((row) => (
                        <span key={row} className="flex gap-0.5">
                          <span className="size-1 rounded-pill bg-current" />
                          <span className="size-1 rounded-pill bg-current" />
                        </span>
                      ))}
                    </span>

                    {/* eslint-disable-next-line @next/next/no-img-element -- 저장소(S3) 도메인이 확정되지 않아 next/image 원격 패턴을 걸 수 없다 */}
                    <img
                      src={image.imageUrl}
                      alt={imageAltText(image)}
                      className="size-16 shrink-0 rounded-lg bg-bg-hover object-cover"
                    />

                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                      <p className="truncate font-mono text-micro text-text-secondary">
                        {isRemoved ? '삭제 예정' : `이미지 ${index + 1}`} ·{' '}
                        {image.originalName}
                      </p>
                      <input
                        value={image.caption}
                        maxLength={IMAGE_CAPTION_MAX_LENGTH}
                        disabled={isRemoved || isSaving}
                        aria-label={`이미지 ${index + 1} 캡션`}
                        placeholder="캡션 입력 (선택)"
                        onChange={(event) =>
                          updateCaption(image.imgId, event.target.value)
                        }
                        className="w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-1.5 text-detail text-text-primary outline-none placeholder:text-text-muted focus:border-border-primary disabled:cursor-not-allowed"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isSaving}
                      aria-label={
                        isRemoved
                          ? `이미지 ${index + 1} 삭제 취소`
                          : `이미지 ${index + 1} 삭제`
                      }
                      onClick={() =>
                        setRemovedIds((previous) =>
                          isRemoved
                            ? previous.filter((id) => id !== image.imgId)
                            : [...previous, image.imgId],
                        )
                      }
                      className={`shrink-0 cursor-pointer self-center rounded-button-md px-1.5 py-1 text-caption font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                        isRemoved
                          ? 'text-text-primary-blue hover:bg-blue-bg-soft'
                          : 'text-text-secondary hover:bg-red-bg-soft hover:text-text-danger'
                      }`}
                    >
                      {isRemoved ? '되돌리기' : '삭제'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {errorMessage && (
            <p role="alert" className="mt-3 text-caption text-text-danger">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border-default bg-bg-surface px-5 py-3.5">
          <span className="text-caption text-text-secondary">
            {removedIds.length > 0 && `저장 시 ${removedIds.length}장 삭제`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSaving}
              className="btn btn-md btn-gray-outlined"
            >
              취소
            </button>
            <button
              type="button"
              onClick={requestSave}
              disabled={isSaving || !images}
              className="btn btn-md btn-primary min-w-[104px]"
            >
              {isSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </Modal>
      {confirmation === 'save' && (
        <AlertDialogTwoButton
          icon={removedIds.length > 0 ? DialogIcons.warning : DialogIcons.info}
          title="이미지 변경사항을 저장할까요?"
          description={
            removedIds.length > 0
              ? `저장하면 이미지 ${removedIds.length}장이 삭제됩니다.`
              : '변경한 이미지 순서와 캡션을 저장합니다.'
          }
          confirmLabel="저장"
          isDanger={removedIds.length > 0}
          onConfirm={save}
          onCancel={() => setConfirmation(null)}
        />
      )}
      {confirmation === 'leave' && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="수정을 취소할까요?"
          description="저장하지 않은 이미지 변경사항은 사라집니다."
          confirmLabel="나가기"
          isDanger
          onConfirm={onClose}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </>
  );
}
