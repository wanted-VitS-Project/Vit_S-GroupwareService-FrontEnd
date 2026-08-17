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

  /** 값을 고치면 직전 서버 오류는 더 이상 맞지 않는다 — 중복 · 일반 오류 모두 지운다 */
  function changeName(value: string) {
    setName(value);
    setNameError('');
    setError('');
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
                className="text-detail font-semibold text-text-primary"
              >
                직급명 <span className="text-text-danger">*</span>
              </label>
              <span className="text-caption text-text-secondary">
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
              className={`w-full rounded-lg border bg-bg-surface px-3 py-2 text-detail text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 ${
                nameError
                  ? 'border-border-danger focus:outline-border-danger'
                  : 'border-border-default focus:outline-border-primary'
              }`}
            />
            {nameError ? (
              <p
                id="jobPositionName-error"
                role="alert"
                className="mt-1 text-caption break-keep text-text-danger"
              >
                {nameError}
              </p>
            ) : null}
          </div>
        </div>

        <ModalFooter>
          {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 — role 을 함께 붙이면 놓친다 */}
          <p
            role="alert"
            className="mr-auto text-caption break-keep text-text-danger"
          >
            {error}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-md btn-gray-outlined"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-md btn-primary min-w-[104px]"
            >
              {isSubmitting ? '저장 중…' : isEditing ? '저장' : '추가'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}
