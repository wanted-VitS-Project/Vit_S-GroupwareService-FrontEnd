'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

import Modal from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { createBlock } from './api';
import { nextPosition } from './blockLayout';
import BlockTypeIcon from './BlockTypeIcon';
import {
  BLOCK_TITLE_MAX_LENGTH,
  BLOCK_TYPES,
  type BlockTypeCode,
  type StepBlock,
} from './types';

interface AddBlockModalProps {
  /** 헤더 배지에 노출할 스텝 이름 */
  stepName: string;
  /**
   * 현재 스텝의 블록 — 새 블록이 들어갈 자리를 계산하는 데만 쓴다.
   * 아직 못 불러왔으면 `null`, 이때는 위치를 보내지 않고 서버 기본값(맨 아래)에 맡긴다.
   */
  blocks: StepBlock[] | null;
  onClose: () => void;
  /** 생성 요청 직전 — 미뤄둔 배치 저장을 먼저 흘려보낼 때 쓴다 */
  onBeforeCreate?: () => void;
  /** 생성 성공 후 목록을 다시 불러올 때 쓴다 */
  onCreated?: () => void;
}

/**
 * 스텝 화면에 블록을 추가하는 모달.
 * `type` 만 필수다 — 이름(`title`)은 비워도 생성된다. (.ai/API.md 9번)
 */
export default function AddBlockModal({
  stepName,
  blocks,
  onClose,
  onBeforeCreate,
  onCreated,
}: AddBlockModalProps) {
  const params = useParams<{ stepId: string }>();

  const [selectedCode, setSelectedCode] = useState<BlockTypeCode | null>(null);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selected = BLOCK_TYPES.find((type) => type.code === selectedCode);
  const titleLabel = selected?.titleLabel ?? '블록 이름';

  function selectType(code: BlockTypeCode) {
    setSelectedCode(code);
    setErrorMessage('');

    // 이름을 직접 고치기 전이면 유형 이름을 기본값으로 채운다
    const next = BLOCK_TYPES.find((type) => type.code === code);
    if (!title || title === selected?.label) setTitle(next?.label ?? '');
  }

  async function submit() {
    if (!selected || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    // 미뤄둔 배치 저장을 먼저 내보낸다 — 생성 뒤에 나가면 새 블록이 빠진 배치를 보내게 된다
    onBeforeCreate?.();

    try {
      await createBlock(params.stepId, {
        type: selected.code,
        // 비어 있으면 보내지 않는다 — 선택 필드다
        title: title.trim() || undefined,
        // 유형별 기본 폭을 항상 함께 보낸다 (1칸 또는 2칸)
        colSpan: selected.defaultColSpan,
        // 맨 뒤 — 마지막 행에 칸이 남으면 그 오른쪽, 모자라면 새 행
        ...(blocks ? nextPosition(blocks, selected.defaultColSpan) : {}),
      });
      onCreated?.();
      onClose();
    } catch (caught) {
      setErrorMessage(messageOf(caught, '블록을 추가하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="Block 추가"
      onClose={onClose}
      className="w-full max-w-[640px] overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      header={
        <div className="flex items-center justify-between gap-2 border-b border-[#1C1F2A]/10 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded border border-[#3B5BDB]/20 bg-[#3B5BDB]/10 text-[#3B5BDB]">
              <BlockTypeIcon code="TEXT" />
            </span>
            <h2 className="text-sm font-semibold text-[#1C1F2A]">Block 추가</h2>
            <span className="truncate rounded bg-[#ECEEF4] px-1.5 py-0.5 text-[10px] text-[#6C7389]">
              {stepName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#6C7389] hover:bg-[#ECEEF4]"
          >
            <CloseIcon />
          </button>
        </div>
      }
    >
      <div className="max-h-[70vh] overflow-y-auto p-5">
        <p className="text-[9px] tracking-[0.9px] text-[#6C7389] uppercase">
          블록 유형 선택 ({BLOCK_TYPES.length})
        </p>

        <div
          role="radiogroup"
          aria-label="블록 유형"
          className="mt-3 grid grid-cols-2 gap-x-2 gap-y-3"
        >
          {BLOCK_TYPES.map((type) => {
            const isSelected = type.code === selectedCode;

            return (
              <button
                key={type.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => selectType(type.code)}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left ${
                  isSelected
                    ? 'border-[#3B5BDB] bg-[#3B5BDB]/5'
                    : 'border-[#1C1F2A]/10 hover:bg-[#ECEEF4]/40'
                }`}
              >
                <span
                  style={{
                    backgroundColor: type.background,
                    borderColor: type.border,
                    color: type.icon,
                  }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border"
                >
                  <BlockTypeIcon code={type.code} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-[#1C1F2A]">
                    {type.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-medium break-keep text-[#6C7389]">
                    {type.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <label className="mt-5 block">
          <span className="block pb-1.5 text-[11px] font-semibold text-[#1C1F2A]">
            {titleLabel}{' '}
            <span className="font-normal text-[#6C7389]">(선택)</span>
          </span>
          <input
            type="text"
            value={title}
            maxLength={BLOCK_TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              selected?.titleLabel
                ? '예: 1차 기성'
                : '블록의 이름을 입력해주세요.'
            }
            className="w-full rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/50 px-3 py-2 text-[11px] text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB]"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-[#1C1F2A]/10 bg-[#ECEEF4]/20 px-5 py-3.5">
        <p
          role={errorMessage ? 'alert' : undefined}
          className={`text-[10px] ${
            errorMessage ? 'text-[#E7000B]' : 'text-[#6C7389]'
          }`}
        >
          {errorMessage ||
            (selected
              ? `${selected.label} 블록을 추가합니다`
              : '블록 유형을 선택하세요')}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!selected || isSubmitting}
            className="cursor-pointer rounded-lg bg-[#3B5BDB] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3450c4] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
          >
            {isSubmitting ? '추가 중…' : '추가하기'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="size-3.5"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
