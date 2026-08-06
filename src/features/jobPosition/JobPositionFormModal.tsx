'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { createJobPosition, updateJobPosition } from './api';
import { JOB_POSITION_CODES } from './errorCodes';
import { type JobPosition, JOB_POSITION_NAME_MAX_LENGTH } from './types';

interface JobPositionFormModalProps {
  /** 없으면 추가, 있으면 수정 */
  position?: JobPosition;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 직급 추가 · 수정 모달. (.ai/API.md 27 · 28)
 * 순서는 목록의 ↑↓ 버튼이 담당해서 여기서는 이름만 다룬다.
 */
export default function JobPositionFormModal({
  position,
  onClose,
  onSaved,
}: JobPositionFormModalProps) {
  const isEditing = position !== undefined;

  const [name, setName] = useState(position?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 값을 고치면 서버 오류는 더 이상 맞지 않는다 */
  function changeName(value: string) {
    setName(value);
    setNameError('');
  }

  /** 저장 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  const trimmedName = name.trim();
  const hasChanges = !isEditing || trimmedName !== position.name;
  const canSubmit = trimmedName !== '' && hasChanges && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setNameError('');
    setError('');
    setIsSubmitting(true);

    try {
      if (position) {
        await updateJobPosition(position.jobPositionId, { name: trimmedName });
      } else {
        // sortOrder 를 생략하면 백엔드가 마지막 + 1 로 넣는다
        await createJobPosition({ name: trimmedName });
      }

      onSaved();
      onClose();
    } catch (caught) {
      const failedCode = caught instanceof ApiError ? caught.code : undefined;
      const message = messageOf(caught, '저장하지 못했습니다.');

      // 중복은 어느 입력이 문제인지 알 수 있어 필드에 붙인다
      if (failedCode === JOB_POSITION_CODES.nameDuplicated) {
        setNameError(message);
      } else if (failedCode === JOB_POSITION_CODES.notFound) {
        // 남이 먼저 지운 경우 — 목록만 갱신하고 닫는다
        onSaved();
        onClose();
        return;
      } else {
        setError(message);
      }

      setIsSubmitting(false);
    }
  }

  const title = isEditing ? '직급 수정' : '직급 추가';
  const describedBy = nameError ? 'jobPositionName-error' : undefined;

  return (
    <PanelModal title={title} onClose={requestClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <div>
            <div className="flex items-end justify-between gap-2 pb-1.5">
              <label
                htmlFor="jobPositionName"
                className="text-[11px] font-semibold text-[#1C1F2A]"
              >
                직급명 <span className="text-[#E7000B]">*</span>
              </label>
              <span className="text-[10px] text-[#6C7389]">
                {name.length} / {JOB_POSITION_NAME_MAX_LENGTH}
              </span>
            </div>
            <input
              id="jobPositionName"
              type="text"
              value={name}
              maxLength={JOB_POSITION_NAME_MAX_LENGTH}
              onChange={(event) => changeName(event.target.value)}
              placeholder="선임연구원"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={describedBy}
              className={`w-full rounded-lg border bg-[#ECEEF4]/50 px-3 py-2 text-[11px] text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 ${
                nameError
                  ? 'border-[#E7000B] focus:outline-[#E7000B]'
                  : 'border-[#1C1F2A]/10 focus:outline-[#3B5BDB]'
              }`}
            />
            {nameError ? (
              <p
                id="jobPositionName-error"
                role="alert"
                className="mt-1 text-[10px] break-keep text-[#E7000B]"
              >
                {nameError}
              </p>
            ) : (
              <p className="mt-1 text-[10px] break-keep text-[#6C7389]">
                {isEditing
                  ? '이름을 바꿔도 이 직급이 지정된 사원은 그대로 유지됩니다.'
                  : '노출 순서는 추가 후 목록에서 바꿀 수 있습니다.'}
              </p>
            )}
          </div>
        </div>

        <ModalFooter>
          <p
            role={error ? 'alert' : undefined}
            className="mr-auto text-[10px] break-keep text-[#E7000B]"
          >
            {error}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="cursor-pointer rounded-lg bg-[#2B3A67] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#22305a] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
            >
              {isSubmitting ? '저장 중…' : isEditing ? '저장' : '추가'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}
