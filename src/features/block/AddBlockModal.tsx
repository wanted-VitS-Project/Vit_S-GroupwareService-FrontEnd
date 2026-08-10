'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
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
  const currentUser = useCurrentUser();

  const [selectedCode, setSelectedCode] = useState<BlockTypeCode | null>(null);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  const selected = BLOCK_TYPES.find((type) => type.code === selectedCode);
  const titleLabel = selected?.titleLabel ?? '블록 이름';
  const isDirty = selectedCode !== null || title.trim().length > 0;

  function requestClose() {
    if (isSubmitting) return;
    if (isDirty) setIsLeaveConfirmOpen(true);
    else onClose();
  }

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
        // 새 블록은 생성자를 기본 담당자로 지정한다
        owner: currentUser.userId,
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
    <>
      <Modal
        title="Block 추가"
        onClose={isSubmitting ? undefined : requestClose}
        className="w-full max-w-[640px] overflow-hidden rounded-xl border border-border-default shadow-2xl"
        header={
          <div className="flex items-center justify-between gap-2 border-b border-border-default px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border-primary/20 bg-blue-bg-soft text-text-primary-blue">
                <BlockTypeIcon code="TEXT" />
              </span>
              <h2 className="text-sm font-semibold text-text-primary">
                Block 추가
              </h2>
              <span className="truncate rounded bg-bg-hover px-1.5 py-0.5 text-[10px] text-text-secondary">
                {stepName}
              </span>
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              aria-label="닫기"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover"
            >
              <CloseIcon />
            </button>
          </div>
        }
      >
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <p className="text-[9px] tracking-[0.9px] text-text-secondary uppercase">
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
                      ? 'border-border-primary bg-blue-bg-soft'
                      : 'border-border-default hover:bg-bg-surface'
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
                    <span className="block text-xs font-semibold text-text-primary">
                      {type.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium break-keep text-text-secondary">
                      {type.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <label className="mt-5 block">
            <span className="block pb-1.5 text-[11px] font-semibold text-text-primary">
              {titleLabel}{' '}
              <span className="font-normal text-text-secondary">(선택)</span>
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
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-[11px] text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border-default bg-bg-surface px-5 py-3.5">
          <p
            role={errorMessage ? 'alert' : undefined}
            className={`text-[10px] ${
              errorMessage ? 'text-text-danger' : 'text-text-secondary'
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
              onClick={requestClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!selected || isSubmitting}
              className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
            >
              {isSubmitting ? '추가 중…' : '추가하기'}
            </button>
          </div>
        </div>
      </Modal>
      {isLeaveConfirmOpen && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="블록 추가를 취소할까요?"
          description="선택한 블록 유형과 입력한 제목은 사라집니다."
          confirmLabel="나가기"
          isDanger
          onConfirm={onClose}
          onCancel={() => setIsLeaveConfirmOpen(false)}
        />
      )}
    </>
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
