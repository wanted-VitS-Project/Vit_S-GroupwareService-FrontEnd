'use client';

import { useEffect, useRef, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';
import { messageOf } from '@/lib/api';
import { useFlipReorder } from '@/lib/useFlipReorder';

import { deleteImageItem, getImageItems, updateImageItems } from './api';
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
  async function resync(reason: string) {
    try {
      const loaded = await getImageItems(imgBlockId);
      const sorted = [...loaded.images].sort(
        (left, right) => left.orderIndex - right.orderIndex,
      );
      setImages(sorted);
      setRemovedIds([]);
      setInitialSignature(imageSignature(sorted));
      onResynced(sorted);
      setErrorMessage(`${reason} 서버의 최신 목록으로 되돌렸습니다.`);
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

      const kept = images.filter((image) => !removedIds.includes(image.imgId));
      if (kept.length > 0) {
        await updateImageItems(
          imgBlockId,
          kept.map((image) => ({ imgId: image.imgId, caption: image.caption })),
        );
      }

      // 응답에 `imageUrl` 이 없어 화면에 있던 값에 새 정렬 번호만 얹는다
      onSaved(
        kept.map((image, index) => ({ ...image, orderIndex: index + 1 })),
      );
    } catch (caught) {
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
            <div
              role="status"
              aria-label="이미지 목록을 불러오는 중입니다"
              className="flex flex-col gap-3"
            >
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-[76px] animate-pulse rounded-base bg-bg-surface"
                />
              ))}
            </div>
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
              className="cursor-pointer rounded-lg px-4 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="button"
              onClick={requestSave}
              disabled={isSaving || !images}
              className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
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
