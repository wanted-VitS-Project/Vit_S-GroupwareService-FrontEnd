'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { deleteIssue } from './api';

/**
 * 이슈 삭제 확인. 브라우저 기본 확인창 대신 `BlockDeleteModal` 과 같은 모양을 쓴다.
 * 서버는 soft delete 라 담당자 · 블록은 남고 연결만 끊긴다. (명세 60번)
 */
export default function DeleteIssueModal({
  issueId,
  issueTitle,
  onClose,
  onDeleted,
}: {
  issueId: number;
  issueTitle: string;
  onClose: () => void;
  onDeleted: (issueId: number) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function remove() {
    if (isDeleting) return;
    setIsDeleting(true);
    setErrorMessage('');
    try {
      await deleteIssue(issueId);
      onDeleted(issueId);
    } catch (caught) {
      setErrorMessage(messageOf(caught, '이슈를 삭제하지 못했습니다.'));
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      title="이슈 삭제"
      onClose={isDeleting ? undefined : onClose}
      className="w-full max-w-[420px] overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      header={
        <div className="border-b border-[#1C1F2A]/10 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#1C1F2A]">이슈 삭제</h2>
        </div>
      }
    >
      <div className="p-5">
        <p className="text-[11px] leading-5 text-[#1C1F2A]">
          <strong>{issueTitle}</strong> 이슈를 삭제할까요?
        </p>
        <p className="mt-1 text-[10px] text-[#6C7389]">
          삭제하면 목록 · 상세에서 보이지 않습니다.
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
