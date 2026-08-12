'use client';

import { useId, useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { createEmployeeGroup, updateEmployeeGroup } from './api';
import { GROUP_CODES } from './errorCodes';
import {
  type EmployeeGroup,
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  type UpdateEmployeeGroupRequest,
} from './types';

interface EmployeeGroupFormModalProps {
  /** 있으면 수정, 없으면 추가 */
  group?: EmployeeGroup;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 그룹 추가 · 수정 모달. (.ai/API.md 92 · 93)
 *
 * 구성원은 여기서 다루지 않는다 — 생성은 **빈 그룹을 만든 뒤 구성원을 따로 추가**하는
 * 2단계이고, 수정도 이름 · 설명만 바꾼다.
 */
export default function EmployeeGroupFormModal({
  group,
  onClose,
  onSaved,
}: EmployeeGroupFormModalProps) {
  const nameId = useId();
  const descriptionId = useId();
  const isEditing = group !== undefined;

  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 값을 고치면 직전 서버 오류는 더 이상 맞지 않는다 */
  function change(setValue: (value: string) => void, value: string) {
    setValue(value);
    setNameError('');
    setError('');
  }

  /** 저장 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();

  /**
   * 수정은 **바뀐 필드만** 보낸다. 하나도 없으면 서버가 400 을 주므로
   * 그 전에 버튼을 막는다.
   */
  const changed: UpdateEmployeeGroupRequest = {};
  if (!isEditing || trimmedName !== group.name) changed.name = trimmedName;
  if (!isEditing || trimmedDescription !== (group.description ?? '')) {
    changed.description = trimmedDescription;
  }

  const canSubmit =
    trimmedName !== '' && Object.keys(changed).length > 0 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setNameError('');
    setError('');
    setIsSubmitting(true);

    try {
      if (group) {
        await updateEmployeeGroup(group.groupId, changed);
      } else {
        await createEmployeeGroup({
          name: trimmedName,
          // 빈 설명은 보내지 않는다 — 선택 항목이다
          description: trimmedDescription || undefined,
        });
      }

      onSaved();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;
      const message = messageOf(caught, '저장하지 못했습니다.');

      // 이름 문제는 어느 입력이 문제인지 알 수 있어 필드에 붙인다
      if (
        code === GROUP_CODES.nameDuplicated ||
        code === GROUP_CODES.invalidRequest
      ) {
        setNameError(message);
      } else if (code === GROUP_CODES.notFound) {
        // 남이 먼저 지운 그룹 — 목록만 갱신하고 닫는다
        onSaved();
        onClose();
        return;
      } else {
        setError(message);
      }

      setIsSubmitting(false);
    }
  }

  return (
    <PanelModal
      title={isEditing ? '그룹 수정' : '그룹 추가'}
      onClose={requestClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <div>
            <div className="flex items-end justify-between gap-2 pb-1.5">
              <label
                htmlFor={nameId}
                className="text-[11px] font-semibold text-text-primary"
              >
                그룹명 <span className="text-text-danger">*</span>
              </label>
              <span className="text-caption text-text-secondary">
                {name.length} / {GROUP_NAME_MAX_LENGTH}
              </span>
            </div>
            <input
              id={nameId}
              type="text"
              value={name}
              maxLength={GROUP_NAME_MAX_LENGTH}
              onChange={(event) => change(setName, event.target.value)}
              placeholder="입찰 검토팀"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? `${nameId}-error` : undefined}
              className={`w-full rounded-lg border bg-bg-surface px-3 py-2 text-[11px] text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 ${
                nameError
                  ? 'border-border-danger focus:outline-border-danger'
                  : 'border-border-default focus:outline-border-primary'
              }`}
            />
            {nameError ? (
              <p
                id={`${nameId}-error`}
                role="alert"
                className="mt-1 text-caption break-keep text-text-danger"
              >
                {nameError}
              </p>
            ) : (
              <p className="mt-1 text-caption break-keep text-text-secondary">
                그룹명은 전체에서 중복될 수 없습니다.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-end justify-between gap-2 pb-1.5">
              <label
                htmlFor={descriptionId}
                className="text-[11px] font-semibold text-text-primary"
              >
                설명
              </label>
              <span className="text-caption text-text-secondary">
                {description.length} / {GROUP_DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id={descriptionId}
              value={description}
              rows={3}
              maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
              onChange={(event) => change(setDescription, event.target.value)}
              placeholder="어떤 일을 함께 하는 그룹인지 적어두면 고를 때 헷갈리지 않습니다."
              className="w-full resize-none rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-[11px] text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
            />
          </div>

          {!isEditing && (
            <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-caption leading-relaxed break-keep text-text-secondary">
              먼저 빈 그룹을 만든 뒤 구성원을 추가합니다.
            </p>
          )}
        </div>

        <ModalFooter>
          {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
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
              className="btn btn-sm btn-gray-outlined"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-sm btn-primary"
            >
              {isSubmitting ? '저장 중…' : isEditing ? '저장' : '추가'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}
