'use client';

import {
  AlertDialogThreeButton,
  AlertDialogTwoButton,
  DialogIcons,
} from '@/components/AlertDialog';

/**
 * 동명 문서가 있을 때 확인.
 * 서버가 409 `FILE_NAME_DUPLICATED` 로 한 번 막고, 고른 대로 다시 올린다.
 *
 * - **새 버전으로 올리기** — 같은 문서(`fileId`)에 버전을 얹는다. 사실상 이걸 하려던 경우가 많다
 * - **새 문서로 추가** — `allowDuplicateName: true` 로 이름이 같은 문서를 하나 더 만든다
 *
 * ⚠️ 같은 이름이 **여러 개**면 어디에 얹을지 정할 수 없다 — 그때는 새 버전 선택지를 감추고
 *    두 갈래(추가 · 취소)로 돌아간다. 행의 `새 버전 올리기` 로 대상을 직접 고르면 된다.
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
