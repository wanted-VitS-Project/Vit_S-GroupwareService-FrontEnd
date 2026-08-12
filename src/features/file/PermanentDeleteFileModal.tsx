'use client';

import { useState } from 'react';

import { DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';

import { isPermanentDeleteConfirmed } from './api';
import { FILE_PERMANENT_DELETE_CONFIRM_TEXT } from './types';

/**
 * 문서 영구 삭제 확인. (명세 104번)
 *
 * `AlertDialogTwoButton` 을 쓰지 않는다 — **확인 문자 입력**이 필요하고,
 * 그 입력이 맞을 때까지 확인 버튼을 잠가야 하는데 공용 다이얼로그에는 그 자리가 없다.
 * 대신 아이콘 · 제목 · 버튼 배치는 공용 다이얼로그와 같게 맞춘다.
 *
 * ⚠️ **여기서는 요청을 보내지 않는다.** 뜻을 확인하고 입력값을 넘겨줄 뿐이고,
 *    실제 삭제는 부르는 쪽이 뒤에서 돌린다 (휴지통은 낙관적으로 목록에서 먼저 뺀다).
 *    그래서 실패 안내도 이 모달이 아니라 **토스트**로 간다.
 * ⚠️ 확인 문자는 **서버도 검증**한다. 여기 검사는 오조작을 미리 막는 편의일 뿐이라,
 *    입력값을 그대로 넘기고 상수로 덮어쓰지 않는다.
 */
export default function PermanentDeleteFileModal({
  fileName,
  onClose,
  onConfirm,
}: {
  fileName: string;
  onClose: () => void;
  /** 확인 문자를 그대로 넘긴다 — 요청은 부르는 쪽이 보낸다 */
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
