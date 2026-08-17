'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { notifyToast } from '@/components/Toast';
import { ApiError, messageOf } from '@/lib/api';

import { removeProjectMember } from '../api';
import { MEMBER_CODES } from '../errorCodes';
import type { ProjectMember } from '../types';

interface RemoveMemberModalProps {
  projectId: string;
  member: ProjectMember;
  onClose: () => void;
  onRemoved: () => void;
}

// 참여자 제거 확인. (.ai/API.md 127)
// 되돌릴 수 없다 — project_member 에 soft delete 가 없어 행이 물리적으로 사라진다.
// 그래서 폼 모달이 아니라 AlertDialog 로 확인만 받는다.
// 그 프로젝트 스텝의 권한 오버라이드도 함께 지워진다 (2026-08-06) — 문구로 알린다.
// 이걸 안 알리면 "스텝 권한은 남겠지" 하고 뺐다가 나중에 다시 넣을 때 설정이 사라져 당황한다.
export default function RemoveMemberModal({
  projectId,
  member,
  onClose,
  onRemoved,
}: RemoveMemberModalProps) {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function remove() {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await removeProjectMember(projectId, member.memberId);
      onRemoved();
      onClose();
      // 모달을 닫은 뒤에 띄운다 — <dialog> 가 최상위 레이어라 토스트를 가린다
      notifyToast(`${member.name} 님을 참여자에서 제거했습니다.`);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 남이 먼저 뺐다 — 결과가 같으므로 실패로 보이게 하지 않는다
      if (code === MEMBER_CODES.notFound) {
        onRemoved();
        onClose();
        return;
      }

      setError(
        code === MEMBER_CODES.selfEditDenied
          ? '자기 자신은 참여자에서 제거할 수 없습니다.'
          : messageOf(caught, '제거하지 못했습니다.'),
      );
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialogTwoButton
      icon={DialogIcons.danger}
      title={`${member.name} 님을 제거할까요?`}
      description="이 프로젝트를 더 이상 볼 수 없게 되고, 스텝별로 따로 지정해 둔 권한도 함께 사라집니다. 되돌리려면 참여자로 다시 추가해야 합니다."
      errorMessage={error || undefined}
      confirmLabel="제거"
      isDanger
      isBusy={isSubmitting}
      onConfirm={() => void remove()}
      onCancel={onClose}
    />
  );
}
