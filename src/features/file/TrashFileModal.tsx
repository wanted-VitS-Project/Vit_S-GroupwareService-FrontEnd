'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
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
    <AlertDialogTwoButton
      icon={DialogIcons.warning}
      title="휴지통으로 이동할까요?"
      description={
        <>
          <strong className="text-text-primary">{fileName}</strong> 파일은
          나중에 복구할 수 있습니다.
        </>
      }
      errorMessage={errorMessage}
      confirmLabel={isDeleting ? '이동 중…' : '휴지통으로 이동'}
      isBusy={isDeleting}
      onConfirm={submit}
      onCancel={onClose}
    />
  );
}
