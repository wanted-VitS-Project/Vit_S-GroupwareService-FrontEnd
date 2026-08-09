'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { trashFile } from './api';

/**
 * 문서를 휴지통으로 옮기기 전 확인.
 * 진행 중 결재의 대상이면 409 로 막히고, 그때 `message` 에 결재 정보가 실려 온다.
 */
export default function TrashFileModal({
  fileId,
  fileName,
  onClose,
  onTrashed,
}: {
  fileId: number;
  fileName: string;
  onClose: () => void;
  onTrashed: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function submit() {
    if (isDeleting) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      await trashFile(fileId);
      onTrashed();
      onClose();
    } catch (caught) {
      setErrorMessage(messageOf(caught, '문서를 옮기지 못했습니다.'));
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      title="휴지통으로 이동"
      // 요청이 나간 뒤 닫으면 목록과 실제 상태가 어긋난다
      onClose={isDeleting ? undefined : onClose}
      className="w-full max-w-sm rounded-xl p-6 shadow-2xl"
    >
      {/* 제목은 Modal 이 `title` 로 그린다 — 여기서 또 쓰면 중복 낭독된다 */}
      <p className="mt-2 text-xs break-keep text-text-secondary">
        <b className="text-text-primary">{fileName}</b> 을(를) 휴지통으로
        옮길까요? 파일은 지워지지 않고 나중에 복구할 수 있습니다.
      </p>

      {errorMessage && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-bg-soft px-3 py-2 text-[11px] break-keep text-text-danger"
        >
          {errorMessage}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
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
          onClick={submit}
          disabled={isDeleting}
          className="cursor-pointer rounded-lg bg-red-text px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#c40009] disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
        >
          {isDeleting ? '이동 중…' : '휴지통으로 이동'}
        </button>
      </div>
    </Modal>
  );
}
