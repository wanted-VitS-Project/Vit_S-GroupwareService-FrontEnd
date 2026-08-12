'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { createDepartment, updateDepartment } from './api';
import { DEPARTMENT_CODES } from './errorCodes';
import { type Department, DEPARTMENT_NAME_MAX_LENGTH } from './types';

interface DepartmentFormModalProps {
  /** 있으면 수정, 없으면 추가 */
  department?: Department;
  /** 하위 부서로 추가할 때의 상위 부서. 없으면 최상위로 만든다 */
  parent?: Department;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 부서 추가 · 수정 모달. (.ai/API.md 23 · 24)
 * 상위 부서는 만들 때만 정할 수 있다 — 이동 API 가 없어 수정에서는 못 바꾼다.
 */
export default function DepartmentFormModal({
  department,
  parent,
  onClose,
  onSaved,
}: DepartmentFormModalProps) {
  const isEditing = department !== undefined;

  const [name, setName] = useState(department?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 값을 고치면 직전 서버 오류는 더 이상 맞지 않는다 */
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
  const hasChanges = !isEditing || trimmedName !== department.name;
  const canSubmit = trimmedName !== '' && hasChanges && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setNameError('');
    setError('');
    setIsSubmitting(true);

    try {
      if (department) {
        await updateDepartment(department.departmentId, { name: trimmedName });
      } else {
        await createDepartment({
          name: trimmedName,
          parentId: parent?.departmentId,
        });
      }

      onSaved();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;
      const message = messageOf(caught, '저장하지 못했습니다.');

      // 이름 문제는 어느 입력이 문제인지 알 수 있어 필드에 붙인다
      if (
        code === DEPARTMENT_CODES.nameDuplicated ||
        code === DEPARTMENT_CODES.invalidRequest
      ) {
        setNameError(message);
      } else if (
        // 남이 먼저 지운 부서 — 목록만 갱신하고 닫는다
        code === DEPARTMENT_CODES.notFound ||
        code === DEPARTMENT_CODES.parentNotFound
      ) {
        onSaved();
        onClose();
        return;
      } else {
        setError(message);
      }

      setIsSubmitting(false);
    }
  }

  const title = isEditing
    ? '부서명 수정'
    : parent
      ? '하위 부서 추가'
      : '부서 추가';

  return (
    <PanelModal title={title} onClose={requestClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          {parent && (
            <div className="rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
              <span className="block text-[10px] text-text-secondary">
                상위 부서
              </span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-text-primary">
                {parent.name}
              </span>
            </div>
          )}

          <div>
            <div className="flex items-end justify-between gap-2 pb-1.5">
              <label
                htmlFor="departmentName"
                className="text-[11px] font-semibold text-text-primary"
              >
                부서명 <span className="text-text-danger">*</span>
              </label>
              <span className="text-[10px] text-text-secondary">
                {name.length} / {DEPARTMENT_NAME_MAX_LENGTH}
              </span>
            </div>
            <input
              id="departmentName"
              type="text"
              value={name}
              maxLength={DEPARTMENT_NAME_MAX_LENGTH}
              onChange={(event) => changeName(event.target.value)}
              placeholder="개발팀"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'departmentName-error' : undefined}
              className={`w-full rounded-lg border bg-bg-surface px-3 py-2 text-[11px] text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 ${
                nameError
                  ? 'border-border-danger focus:outline-border-danger'
                  : 'border-border-default focus:outline-border-primary'
              }`}
            />
            {nameError ? (
              <p
                id="departmentName-error"
                role="alert"
                className="mt-1 text-[10px] break-keep text-text-danger"
              >
                {nameError}
              </p>
            ) : (
              <p className="mt-1 text-[10px] break-keep text-text-secondary">
                {isEditing
                  ? '이름을 바꿔도 소속 사원 배정은 그대로 유지됩니다.'
                  : '같은 상위 부서 안에서는 같은 이름을 쓸 수 없습니다. (최상위 부서끼리는 전체 기준)'}
              </p>
            )}
          </div>
        </div>

        <ModalFooter>
          {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
          <p
            role="alert"
            className="mr-auto text-[10px] break-keep text-text-danger"
          >
            {error}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
            >
              {isSubmitting ? '저장 중…' : isEditing ? '저장' : '추가'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}
