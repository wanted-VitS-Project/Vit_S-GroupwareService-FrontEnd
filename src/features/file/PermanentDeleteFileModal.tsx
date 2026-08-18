'use client';

import { useState } from 'react';

import { DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';

import { isPermanentDeleteConfirmed } from './api';
import { FILE_PERMANENT_DELETE_CONFIRM_TEXT } from './types';

/**
 * 문서 영구 삭제 확인. 확인 문자를 입력해야 버튼이 열려 공용 다이얼로그를 쓰지 않는다.
 * 여기서는 요청을 보내지 않고 입력값만 넘긴다. 실패 안내는 토스트로 간다.
 */
export default function PermanentDeleteFileModal({
  fileName,
  onClose,
  onConfirm,
}: {
  fileName: string;
  onClose: () => void;
  /** 확인 문자를 그대로 넘긴다. 요청은 부르는 쪽이 보낸다 */
  onConfirm: (confirmText: string) => void;
}) {
  const [confirmText, setConfirmText] = useState('');

  const canDelete = isPermanentDeleteConfirmed(confirmText);

  function submit() {
    if (!canDelete) return;

    onConfirm(confirmText.trim());
    onClose();
  }

  return (
    <Modal
      title="영구 삭제할까요?"
      onClose={onClose}
      // 확인 문자를 입력하는 중이라 바깥을 잘못 눌러 닫히면 처음부터 다시 해야 한다
      dismissOnBackdrop={false}
      header={DialogIcons.danger}
      className="w-120 max-w-[calc(100vw-2rem)] rounded-base bg-bg-card p-8"
    >
      <div className="mt-6 text-center">
        <h2 className="text-heading-xl font-semibold text-text-primary">
          영구 삭제할까요?
        </h2>
        <div className="mt-3 text-heading-m text-text-secondary">
          <strong className="text-text-primary">{fileName}</strong> 의{' '}
          <strong className="text-text-danger">모든 버전</strong>이 저장소에서
          지워집니다.{' '}
          <strong className="text-text-danger">되돌릴 수 없습니다.</strong>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-1.5">
        <label
          htmlFor="permanent-delete-confirm"
          className="text-caption text-text-secondary"
        >
          계속하려면{' '}
          <strong className="text-text-primary">
            {FILE_PERMANENT_DELETE_CONFIRM_TEXT}
          </strong>{' '}
          를 입력하세요.
        </label>
        <input
          id="permanent-delete-confirm"
          autoFocus
          autoComplete="off"
          value={confirmText}
          placeholder={FILE_PERMANENT_DELETE_CONFIRM_TEXT}
          onChange={(event) => setConfirmText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          className="rounded-lg border border-border-default px-3 py-2 text-body-m text-text-primary outline-none focus:border-border-primary"
        />
      </div>

      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={onClose} className="btn btn-gray w-40">
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canDelete}
          className="btn btn-danger w-40"
        >
          영구 삭제
        </button>
      </div>
    </Modal>
  );
}
