'use client';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';

// 배치 편집을 끝낼 때 저장 여부를 묻는다.
// 바뀐 게 있을 때만 뜬다 — 편집만 켰다 끄거나, 옮겼다가 제자리로 돌려놓았으면
// 보드가 요청도 모달도 만들지 않고 그냥 빠져나간다.
// 취소는 되돌리기 가 아니라 계속 편집이다.
// AlertDialog 는 Esc·배경 클릭도 취소로 흘리는데, 거기에 되돌리기를 걸면
// 실수로 누른 Esc 하나에 옮겨둔 배치가 통째로 날아간다.
// 되돌리기는 보드 안내줄의 버튼으로 따로 둔다 (누르려면 정확히 그것만 눌러야 한다).
// 요청은 여기서 보내지 않는다. 보드가 대기 중인 배치를 한 번에 흘려보내고,
// 실패하면 보드 위쪽에 사유를 띄우며 마지막으로 저장된 배치로 되돌린다.
export default function BlockArrangeExitModal({
  onSave,
  onClose,
}: {
  onSave: () => void;
  /** 계속 편집 — 모달만 닫고 편집 모드에 남는다 */
  onClose: () => void;
}) {
  return (
    <AlertDialogTwoButton
      icon={DialogIcons.info}
      title="바뀐 배치를 저장할까요?"
      description="저장해야 다른 사람 화면에도 같은 자리로 보입니다."
      confirmLabel="저장하고 끝내기"
      cancelLabel="계속 편집"
      onConfirm={onSave}
      onCancel={onClose}
    />
  );
}
