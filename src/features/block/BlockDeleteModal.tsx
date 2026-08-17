'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { FILE_CODES } from '@/features/file/errorCodes';
import { ApiError, messageOf } from '@/lib/api';

import { deleteBlock } from './api';
import { BLOCK_CODES } from './errorCodes';

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
  /**
   * 결재 블록이라 서버가 되물은 문구. 비어 있지 않으면 **2단계**다.
   *
   * ⚠️ 이 문구를 프론트에서 만들지 않는다 — 결재 상태(진행 중 · 반려 · 완료)마다
   *    무엇을 잃는지가 다르고, 그 판단은 서버만 할 수 있다.
   *    **분기는 `code` 로, 표시는 `message` 로** 한다.
   */
  const [approvalWarning, setApprovalWarning] = useState('');

  async function remove() {
    if (isDeleting) return;
    setIsDeleting(true);
    setErrorMessage('');

    try {
      // 되물음을 이미 확인했으면 그 뜻을 실어 다시 부른다
      await deleteBlock(blockId, {
        confirmApprovalCancel: approvalWarning !== '',
      });
      onDeleted(blockId);
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      /*
        ⛔ 이건 되물음이 아니라 **거부**다 (2026-08-16 D안).
        블록을 지우면 그 안의 파일도 휴지통으로 가는데, 진행 중 결재가 그 파일을 보고 있으면
        서버가 막는다. 다시 눌러도 결과가 같으므로 **다음에 할 일**(회수 · 완료)을 적어 준다.
      */
      if (code === FILE_CODES.approvalInProgress) {
        setErrorMessage(
          '진행 중인 결재가 이 블록의 문서를 참조하고 있어 삭제할 수 없습니다. 결재를 회수하거나 완료한 뒤 다시 시도해주세요.',
        );
        setIsDeleting(false);
        return;
      }

      /*
        반대로 이쪽 409 는 실패가 아니라 되물음이다. 여기서 끝내면 이 블록은 영영 지울 수 없다 —
        서버 문구를 그대로 띄우고 한 번 더 누르게 한다.
      */
      if (code === BLOCK_CODES.approvalDeleteConfirmRequired) {
        setApprovalWarning(
          messageOf(caught, '결재가 함께 취소됩니다. 계속할까요?'),
        );
        setIsDeleting(false);
        return;
      }

      setErrorMessage(messageOf(caught, '블록을 삭제하지 못했습니다.'));
      setIsDeleting(false);
    }
  }

  const needsApprovalConfirm = approvalWarning !== '';

  return (
    <AlertDialogTwoButton
      icon={DialogIcons.danger}
      title={needsApprovalConfirm ? '정말 삭제할까요?' : '블록을 삭제할까요?'}
      description={
        needsApprovalConfirm ? (
          approvalWarning
        ) : (
          <>
            <strong className="text-text-primary">{blockTitle}</strong> 블록은
            삭제 후 복구할 수 없습니다. 블록에 올린 문서는 프로젝트 휴지통으로
            이동하며, 휴지통에서 복구하면 문서함에 남습니다.
            {isLinkedSettlement &&
              ' 연결된 세금계산서 · 입출금 내역은 재무 관리에서 블록 삭제됨 으로 남습니다.'}
          </>
        )
      }
      errorMessage={errorMessage}
      confirmLabel={
        isDeleting
          ? '삭제 중…'
          : needsApprovalConfirm
            ? '확인했습니다, 삭제'
            : '삭제'
      }
      isDanger
      isBusy={isDeleting}
      onConfirm={remove}
      onCancel={onClose}
    />
  );
}
