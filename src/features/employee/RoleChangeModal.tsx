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

/** ADMIN 은 부여할 수 없다 — 선택지에 아예 넣지 않는다 (.ai/API.md 19) */
const ROLE_OPTIONS: ManagedRole[] = ['MASTER', 'MEMBER'];

/**
 * 전역 권한 변경 모달. (.ai/API.md 19)
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

      // 계정이 사라졌다 — 상세를 다시 받아 현재 상태를 보여준다
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
          <div className="rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/50 px-3 py-2.5">
            <span className="block text-[10px] text-[#6C7389]">대상</span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-[#1C1F2A]">
              {employee.name} ({employee.userId})
            </span>
          </div>

          <fieldset className="space-y-2">
            <legend className="pb-1.5 text-[11px] font-semibold text-[#1C1F2A]">
              변경할 권한
            </legend>
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
                  role === option
                    ? 'border-[#3B5BDB] bg-[#3B5BDB]/5'
                    : 'border-[#1C1F2A]/10 hover:bg-[#ECEEF4]/50'
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
                  className="size-3.5 shrink-0 cursor-pointer accent-[#2B3A67]"
                />
                <span className="min-w-0 text-[11px] font-semibold text-[#1C1F2A]">
                  {ROLE_LABELS[option]}
                  {option === employee.role && (
                    <span className="ml-1.5 font-normal text-[#6C7389]">
                      현재
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>

          <p className="text-[10px] break-keep text-[#6C7389]">
            관리자 권한은 이 화면에서 부여할 수 없습니다.
          </p>
        </div>

        <ModalFooter>
          {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
          <p
            role="alert"
            className="mr-auto text-[10px] break-keep text-[#E7000B]"
          >
            {error}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="cursor-pointer rounded-lg bg-[#2B3A67] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#22305a] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
            >
              {isSubmitting ? '변경 중…' : '변경'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}
