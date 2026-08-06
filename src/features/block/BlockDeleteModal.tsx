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
  onDeleted: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function remove() {
    if (isDeleting) return;
    setIsDeleting(true);
    setErrorMessage('');
    try {
      await deleteBlock(blockId);
      onDeleted();
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
      className="w-full max-w-[420px] overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      header={
        <div className="border-b border-[#1C1F2A]/10 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#1C1F2A]">블록 삭제</h2>
        </div>
      }
    >
      <div className="p-5">
        <p className="text-[11px] leading-5 text-[#1C1F2A]">
          <strong>{blockTitle}</strong> 블록을 삭제할까요?
        </p>
        <p className="mt-1 text-[10px] text-[#6C7389]">
          삭제 잠금 대상 블록은 서버에서 삭제가 거절될 수 있습니다.
        </p>
        {errorMessage && (
          <p role="alert" className="mt-3 text-[10px] text-[#E7000B]">
            {errorMessage}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-[#1C1F2A]/10 bg-[#ECEEF4]/20 px-5 py-3.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:opacity-40"
        >
          취소
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isDeleting}
          className="cursor-pointer rounded-lg bg-[#E7000B] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#C90009] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
        >
          {isDeleting ? '삭제 중…' : '삭제'}
        </button>
      </div>
    </Modal>
  );
}
