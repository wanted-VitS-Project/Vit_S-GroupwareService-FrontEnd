'use client';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';

// 체크리스트 항목 삭제 확인.
// 다른 삭제 모달과 달리 여기서 요청을 보내지 않는다 — 낙관적 갱신이라 확인 즉시 목록에서 빼고
// 삭제 요청은 블록이 뒤에서 처리한다. 그래서 처리 중 상태도 실패 안내도 이 모달에는 없다.
export default function ChecklistItemDeleteModal({
  content,
  onClose,
  onConfirm,
}: {
  content: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialogTwoButton
      icon={DialogIcons.danger}
      title="항목을 삭제할까요?"
      description={
        <>
          <strong className="text-text-primary">{content}</strong> 항목은 삭제
          후 복구할 수 없습니다.
        </>
      }
      confirmLabel="삭제"
      isDanger
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}
