'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { deleteBlock } from './api';

export default function BlockDeleteModal({
  blockId,
  blockTitle,
  onClose,
  onDeleted,
}: {
  blockId: number;
  blockTitle: string;
  onClose: () => void;
  /** 지운 블록을 알려준다 — 받는 쪽이 재조회 없이 목록에서 빼낼 수 있게 */
  onDeleted: (blockId: number) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function remove() {
    if (isDeleting) return;
    setIsDeleting(true);
    setErrorMessage('');
    try {
      await deleteBlock(blockId);
      onDeleted(blockId);
      onClose();
    } catch (caught) {
      setErrorMessage(messageOf(caught, '블록을 삭제하지 못했습니다.'));
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      title="블록 삭제"
      onClose={isDeleting ? undefined : onClose}
      className="w-full max-w-[420px] overflow-hidden rounded-xl border border-border-default shadow-2xl"
      header={
        <div className="border-b border-border-default px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text-primary">블록 삭제</h2>
        </div>
      }
    >
      <div className="p-5">
        <p className="text-[11px] leading-5 text-text-primary">
          <strong>{blockTitle}</strong> 블록을 삭제할까요?
        </p>
        <p className="mt-1 text-[10px] text-text-secondary">
          삭제 잠금 대상 블록은 서버에서 삭제가 거절될 수 있습니다.
        </p>
        {errorMessage && (
          <p role="alert" className="mt-3 text-[10px] text-text-danger">
            {errorMessage}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-border-default bg-bg-surface px-5 py-3.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          취소
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isDeleting}
          className="cursor-pointer rounded-lg bg-red-text px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#C90009] disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
        >
          {isDeleting ? '삭제 중…' : '삭제'}
        </button>
      </div>
    </Modal>
  );
}
