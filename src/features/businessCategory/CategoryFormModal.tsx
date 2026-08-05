'use client';

import { useState } from 'react';

import { ApiError, messageOf } from '@/lib/api';

import { createCategory, updateCategory } from './api';
import CategoryModal, { ModalFooter } from './CategoryModal';
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
    <CategoryModal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <Field
            id="categoryName"
            label="카테고리 이름"
            required
            value={name}
            onChange={setName}
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            placeholder="도로 설계"
            error={nameError}
          />
          <Field
            id="categoryCode"
            label="업무코드"
            value={code}
            onChange={setCode}
            maxLength={CATEGORY_CODE_MAX_LENGTH}
            placeholder="ROAD"
            error={codeError}
            help="표시 · 검색용입니다. 비워두어도 됩니다."
          />

          <label className="block">
            <span className="block pb-1.5 text-[11px] font-semibold text-[#1C1F2A]">
              설명 <span className="font-normal text-[#6C7389]">(선택)</span>
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="카테고리에 대한 간략한 설명을 입력하세요."
              className="w-full resize-none rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/50 px-3 py-2 text-[11px] break-keep text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB]"
            />
          </label>
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
              className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4]"
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
    </CategoryModal>
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
          className="text-[11px] font-semibold text-[#1C1F2A]"
        >
          {label}{' '}
          {required ? (
            <span className="text-[#E7000B]">*</span>
          ) : (
            <span className="font-normal text-[#6C7389]">(선택)</span>
          )}
        </label>
        <span className="text-[10px] text-[#6C7389]">
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
        className={`w-full rounded-lg border bg-[#ECEEF4]/50 px-3 py-2 text-[11px] text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 ${
          error
            ? 'border-[#E7000B] focus:outline-[#E7000B]'
            : 'border-[#1C1F2A]/10 focus:outline-[#3B5BDB]'
        }`}
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-[10px] break-keep text-[#E7000B]"
        >
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="mt-1 text-[10px] text-[#6C7389]">
            {help}
          </p>
        )
      )}
    </div>
  );
}
