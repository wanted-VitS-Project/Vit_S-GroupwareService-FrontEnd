'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { deleteCategory } from './api';
import { CATEGORY_CODES } from './errorCodes';
import type { BusinessCategory } from './types';

interface DeleteCategoryModalProps {
  category: BusinessCategory;
  onClose: () => void;
  /** 삭제 성공 · 이미 삭제된 경우 모두 목록을 다시 불러온다 */
  onDeleted: () => void;
}

/**
 * 사업 카테고리 삭제 모달. deletable 이 false 면 처음부터 차단 안내를 띄운다.
 * 그 사이 프로젝트가 연결되면 409 도 같은 화면에서 백엔드 문구로 받는다.
 */
export default function DeleteCategoryModal({
  category,
  onClose,
  onDeleted,
}: DeleteCategoryModalProps) {
  const [blockedMessage, setBlockedMessage] = useState(
    category.deletable
      ? ''
      : '이 카테고리를 사용 중인 프로젝트가 있습니다. 해당 프로젝트에서 카테고리를 먼저 변경한 뒤 삭제해주세요.',
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await deleteCategory(category.categoryId);
      onDeleted();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (code === CATEGORY_CODES.inUse) {
        // 건수가 문구에 담겨 오므로 백엔드 message 가 가장 정확하다
        setBlockedMessage(messageOf(caught, '사용 중인 카테고리입니다.'));
        setIsSubmitting(false);
        return;
      }
      // 이미 삭제된 카테고리 — 목록만 갱신하고 닫는다
      if (code === CATEGORY_CODES.notFound) {
        onDeleted();
        onClose();
        return;
      }

      setError(messageOf(caught, '삭제하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  const isBlocked = blockedMessage !== '';
  const title = isBlocked ? '삭제할 수 없습니다' : '사업 카테고리 삭제';

  /** 삭제 중에는 닫지 않는다. 요청은 계속 날아간다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  return (
    <PanelModal title={title} onClose={requestClose}>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
          <span className="min-w-0 truncate text-label font-semibold text-text-primary">
            {category.name}
          </span>
          {category.code && (
            <span className="shrink-0 rounded-button-sm border border-border-default bg-bg-card px-1.5 py-0.5 font-mono text-caption text-text-secondary">
              {category.code}
            </span>
          )}
        </div>

        {isBlocked ? (
          <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-text-danger">
            {blockedMessage}
          </p>
        ) : (
          <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
            삭제하면 프로젝트 생성 시 더 이상 선택할 수 없습니다.
            <br />
            이미 이 카테고리가 지정된 프로젝트에서는 그대로 표시됩니다.
          </p>
        )}

        {error && (
          <p role="alert" className="text-caption break-keep text-text-danger">
            {error}
          </p>
        )}
      </div>

      <ModalFooter>
        <div className="flex shrink-0 items-center gap-2">
          {isBlocked ? (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-md btn-primary min-w-26"
            >
              확인
            </button>
          ) : (
            <>
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
                onClick={handleDelete}
                disabled={isSubmitting}
                className="btn btn-md btn-danger"
              >
                {isSubmitting ? '삭제 중…' : '삭제'}
              </button>
            </>
          )}
        </div>
      </ModalFooter>
    </PanelModal>
  );
}
