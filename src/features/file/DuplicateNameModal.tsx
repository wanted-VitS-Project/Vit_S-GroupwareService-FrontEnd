'use client';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';

/**
 * 동명 문서가 있을 때 확인.
 * 서버가 409 `FILE_NAME_DUPLICATED` 로 한 번 막고, 확인하면
 * `allowDuplicateName: true` 로 같은 파일을 다시 올린다.
 */
export default function DuplicateNameModal({
  fileName,
  message,
  onCancel,
  onConfirm,
}: {
  fileName: string;
  /** 백엔드 안내 문구 */
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialogTwoButton
      icon={DialogIcons.warning}
      title="같은 이름의 문서가 있습니다"
      description={
        <>
          <p>{message}</p>
          <p className="mt-2">
            <strong className="text-text-primary">{fileName}</strong>을(를) 새
            문서로 추가할까요? 새 버전으로 올리려면 취소 후 해당 문서 메뉴를
            이용해주세요.
          </p>
        </>
      }
      confirmLabel="새 문서로 추가"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
