'use client';

import { useState } from 'react';

import { ApiError, messageOf } from '@/lib/api';

import { deleteCategory } from './api';
import CategoryModal, { ModalFooter } from './CategoryModal';
import { CATEGORY_CODES } from './errorCodes';
import type { BusinessCategory } from './types';

interface DeleteCategoryModalProps {
  category: BusinessCategory;
  onClose: () => void;
  /** 삭제 성공 · 이미 삭제된 경우 모두 목록을 다시 불러온다 */
  onDeleted: () => void;
}

/**
 * 사업 카테고리 삭제 모달. (.ai/API.md 16)
 *
 * `deletable === false` 면 처음부터 차단 안내를 띄운다.
 * 목록을 받은 뒤 다른 사람이 프로젝트를 연결할 수 있어 409 도 같은 화면으로 받는다 —
 * 이때는 건수가 담긴 백엔드 문구를 그대로 쓴다.
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

  return (
    <CategoryModal title={title} onClose={onClose}>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/50 px-3 py-2.5">
          <span className="min-w-0 truncate text-xs font-semibold text-[#1C1F2A]">
            {category.name}
          </span>
          {category.code && (
            <span className="shrink-0 rounded border border-[#1C1F2A]/10 bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#6C7389]">
              {category.code}
            </span>
          )}
        </div>

        {isBlocked ? (
          <p className="rounded-lg bg-[#E7000B]/5 px-3 py-2.5 text-[11px] leading-relaxed break-keep text-[#E7000B]">
            {blockedMessage}
          </p>
        ) : (
          <p className="rounded-lg bg-[#F59E0B]/10 px-3 py-2.5 text-[11px] leading-relaxed break-keep text-[#92400E]">
            삭제하면 프로젝트 생성 시 더 이상 선택할 수 없습니다.
            <br />
            이미 이 카테고리가 지정된 프로젝트에서는 그대로 표시됩니다.
          </p>
        )}

        {error && (
          <p role="alert" className="text-[10px] break-keep text-[#E7000B]">
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
              className="cursor-pointer rounded-lg bg-[#2B3A67] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#22305a]"
            >
              확인
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg bg-[#E7000B] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#c50009] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
              >
                {isSubmitting ? '삭제 중…' : '삭제'}
              </button>
            </>
          )}
        </div>
      </ModalFooter>
    </CategoryModal>
  );
}
