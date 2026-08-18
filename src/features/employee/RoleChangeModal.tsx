'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ROLE_LABELS } from '@/constants/status';
import { ApiError, messageOf } from '@/lib/api';

import { updateEmployeeRole } from './api';
import { ACCOUNT_CODES } from './errorCodes';
import type { EmployeeDetail, ManagedRole } from './types';

interface RoleChangeModalProps {
  employee: EmployeeDetail;
  onClose: () => void;
  /** 성공 · 대상이 사라진 경우 모두 상세를 다시 받는다 */
  onSaved: () => void;
}

/** ADMIN 은 부여할 수 없어 선택지에 아예 넣지 않는다 */
const ROLE_OPTIONS: ManagedRole[] = ['MASTER', 'MEMBER'];

/**
 * 전역 권한 변경 모달.
 * 자기 자신 · 시스템 계정은 대상이 아니라 상세 화면에서 미리 막는다.
 */
export default function RoleChangeModal({
  employee,
  onClose,
  onSaved,
}: RoleChangeModalProps) {
  const [role, setRole] = useState<ManagedRole>(employee.role);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = role !== employee.role && !isSubmitting;

  /** 저장 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setError('');
    setIsSubmitting(true);

    try {
      await updateEmployeeRole(employee.userId, role);
      onSaved();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 계정이 사라졌다. 상세를 다시 받아 현재 상태를 보여준다
      if (code === ACCOUNT_CODES.notFound) {
        onSaved();
        onClose();
        return;
      }

      setError(messageOf(caught, '권한을 변경하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  return (
    <PanelModal title="권한 변경" onClose={requestClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
            <span className="block text-caption text-text-secondary">대상</span>
            <span className="mt-0.5 block truncate text-label font-semibold text-text-primary">
              {employee.name} ({employee.userId})
            </span>
          </div>

          <fieldset className="space-y-2">
            <legend className="pb-1.5 text-detail font-semibold text-text-primary">
              변경할 권한
            </legend>
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
                  role === option
                    ? 'border-border-primary bg-blue-bg-soft'
                    : 'border-border-default hover:bg-bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option}
                  checked={role === option}
                  onChange={() => {
                    setRole(option);
                    setError('');
                  }}
                  className="size-3.5 shrink-0 cursor-pointer accent-btn-primary"
                />
                <span className="min-w-0 text-detail font-semibold text-text-primary">
                  {ROLE_LABELS[option]}
                  {option === employee.role && (
                    <span className="ml-1.5 font-normal text-text-secondary">
                      현재
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <ModalFooter>
          {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
          <p
            role="alert"
            className="mr-auto text-caption break-keep text-text-danger"
          >
            {error}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-md btn-gray-outlined"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-sm btn-primary"
            >
              {isSubmitting ? '변경 중…' : '변경'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}
