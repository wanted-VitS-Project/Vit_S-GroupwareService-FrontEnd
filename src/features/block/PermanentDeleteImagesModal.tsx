'use client';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';

// 이미지 영구 삭제 확인.
// 문서 영구 삭제와 달리 확인 문자가 없어 이 모달이 유일한 방어선이다 —
// danger 아이콘·빨간 확인 버튼으로 문서 쪽과 같은 무게를 준다.
// 여기서는 요청을 보내지 않는다. 뜻만 확인하고 닫히며 실제 삭제는 부르는 쪽이 뒤에서 돌린다.
export default function PermanentDeleteImagesModal({
  count,
  onClose,
  onConfirm,
}: {
  count: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialogTwoButton
      icon={DialogIcons.danger}
      title="영구 삭제할까요?"
      description={
        <>
          이미지 <strong className="text-text-primary">{count}장</strong>이
          저장소에서 지워집니다.{' '}
          <strong className="text-text-danger">되돌릴 수 없습니다.</strong>
        </>
      }
      confirmLabel="영구 삭제"
      isDanger
      onConfirm={() => {
        onConfirm();
        onClose();
      }}
      onCancel={onClose}
    />
  );
}
