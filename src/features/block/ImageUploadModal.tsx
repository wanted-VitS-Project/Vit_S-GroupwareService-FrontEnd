'use client';

import { useEffect, useRef, useState } from 'react';

import Modal from '@/components/Modal';
import { messageOf } from '@/lib/api';
import { useFlipReorder } from '@/lib/useFlipReorder';

import { createImageItems } from './api';
import {
  IMAGE_CAPTION_MAX_LENGTH,
  IMAGE_MAX_SIZE_BYTES,
  type BlockImage,
} from './types';
import { useDragAutoScroll } from './useDragAutoScroll';

/** 모달 안 목록은 짧다 — 가장자리 띠와 속도를 보드보다 좁게 잡는다 */
const MODAL_AUTO_SCROLL = { edgePx: 56, maxStepPx: 12 };

/** 업로드 대기 중인 한 장 — 미리보기는 로컬 object URL 로 만든다 */
interface QueuedImage {
  /** 목록 key. 같은 파일을 두 번 골라도 갈리게 한다 */
  key: string;
  file: File;
  previewUrl: string;
  caption: string;
}

/**
 * 이미지 등록 모달.
 *
 * **목록의 순서가 곧 정렬 번호다** — `files` 배열 순서 그대로 보내고 서버가 1번부터 매긴다.
 * 그래서 올리기 전에 드래그로 자리를 바꿀 수 있게 한다 (수정 모달과 같은 방식).
 * 캡션은 같은 순서의 `captions` 배열로 함께 보낸다 (비우면 빈 문자열).
 */
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
  const pickerRef = useRef<HTMLInputElement>(null);
  const [isDropping, setIsDropping] = useState(false);
  /** 순서 변경용 — 끌고 있는 항목과 지금 올라가 있는 항목 */
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  /** 자리가 바뀌는 순간에만 도는 미끄러짐 효과 */
  const slide = useFlipReorder<string>();
  /** 위·아래 끝으로 끌면 목록이 따라 굴러가게 한다 */
  const listRef = useRef<HTMLDivElement>(null);
  useDragAutoScroll(draggingKey !== null, listRef, MODAL_AUTO_SCROLL);

  // 미리보기 object URL 은 모달이 닫힐 때 한 번에 정리한다
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

    const accepted = picked.filter((file) => file.type.startsWith('image/'));
    const withinSize = accepted.filter(
      (file) => file.size <= IMAGE_MAX_SIZE_BYTES,
    );

    if (withinSize.length < picked.length) {
      setErrorMessage(
        accepted.length < picked.length
          ? '이미지 파일만 올릴 수 있습니다.'
          : '10MB 이하 이미지만 올릴 수 있습니다.',
      );
    } else {
      setErrorMessage('');
    }

    setQueued((previous) => [
      ...previous,
      ...withinSize.map((file, index) => ({
        key: `${file.name}-${file.lastModified}-${previous.length + index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      })),
    ]);
  }

  /**
   * 목록 안에서 자리를 옮긴다. 이 순서가 그대로 서버의 정렬 번호(1..N)가 된다.
   * `key` 로 찾는다 — 화면이 바뀌는 사이 인덱스가 어긋날 수 있다.
   */
  function moveQueued(fromKey: string | null, toKey: string) {
    setDraggingKey(null);
    setHoverKey(null);
    if (!fromKey || fromKey === toKey) return;

    // 바뀌기 **직전**의 자리를 기록해 둬야 새 자리까지 미끄러진다
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
    // 빠진 자리만큼 아래 항목들이 올라온다 — 같은 효과로 잇는다
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
    } catch (caught) {
      setErrorMessage(messageOf(caught, '이미지를 올리지 못했습니다.'));
      setIsUploading(false);
    }
  }

  return (
    <Modal
      title="이미지 등록"
      onClose={isUploading ? undefined : onClose}
      className="flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      header={
        <div className="flex shrink-0 items-center justify-between border-b border-[#1C1F2A]/10 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#1C1F2A]">이미지 등록</h2>
          <button
            type="button"
            aria-label="닫기"
            disabled={isUploading}
            onClick={onClose}
            className="cursor-pointer text-[#6C7389] hover:text-[#1C1F2A] disabled:cursor-not-allowed disabled:opacity-40"
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
          className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 ${
            isDropping
              ? 'border-[#3B5BDB] bg-[#3B5BDB]/5'
              : 'border-[#1C1F2A]/10 hover:border-[#3B5BDB]/40 hover:bg-[#ECEEF4]/50'
          }`}
        >
          <span className="text-xs font-semibold text-[#1C1F2A]">
            파일을 드래그하거나 클릭하여 업로드
          </span>
          <span className="text-[10px] text-[#6C7389]">
            JPG, PNG, GIF, WEBP · 최대 10MB
          </span>
        </button>

        <input
          ref={pickerRef}
          type="file"
          multiple
          accept="image/*"
          aria-label="이미지 파일 선택"
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            // 같은 파일을 다시 고를 수 있게 값을 비운다
            event.target.value = '';
          }}
        />

        {queued.length > 0 && (
          <div ref={listRef} className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold text-[#1C1F2A]">
                {queued.length}개 파일 선택됨
              </p>
              {queued.length > 1 && (
                <p className="text-[10px] text-[#6C7389]">
                  왼쪽 핸들을 드래그해 순서를 바꿀 수 있어요
                </p>
              )}
            </div>
            {queued.map((item, index) => (
              <div
                key={item.key}
                ref={slide.register(item.key)}
                draggable={!isUploading}
                onDragStart={(event) => {
                  // 파일 드롭 존과 같은 모달이라 파일 드래그로 오해되지 않게 표시해 둔다
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
                    ? 'border-[#3B5BDB]/50 bg-[#3B5BDB]/5'
                    : 'border-[#1C1F2A]/10 bg-[#ECEEF4]/30'
                } ${draggingKey === item.key ? 'opacity-40' : ''}`}
              >
                <span
                  aria-hidden
                  className="flex shrink-0 cursor-grab flex-col gap-0.5 text-[#6C7389]/50 active:cursor-grabbing"
                >
                  {[0, 1, 2].map((row) => (
                    <span key={row} className="flex gap-0.5">
                      <span className="size-1 rounded-full bg-current" />
                      <span className="size-1 rounded-full bg-current" />
                    </span>
                  ))}
                </span>

                {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 object URL 미리보기라 최적화 대상이 아니다 */}
                <img
                  src={item.previewUrl}
                  alt=""
                  className="size-10 shrink-0 rounded-md bg-[#ECEEF4] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-[#1C1F2A]">
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
                    className="mt-1 w-full rounded border border-[#1C1F2A]/10 bg-white px-2 py-1 text-[10px] text-[#1C1F2A] outline-none placeholder:text-[#6C7389]/60 focus:border-[#3B5BDB]"
                  />
                </div>
                <button
                  type="button"
                  aria-label={`${item.file.name} 목록에서 빼기`}
                  disabled={isUploading}
                  onClick={() => removeQueued(item.key)}
                  className="shrink-0 cursor-pointer px-1 text-[11px] text-[#6C7389] hover:text-[#E7000B] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="mt-3 text-[10px] text-[#E7000B]">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-[#1C1F2A]/10 bg-[#ECEEF4]/20 px-5 py-3.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isUploading}
          className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:opacity-40"
        >
          취소
        </button>
        <button
          type="button"
          onClick={upload}
          disabled={queued.length === 0 || isUploading}
          className="cursor-pointer rounded-lg bg-[#3B5BDB] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#324BB8] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
        >
          {isUploading ? '올리는 중…' : `등록하기 (${queued.length})`}
        </button>
      </div>
    </Modal>
  );
}
