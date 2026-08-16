'use client';

import { useEffect, useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { notifyToast } from '@/components/Toast';
import { getCategories } from '@/features/businessCategory/api';
import type { BusinessCategory as MasterCategory } from '@/features/businessCategory/types';
import { ApiError, messageOf } from '@/lib/api';

import { linkBusinessCategories } from '../api';
import { PROJECT_CATEGORY_CODES } from '../errorCodes';
import type { BusinessCategory } from '../types';

interface LinkCategoryModalProps {
  projectId: string;
  /** 이미 붙어 있는 것 — 후보에서 뺀다 */
  linked: BusinessCategory[];
  onClose: () => void;
  onLinked: () => void;
}

/**
 * 사업 카테고리 연결 모달. (.ai/API.md 132)
 *
 * ⚠️ **이미 연결된 것이 하나라도 섞이면 요청 전체가 409** 다 — 그래서 후보에서 미리 뺀다.
 *    그래도 그 사이 남이 붙일 수 있어 409 를 받으면 목록을 다시 읽도록 안내한다.
 * 🗑️ 마스터가 삭제된 카테고리는 연결할 수 없다 (404) — 후보에 넣지 않는다.
 */
export default function LinkCategoryModal({
  projectId,
  linked,
  onClose,
  onLinked,
}: LinkCategoryModalProps) {
  const [candidates, setCandidates] = useState<MasterCategory[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const linkedIds = new Set(linked.map((category) => category.categoryId));

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // 삭제분(`includeDeleted`)은 애초에 요청하지 않는다 — 연결하면 404 다
    getCategories({}, signal)
      .then(setCandidates)
      .catch(() => {
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, []);

  function toggle(categoryId: number) {
    setError('');
    setSelectedIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  async function submit() {
    if (isSubmitting) return;

    if (selectedIds.length === 0) {
      setError('연결할 카테고리를 골라주세요.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await linkBusinessCategories(projectId, selectedIds);
      onLinked();
      onClose();
      notifyToast(`사업 카테고리 ${selectedIds.length}개를 연결했습니다.`);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      setError(
        code === PROJECT_CATEGORY_CODES.duplicated
          ? '이미 연결된 카테고리가 섞여 있어 전부 취소됐습니다. 창을 닫고 다시 열어주세요.'
          : messageOf(caught, '연결하지 못했습니다.'),
      );
      setIsSubmitting(false);
    }
  }

  /** 처리 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  const selectable = candidates?.filter(
    (category) => !category.deletedAt && !linkedIds.has(category.categoryId),
  );

  return (
    <PanelModal title="사업 카테고리 연결" onClose={requestClose}>
      <div className="max-h-[50vh] overflow-y-auto p-5">
        {hasFailed ? (
          <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-detail break-keep text-text-danger">
            카테고리를 불러오지 못했습니다.
          </p>
        ) : !selectable ? (
          <p className="text-detail text-text-secondary">불러오는 중…</p>
        ) : selectable.length === 0 ? (
          <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
            연결할 수 있는 카테고리가 없습니다. 전사 관리에서 카테고리를 먼저
            등록해주세요.
          </p>
        ) : (
          <ul className="space-y-1">
            {selectable.map((category) => {
              const isSelected = selectedIds.includes(category.categoryId);

              return (
                <li key={category.categoryId}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-bg-hover">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isSubmitting}
                      onChange={() => toggle(category.categoryId)}
                      className="size-4 shrink-0 cursor-pointer"
                    />
                    <span className="min-w-0 flex-1 truncate text-detail text-text-primary">
                      {category.name}
                    </span>
                    {category.code && (
                      <span className="shrink-0 font-mono text-caption text-text-secondary">
                        {category.code}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <p
          role="alert"
          className="mt-2 text-caption break-keep text-text-danger empty:hidden"
        >
          {error}
        </p>
      </div>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="btn btn-md btn-gray-outlined"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting || selectedIds.length === 0}
          className="btn btn-md btn-primary min-w-[104px]"
        >
          {isSubmitting ? '연결 중…' : `연결 (${selectedIds.length})`}
        </button>
      </ModalFooter>
    </PanelModal>
  );
}
