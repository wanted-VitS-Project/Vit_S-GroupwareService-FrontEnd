'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { ApiError, messageOf } from '@/lib/api';

import { deleteEmployeeGroup } from './api';
import { GROUP_CODES } from './errorCodes';
import type { EmployeeGroup } from './types';

interface DeleteEmployeeGroupModalProps {
  group: EmployeeGroup;
  onClose: () => void;
  /** 삭제 성공 · 이미 삭제된 경우 모두 재조회한다 */
  onDeleted: () => void;
}

/**
 * 그룹 삭제 확인. (.ai/API.md 94)
 *
 * ⚠️ 부서 · 직급과 달리 **구성원이 있어도 그냥 삭제된다** (매핑 CASCADE).
 * 막아주는 409 가 없어 서버가 되물어주지 않으므로, **인원수를 보여주는 것이
 * 유일한 안전장치**다.
 */
export default function DeleteEmployeeGroupModal({
  group,
  onClose,
  onDeleted,
}: DeleteEmployeeGroupModalProps) {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await deleteEmployeeGroup(group.groupId);
      onDeleted();
      onClose();
    } catch (caught) {
      // 이미 삭제됨 — 목록만 갱신하고 닫는다
      if (caught instanceof ApiError && caught.code === GROUP_CODES.notFound) {
        onDeleted();
        onClose();
        return;
      }

      setError(messageOf(caught, '삭제하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialogTwoButton
      icon={DialogIcons.danger}
      title={`'${group.name}' 그룹을 삭제할까요?`}
      description={
        <>
          {group.memberCount > 0 && (
            <>
              구성원 <b>{group.memberCount}명</b>이 있어도 그룹은 삭제됩니다.
              <br />
            </>
          )}
          {/*
            그룹은 권한이 아니라 선택용 인덱스다 — 지운다고 누가 화면을 못 보게 되지 않는다.
            이걸 안 적으면 "권한이 사라질까 봐" 못 지운다.
          */}
          구성원이 이미 부여받은 페이지 권한과 사원 계정에는 영향이 없습니다.
          <br />
          삭제한 그룹은 되돌릴 수 없습니다.
        </>
      }
      errorMessage={error || undefined}
      confirmLabel="삭제"
      isDanger
      isBusy={isSubmitting}
      onConfirm={handleDelete}
      onCancel={onClose}
    />
  );
}
