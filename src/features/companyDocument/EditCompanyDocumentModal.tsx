'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { messageOf } from '@/lib/api';

import { updateCompanyDocument } from './api';
import {
  COMPANY_DOCUMENT_CATEGORIES,
  COMPANY_DOCUMENT_CATEGORY_LABELS,
  type CompanyDocument,
  type CompanyDocumentCategory,
  type UpdateCompanyDocumentRequest,
} from './types';

/**
 * 사내 문서 표시명 · 분류 수정. (`.ai/API.md` 149)
 *
 * **바뀐 필드만** 보낸다 — 둘 다 없으면 백엔드가 400(`CDOC_INVALID_REQUEST`)을 준다.
 * 원본 파일명은 바뀌지 않는다 (버전마다 저장된 값이다).
 */
export default function EditCompanyDocumentModal({
  document,
  onClose,
  onSaved,
}: {
  document: CompanyDocument;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(document.name);
  const [category, setCategory] = useState<CompanyDocumentCategory>(
    document.category,
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 실제로 바뀐 필드만 모은다 */
  function changedFields(): UpdateCompanyDocumentRequest {
    const patch: UpdateCompanyDocumentRequest = {};

    if (name.trim() !== document.name) patch.name = name.trim();
    if (category !== document.category) patch.category = category;

    return patch;
  }

  const patch = changedFields();
  const canSubmit =
    name.trim() !== '' && Object.keys(patch).length > 0 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setError('');
    setIsSubmitting(true);

    try {
      await updateCompanyDocument(document.companyDocumentId, patch);
      onSaved();
      onClose();
    } catch (caught) {
      setError(messageOf(caught, '저장하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  return (
    <PanelModal
      title="사내 문서 수정"
      onClose={() => {
        // 저장 중에는 닫지 않는다 — 요청은 계속 날아가 목록에 반영된다
        if (!isSubmitting) onClose();
      }}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="block pb-1.5 text-detail font-semibold text-text-primary">
              표시명
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-detail text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
            />
            <span className="mt-1 block text-caption text-text-secondary">
              원본 파일명({document.originalFileName})은 그대로 남습니다.
            </span>
          </label>

          <label className="block">
            <span className="block pb-1.5 text-detail font-semibold text-text-primary">
              분류
            </span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as CompanyDocumentCategory)
              }
              className="w-full cursor-pointer rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-detail text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
            >
              {COMPANY_DOCUMENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {COMPANY_DOCUMENT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
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
              {isSubmitting ? '저장 중…' : '저장'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}
