'use client';

import { useState } from 'react';

import {
  AlertDialogOneButton,
  AlertDialogTwoButton,
  DialogIcons,
} from '@/components/AlertDialog';
import { ApiError, messageOf } from '@/lib/api';

import { revokePagePermission } from './api';
import { SOURCE_LABEL } from './display';
import { PAGE_CODES } from './errorCodes';
import type {
  PageAccessor,
  PageSummary,
  RevokePermissionResult,
} from './types';

interface RevokePermissionModalProps {
  page: PageSummary;
  accessor: PageAccessor;
  onClose: () => void;
  /** 회수 성공 · 이미 없던 경우 모두 재조회한다 */
  onRevoked: () => void;
}

/**
 * 페이지 권한 회수 모달. 회수되는 것은 명시 부여 기록뿐이다.
 * 전역 권한이 있으면 회수해도 계속 보이므로 그 사실을 결과 화면에서 알린다.
 */
export default function RevokePermissionModal({
  page,
  accessor,
  onClose,
  onRevoked,
}: RevokePermissionModalProps) {
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<RevokePermissionResult | null>(null);

  async function handleRevoke() {
    if (isPending) return;

    setError('');
    setIsPending(true);

    try {
      const next = await revokePagePermission(page.pageCode, accessor.userId);

      // 계속 보이는 경우만 한 번 더 알린다. 아니면 바로 닫는다
      if (next.stillAccessible) {
        setResult(next);
        setIsPending(false);
        onRevoked();
        return;
      }

      onRevoked();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 남이 먼저 회수했거나 부여 기록이 없던 경우. 목록만 갱신하고 닫는다
      if (code === PAGE_CODES.permissionNotFound) {
        onRevoked();
        onClose();
        return;
      }

      setError(messageOf(caught, '권한을 회수하지 못했습니다.'));
      setIsPending(false);
    }
  }

  if (result) {
    const source = result.accessSource
      ? SOURCE_LABEL[result.accessSource]
      : '다른 권한';

    return (
      <AlertDialogOneButton
        icon={DialogIcons.info}
        title="회수했지만 계속 보입니다"
        description={
          <>
            {accessor.name} 님의 <b>부여 기록은 삭제</b>했습니다.
            <br />
            다만 <b>{source}</b>으로 {page.name} 페이지를 계속 볼 수 있습니다.
          </>
        }
        onConfirm={onClose}
      />
    );
  }

  return (
    <AlertDialogTwoButton
      icon={DialogIcons.warning}
      title="권한을 회수할까요?"
      description={
        <>
          {accessor.name} 님의 {page.name} 접근 권한을 회수합니다.
          <br />
          필요하면 다시 부여할 수 있습니다.
        </>
      }
      errorMessage={error || undefined}
      confirmLabel="회수"
      isDanger
      isBusy={isPending}
      onConfirm={handleRevoke}
      onCancel={onClose}
    />
  );
}
