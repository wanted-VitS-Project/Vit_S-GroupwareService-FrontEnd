'use client';

import { useEffect, useRef, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';
import { notifyToast } from '@/components/Toast';
import { messageOf } from '@/lib/api';
import { useFlipReorder } from '@/lib/useFlipReorder';

import { formatFileSize } from '../file/format';
import { createImageItems } from './api';
import {
  IMAGE_ACCEPT,
  IMAGE_CAPTION_MAX_LENGTH,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_UPLOAD_MAX_COUNT,
  IMAGE_UPLOAD_MAX_TOTAL_BYTES,
  isAllowedImageType,
  type BlockImage,
} from './types';
import { useDragAutoScroll } from './useDragAutoScroll';

// 모달 안 목록은 짧다 — 가장자리 띠와 속도를 보드보다 좁게 잡는다.
const MODAL_AUTO_SCROLL = { edgePx: 56, maxStepPx: 12 };

// 안내 문구용 — 상수에서 뽑아 쓴다 (제한값이 바뀌면 문구도 함께 따라온다).
const MAX_SIZE_LABEL = `${IMAGE_MAX_SIZE_BYTES / 1024 / 1024}MB`;
const MAX_TOTAL_LABEL = `${IMAGE_UPLOAD_MAX_TOTAL_BYTES / 1024 / 1024}MB`;

// 업로드 대기 중인 한 장 — 미리보기는 로컬 object URL 로 만든다.
interface QueuedImage {
  /** 한 번 쓰면 다시 쓰지 않는 일련번호. 파일명·길이로 만들면 뺐다 다시 담을 때 값이 겹친다 */
  key: string;
  file: File;
  previewUrl: string;
  caption: string;
}

// 이미지 등록 모달. 목록의 순서가 곧 정렬 번호다 — files 배열 순서 그대로 보내고 서버가 1번부터 매긴다.
// 그래서 올리기 전에 드래그로 자리를 바꿀 수 있게 하고, 캡션은 같은 순서의 captions 배열로 함께 보낸다.
export default function ImageUploadModal({
  imgBlockId,
  onClose,
  onUploaded,
}: {
  imgBlockId: number;
  onClose: () => void;
  /** 서버가 매긴 정렬 번호가 담긴 생성 결과 */
  onUploaded: (images: BlockImage[]) => void;
}) {
  const [queued, setQueued] = useState<QueuedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const [isDropping, setIsDropping] = useState(false);
  // 순서 변경용 — 끌고 있는 항목과 지금 올라가 있는 항목.
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  // 자리가 바뀌는 순간에만 도는 미끄러짐 효과.
  const slide = useFlipReorder<string>();
  // 위·아래 끝으로 끌면 목록이 따라 굴러가게 한다.
  const listRef = useRef<HTMLDivElement>(null);
  useDragAutoScroll(draggingKey !== null, listRef, MODAL_AUTO_SCROLL);
  // 다음 항목에 붙일 일련번호. 뺐다 다시 담아도 값이 겹치지 않는다.
  const nextKeyRef = useRef(0);

  function requestClose() {
    if (isUploading) return;
    if (queued.length > 0) setIsLeaveConfirmOpen(true);
    else onClose();
  }

  // 미리보기 object URL 은 모달이 닫힐 때 한 번에 정리한다.
  const queuedRef = useRef<QueuedImage[]>([]);
  useEffect(() => {
    queuedRef.current = queued;
  }, [queued]);
  useEffect(
    () => () =>
      queuedRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)),
    [],
  );

  function addFiles(files: FileList | null) {
    const picked = [...(files ?? [])];
    if (picked.length === 0) return;

    // 안내 문구(JPG·PNG·GIF·WEBP)와 같은 목록으로만 거른다.
    const accepted = picked.filter((file) => isAllowedImageType(file.type));
    const withinSize = accepted.filter(
      (file) => file.size <= IMAGE_MAX_SIZE_BYTES,
    );

    // 요청 한 번의 상한까지만 담는다. 블록이 담을 수 있는 총 장수에는 제한이 없어,
    // 넘친 건 잘못된 파일이 아니라 이번 요청에 안 들어갈 뿐이다 — 조용히 버리지 않고
    // 몇 장이 남았는지 알려 나눠 올리도록 안내한다.
    let count = queued.length;
    let totalBytes = queued.reduce((sum, item) => sum + item.file.size, 0);
    const fitted: File[] = [];

    for (const file of withinSize) {
      if (
        count + 1 > IMAGE_UPLOAD_MAX_COUNT ||
        totalBytes + file.size > IMAGE_UPLOAD_MAX_TOTAL_BYTES
      ) {
        break;
      }

      fitted.push(file);
      count += 1;
      totalBytes += file.size;
    }

    const reasons: string[] = [];

    if (accepted.length < picked.length) {
      reasons.push('JPG · PNG · GIF · WEBP 이미지만 올릴 수 있습니다.');
    }
    if (withinSize.length < accepted.length) {
      reasons.push(`한 장은 ${MAX_SIZE_LABEL} 까지 올릴 수 있습니다.`);
    }
    if (fitted.length < withinSize.length) {
      reasons.push(
        `한 번에 ${IMAGE_UPLOAD_MAX_COUNT}장 · 합계 ${MAX_TOTAL_LABEL} 까지 올릴 수 있습니다.` +
          ` 남은 ${withinSize.length - fitted.length}장은 올린 뒤 이어서 올려주세요.`,
      );
    }

    setErrorMessage(reasons.join(' '));

    if (fitted.length === 0) return;

    setQueued((previous) => [
      ...previous,
      ...fitted.map((file) => ({
        key: `queued-${nextKeyRef.current++}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      })),
    ]);
  }

  // 목록 안에서 자리를 옮긴다. 이 순서가 그대로 서버의 정렬 번호(1..N)가 된다.
  // key 로 찾는다 — 화면이 바뀌는 사이 인덱스가 어긋날 수 있다.
  function moveQueued(fromKey: string | null, toKey: string) {
    setDraggingKey(null);
    setHoverKey(null);
    if (!fromKey || fromKey === toKey) return;

    // 바뀌기 직전의 자리를 기록해 둬야 새 자리까지 미끄러진다.
    slide.capture();
    setQueued((previous) => {
      const from = previous.findIndex((item) => item.key === fromKey);
      const to = previous.findIndex((item) => item.key === toKey);
      if (from < 0 || to < 0) return previous;

      const next = [...previous];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function removeQueued(key: string) {
    // 빠진 자리만큼 아래 항목들이 올라온다 — 같은 효과로 잇는다.
    slide.capture();
    setQueued((previous) => {
      previous
        .filter((item) => item.key === key)
        .forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return previous.filter((item) => item.key !== key);
    });
  }

  async function upload() {
    if (queued.length === 0 || isUploading) return;

    setIsUploading(true);
    setErrorMessage('');

    try {
      const created = await createImageItems(
        imgBlockId,
        queued.map((item) => ({ file: item.file, caption: item.caption })),
      );
      onUploaded(
        [...created.images].sort(
          (left, right) => left.orderIndex - right.orderIndex,
        ),
      );
      // 성공하면 모달이 닫히므로 결과를 알릴 곳이 토스트뿐이다.
      notifyToast(`이미지 ${created.images.length}장을 올렸습니다.`);
    } catch (caught) {
      const message = messageOf(caught, '이미지를 올리지 못했습니다.');

      setErrorMessage(message);
      notifyToast(message, 'error');
      setIsUploading(false);
    }
  }

  return (
    <>
      <Modal
        title="이미지 등록"
        onClose={isUploading ? undefined : requestClose}
        className="flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
        header={
          <div className="flex shrink-0 items-center justify-between border-b border-border-default px-5 py-3.5">
            <h2 className="text-body-m font-semibold text-text-primary">
              이미지 등록
            </h2>
            <button
              type="button"
              aria-label="닫기"
              disabled={isUploading}
              onClick={requestClose}
              className="cursor-pointer text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        }
      >
        {/* 스크롤바는 감추고 스크롤은 그대로 둔다 — 목록이 길어져도 폭이 흔들리지 않는다 */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
          <button
            type="button"
            onClick={() => pickerRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDropping(true);
            }}
            onDragLeave={() => setIsDropping(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDropping(false);
              addFiles(event.dataTransfer.files);
            }}
            className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-base border-2 border-dashed px-4 py-6 ${
              isDropping
                ? 'border-border-primary bg-blue-bg-soft'
                : 'border-border-default hover:border-border-primary/40 hover:bg-bg-surface'
            }`}
          >
            <span className="text-label font-semibold text-text-primary">
              파일을 드래그하거나 클릭하여 업로드
            </span>
            <span className="text-caption break-keep text-text-secondary">
              JPG, PNG, GIF, WEBP · 한 장 {MAX_SIZE_LABEL}
            </span>
            {/* 블록 장수는 무제한이고 요청 한 번만 막힌다 — 그 사실을 여기서 미리 알린다 */}
            <span className="text-micro break-keep text-text-muted">
              한 번에 {IMAGE_UPLOAD_MAX_COUNT}장 · 합계 {MAX_TOTAL_LABEL} 까지
              (블록에 담는 장수는 제한 없음)
            </span>
          </button>

          <input
            ref={pickerRef}
            type="file"
            multiple
            accept={IMAGE_ACCEPT}
            aria-label="이미지 파일 선택"
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);
              // 같은 파일을 다시 고를 수 있게 값을 비운다.
              event.target.value = '';
            }}
          />

          {queued.length > 0 && (
            <div ref={listRef} className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold text-text-primary">
                  {queued.length} / {IMAGE_UPLOAD_MAX_COUNT}장 ·{' '}
                  {formatFileSize(
                    queued.reduce((sum, item) => sum + item.file.size, 0),
                  )}{' '}
                  / {MAX_TOTAL_LABEL}
                </p>
                {queued.length > 1 && (
                  <p className="text-caption text-text-secondary">
                    왼쪽 핸들을 드래그해 순서를 바꿀 수 있습니다
                  </p>
                )}
              </div>
              {queued.map((item, index) => (
                <div
                  key={item.key}
                  ref={slide.register(item.key)}
                  draggable={!isUploading}
                  onDragStart={(event) => {
                    // 파일 드롭 존과 같은 모달이라 파일 드래그로 오해되지 않게 표시해 둔다.
                    event.dataTransfer.effectAllowed = 'move';
                    setDraggingKey(item.key);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setHoverKey(item.key);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    moveQueued(draggingKey, item.key);
                  }}
                  onDragEnd={() => {
                    setDraggingKey(null);
                    setHoverKey(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg border p-2 ${
                    hoverKey === item.key && draggingKey !== item.key
                      ? 'border-border-primary/50 bg-blue-bg-soft'
                      : 'border-border-default bg-bg-surface'
                  } ${draggingKey === item.key ? 'opacity-40' : ''}`}
                >
                  <span
                    aria-hidden
                    className="flex shrink-0 cursor-grab flex-col gap-0.5 text-text-muted active:cursor-grabbing"
                  >
                    {[0, 1, 2].map((row) => (
                      <span key={row} className="flex gap-0.5">
                        <span className="size-1 rounded-pill bg-current" />
                        <span className="size-1 rounded-pill bg-current" />
                      </span>
                    ))}
                  </span>

                  {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 object URL 미리보기라 최적화 대상이 아니다 */}
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-button-md bg-bg-hover object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-detail font-medium text-text-primary">
                      {index + 1}. {item.file.name}
                    </p>
                    <input
                      value={item.caption}
                      maxLength={IMAGE_CAPTION_MAX_LENGTH}
                      aria-label={`${item.file.name} 캡션`}
                      placeholder="캡션 입력 (선택)"
                      onChange={(event) =>
                        setQueued((previous) =>
                          previous.map((current) =>
                            current.key === item.key
                              ? { ...current, caption: event.target.value }
                              : current,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-button-sm border border-border-default bg-bg-card px-2 py-1 text-caption text-text-primary outline-none placeholder:text-text-muted focus:border-border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`${item.file.name} 목록에서 빼기`}
                    disabled={isUploading}
                    onClick={() => removeQueued(item.key)}
                    className="shrink-0 cursor-pointer px-1 text-detail text-text-secondary hover:text-text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <p role="alert" className="mt-3 text-caption text-text-danger">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border-default bg-bg-surface px-5 py-3.5">
          <button
            type="button"
            onClick={requestClose}
            disabled={isUploading}
            className="btn btn-md btn-gray-outlined"
          >
            취소
          </button>
          <button
            type="button"
            onClick={upload}
            disabled={queued.length === 0 || isUploading}
            className="btn btn-md btn-primary min-w-[128px]"
          >
            {isUploading ? '올리는 중…' : `등록하기 (${queued.length})`}
          </button>
        </div>
      </Modal>
      {isLeaveConfirmOpen && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="이미지 등록을 취소할까요?"
          description={`선택한 이미지 ${queued.length}개와 입력한 캡션은 사라집니다.`}
          confirmLabel="나가기"
          isDanger
          onConfirm={onClose}
          onCancel={() => setIsLeaveConfirmOpen(false)}
        />
      )}
    </>
  );
}
