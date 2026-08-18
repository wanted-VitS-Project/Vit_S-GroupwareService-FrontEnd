'use client';

import {
  AlertDialogThreeButton,
  AlertDialogTwoButton,
  DialogIcons,
} from '@/components/AlertDialog';

/**
 * 동명 문서가 있을 때 확인. 새 버전으로 얹을지 새 문서로 추가할지 고른다.
 * 같은 이름이 여러 개면 얹을 대상을 정할 수 없어 새 버전 선택지를 감춘다.
 */
export default function DuplicateNameModal({
  fileName,
  message,
  canAddVersion,
  onCancel,
  onAddVersion,
  onConfirm,
}: {
  fileName: string;
  /** 백엔드 안내 문구 */
  message: string;
  /** 얹을 문서를 하나로 특정했을 때만 새 버전 선택지를 연다 */
  canAddVersion: boolean;
  onCancel: () => void;
  onAddVersion: () => void;
  onConfirm: () => void;
}) {
  const description = (
    <>
      <p>{message}</p>
      <p className="mt-2">
        <strong className="text-text-primary">{fileName}</strong>
        {canAddVersion
          ? ' 을(를) 기존 문서의 새 버전으로 올릴지, 이름이 같은 새 문서로 추가할지 고르세요.'
          : ' 을(를) 새 문서로 추가합니다. 같은 이름의 문서가 여러 개라 어느 문서에 얹을지 정할 수 없습니다. 새 버전으로 올리려면 목록에서 해당 문서의 새 버전 올리기를 사용하세요.'}
      </p>
    </>
  );

  if (!canAddVersion) {
    return (
      <AlertDialogTwoButton
        icon={DialogIcons.warning}
        title="같은 이름의 문서가 있습니다"
        description={description}
        confirmLabel="새 문서로 추가"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  return (
    <AlertDialogThreeButton
      icon={DialogIcons.warning}
      title="같은 이름의 문서가 있습니다"
      description={description}
      confirmLabel="새 버전으로 올리기"
      altLabel="새 문서로 추가"
      onConfirm={onAddVersion}
      onAlt={onConfirm}
      onCancel={onCancel}
    />
  );
}
