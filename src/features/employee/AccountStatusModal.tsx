'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { updateAccountStatus } from './api';
import { ACCOUNT_CODES } from './errorCodes';
import type { EmployeeDetail } from './types';

interface AccountStatusModalProps {
  employee: EmployeeDetail;
  onClose: () => void;
  /** 성공 · 이미 그 상태인 경우 모두 상세를 다시 받는다 */
  onSaved: () => void;
}

/**
 * 계정 활성 · 정지 토글 모달. (.ai/API.md 20)
 * 퇴사 처리와 다른 API 다 — 여기서는 퇴사일을 건드리지 않는다.
 */
export default function AccountStatusModal({
  employee,
  onClose,
  onSaved,
}: AccountStatusModalProps) {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuspending = employee.accountStatus === 'ACTIVE';
  const nextStatus = isSuspending ? 'INACTIVE' : 'ACTIVE';

  /** 처리 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await updateAccountStatus(employee.userId, nextStatus);
      onSaved();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 이미 그 상태거나 계정이 사라졌다 — 화면이 뒤처졌다는 뜻이라 다시 받는다
      if (
        code === ACCOUNT_CODES.statusUnchanged ||
        code === ACCOUNT_CODES.notFound
      ) {
        onSaved();
        onClose();
        return;
      }

      setError(messageOf(caught, '계정 상태를 변경하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  return (
    <PanelModal
      title={isSuspending ? '계정 정지' : '계정 활성화'}
      onClose={requestClose}
    >
      <div className="space-y-4 p-5">
        <div className="rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
          <span className="block text-caption text-text-secondary">대상</span>
          <span className="mt-0.5 block truncate text-label font-semibold text-text-primary">
            {employee.name} ({employee.userId})
          </span>
        </div>

        {isSuspending ? (
          <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
            정지하면 이 사원은 로그인할 수 없습니다.
            <br />
            사원 정보와 과거 이력은 그대로 남고, 언제든 다시 활성화할 수
            있습니다.
          </p>
        ) : (
          <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail leading-relaxed break-keep text-text-secondary">
            다시 로그인할 수 있게 됩니다. 비밀번호는 정지 이전 그대로입니다.
          </p>
        )}

        {isSuspending && !employee.resignedAt && (
          <p className="text-caption break-keep text-text-secondary">
            퇴사한 사원이라면 정지 대신 퇴사 처리를 하면 퇴사일까지 함께
            기록됩니다.
          </p>
        )}

        {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
        <p
          role="alert"
          className="text-caption break-keep text-text-danger empty:hidden"
        >
          {error}
        </p>
      </div>

      <ModalFooter>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg px-4 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`cursor-pointer rounded-lg px-4 py-1.5 text-detail font-semibold text-text-white disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary ${
              isSuspending
                ? 'bg-red-text hover:bg-btn-danger-hover'
                : 'bg-btn-primary hover:bg-btn-primary-hover'
            }`}
          >
            {isSubmitting ? '처리 중…' : isSuspending ? '정지' : '활성화'}
          </button>
        </div>
      </ModalFooter>
    </PanelModal>
  );
}
