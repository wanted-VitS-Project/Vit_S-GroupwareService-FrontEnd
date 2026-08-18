'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { messageOf } from '@/lib/api';

import { deleteIssue } from './api';

// 이슈 삭제 확인. 브라우저 기본 확인창 대신 BlockDeleteModal 과 같은 모양을 쓴다.
// 서버는 soft delete 라 담당자·블록은 남고 연결만 끊긴다.
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
    <AlertDialogTwoButton
      icon={DialogIcons.danger}
      title="이슈를 삭제할까요?"
      description={
        <>
          <strong className="text-text-primary">{issueTitle}</strong> 이슈는
          삭제 후 목록과 상세에서 보이지 않습니다.
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
