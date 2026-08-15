'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { createCategory, updateCategory } from './api';
import { CATEGORY_CODES } from './errorCodes';
import {
  type BusinessCategory,
  CATEGORY_CODE_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  type UpdateCategoryRequest,
} from './types';

interface CategoryFormModalProps {
  /** 없으면 추가, 있으면 수정 */
  category?: BusinessCategory;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 사업 카테고리 추가 · 수정 모달. (.ai/API.md 16 · 17)
 *
 * 수정은 **바뀐 필드만** 보낸다 — 셋 다 없으면 백엔드가 400 을 준다.
 * 중복(409)은 공통 문구가 아니라 해당 입력 아래에 붙여야 어디를 고칠지 알 수 있다.
 *
 * 🗑️ 중복은 **활성 카테고리끼리만** 난다 — 삭제했던 이름 · 업무코드는 그대로 다시 만들어진다.
 * 삭제분을 알리던 백엔드 문구가 없어졌으므로 409 는 `message` 가 아니라 `code` 로 가른다.
 */
export default function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: CategoryFormModalProps) {
  const isEditing = category !== undefined;

  const [name, setName] = useState(category?.name ?? '');
  const [code, setCode] = useState(category?.code ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [nameError, setNameError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 값을 고치면 그 필드의 서버 오류는 더 이상 맞지 않는다 */
  function changeName(value: string) {
    setName(value);
    setNameError('');
  }

  function changeCode(value: string) {
    setCode(value);
    setCodeError('');
  }

  /** 저장 중에는 닫지 않는다 — 요청은 계속 날아가 목록에 반영된다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  /** 수정에서 실제로 바뀐 필드만 모은다 */
  function changedFields(): UpdateCategoryRequest {
    const patch: UpdateCategoryRequest = {};
    const trimmedName = name.trim();
    const trimmedCode = code.trim();

    if (trimmedName !== category?.name) patch.name = trimmedName;
    // 비우면 null 을 보내 업무코드를 지운다
    if (trimmedCode !== (category?.code ?? '')) {
      patch.code = trimmedCode || null;
    }
    if (description !== (category?.description ?? '')) {
      patch.description = description;
    }

    return patch;
  }

  const hasChanges = !isEditing || Object.keys(changedFields()).length > 0;
  const canSubmit = name.trim() !== '' && hasChanges && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setNameError('');
    setCodeError('');
    setError('');
    setIsSubmitting(true);

    try {
      if (category) {
        await updateCategory(category.categoryId, changedFields());
      } else {
        await createCategory({
          name: name.trim(),
          // 선택 필드는 비어 있으면 아예 보내지 않는다
          code: code.trim() || undefined,
          description: description.trim() || undefined,
        });
      }

      onSaved();
      onClose();
    } catch (caught) {
      const failedCode = caught instanceof ApiError ? caught.code : undefined;
      const message = messageOf(caught, '저장하지 못했습니다.');

      // 중복은 어느 입력이 문제인지 알 수 있어 필드에 붙인다
      if (failedCode === CATEGORY_CODES.nameDuplicated) setNameError(message);
      else if (failedCode === CATEGORY_CODES.codeDuplicated)
        setCodeError(message);
      else setError(message);

      setIsSubmitting(false);
    }
  }

  const title = isEditing ? '사업 카테고리 수정' : '사업 카테고리 추가';

  return (
    <PanelModal title={title} onClose={requestClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <Field
            id="categoryName"
            label="카테고리 이름"
            required
            value={name}
            onChange={changeName}
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            placeholder="도로 설계"
            error={nameError}
          />
          <Field
            id="categoryCode"
            label="업무코드"
            value={code}
            onChange={changeCode}
            maxLength={CATEGORY_CODE_MAX_LENGTH}
            placeholder="ROAD"
            error={codeError}
            help="표시 · 검색용입니다. 비워두어도 됩니다."
          />

          <label className="block">
            <span className="block pb-1.5 text-detail font-semibold text-text-primary">
              설명{' '}
              <span className="font-normal text-text-secondary">(선택)</span>
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="카테고리에 대한 간략한 설명을 입력하세요."
              className="w-full resize-none rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-detail break-keep text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
            />
          </label>
        </div>

        <ModalFooter>
          <p
            role={error ? 'alert' : undefined}
            className="mr-auto text-caption break-keep text-text-danger"
          >
            {error}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="min-w-[104px] cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
            >
              {isSubmitting ? '저장 중…' : isEditing ? '저장' : '추가'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder: string;
  required?: boolean;
  error?: string;
  help?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  required,
  error,
  help,
}: FieldProps) {
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <div>
      <div className="flex items-end justify-between gap-2 pb-1.5">
        <label
          htmlFor={id}
          className="text-detail font-semibold text-text-primary"
        >
          {label}{' '}
          {required ? (
            <span className="text-text-danger">*</span>
          ) : (
            <span className="font-normal text-text-secondary">(선택)</span>
          )}
        </label>
        <span className="text-caption text-text-secondary">
          {value.length} / {maxLength}
        </span>
      </div>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-lg border bg-bg-surface px-3 py-2 text-detail text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 ${
          error
            ? 'border-border-danger focus:outline-border-danger'
            : 'border-border-default focus:outline-border-primary'
        }`}
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-caption break-keep text-text-danger"
        >
          {error}
        </p>
      ) : (
        help && (
          <p
            id={`${id}-help`}
            className="mt-1 text-caption text-text-secondary"
          >
            {help}
          </p>
        )
      )}
    </div>
  );
}
