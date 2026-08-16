'use client';

import { AlertDialogOneButton, DialogIcons } from '@/components/AlertDialog';

/**
 * 배치 편집 중에 `블록 추가` 를 눌렀을 때의 경고.
 *
 * 막는 이유는 **아직 서버에 없는 배치** 때문이다. 편집 중 이동은 저장 전이라
 * 블록을 만들면 목록을 다시 불러오고, 그 순간 옮겨둔 자리가 서버 배치로 덮여 사라진다.
 * 그래서 "지금은 안 된다" 고 알리기만 하고 되돌리거나 저장하지는 않는다 — 그 판단은 사용자 몫이다.
 */
export default function BlockArrangeBlockedModal({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <AlertDialogOneButton
      icon={DialogIcons.warning}
      title="배치 편집 중입니다"
      description="블록 추가는 배치 편집을 끝낸 뒤에 할 수 있습니다."
      confirmLabel="확인"
      onConfirm={onClose}
    />
  );
}
