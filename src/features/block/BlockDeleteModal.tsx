'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { messageOf } from '@/lib/api';

import { deleteBlock } from './api';

export default function BlockDeleteModal({
  blockId,
  blockTitle,
  isLinkedSettlement = false,
  onClose,
  onDeleted,
}: {
  blockId: number;
  blockTitle: string;
  /**
   * 세금계산서 · 입출금이 연결된 정산 블록인지.
   *
   * 삭제 자체는 막히지 않는다 (백엔드 설계) — 대신 지운 뒤 재무 쪽 입출금이
   * `블록 삭제됨` 으로 남는다는 것을 **확인 전에** 알려준다.
   */
  isLinkedSettlement?: boolean;
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
    <AlertDialogTwoButton
      icon={DialogIcons.danger}
      title="블록을 삭제할까요?"
      description={
        <>
          <strong className="text-text-primary">{blockTitle}</strong> 블록은
          삭제 후 복구할 수 없습니다.
          {isLinkedSettlement &&
            ' 연결된 세금계산서 · 입출금 내역은 재무 관리에서 블록 삭제됨 으로 남습니다.'}
        </>
      }
      errorMessage={errorMessage}
      confirmLabel={isDeleting ? '삭제 중…' : '삭제'}
      isDanger
      isBusy={isDeleting}
      onConfirm={remove}
      onCancel={onClose}
    />
  );
}
