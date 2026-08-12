'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { resignEmployee } from './api';
import { EMPLOYEE_CODES } from './errorCodes';
import type { EmployeeDetail } from './types';

interface ResignationModalProps {
  employee: EmployeeDetail;
  onClose: () => void;
  /** 성공 · 이미 퇴사 처리된 경우 모두 상세를 다시 받는다 */
  onSaved: () => void;
}

/** 오늘 날짜를 `yyyy-MM-dd` 로. `toISOString()` 은 UTC 라 하루가 밀린다 */
function today() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * 퇴사 처리 모달. (.ai/API.md 34)
 * 퇴사일 기록 + 계정 비활성이 한 번에 일어난다 — 계정 상태 API 를 따로 부르지 않는다.
 */
export default function ResignationModal({
  employee,
  onClose,
  onSaved,
}: ResignationModalProps) {
  const [resignedAt, setResignedAt] = useState(today);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = resignedAt !== '' && !isSubmitting;

  /** 처리 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setError('');
    setIsSubmitting(true);

    try {
      await resignEmployee(employee.userId, resignedAt);
      onSaved();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 이미 퇴사 처리됐거나 사원이 사라졌다 — 상세를 다시 받아 현재 상태를 보여준다
      if (
        code === EMPLOYEE_CODES.alreadyResigned ||
        code === EMPLOYEE_CODES.notFound
      ) {
        onSaved();
        onClose();
        return;
      }

      setError(messageOf(caught, '퇴사 처리를 하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  return (
    <PanelModal title="퇴사 처리" onClose={requestClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
            <span className="block text-caption text-text-secondary">대상</span>
            <span className="mt-0.5 block truncate text-label font-semibold text-text-primary">
              {employee.name} ({employee.userId})
            </span>
          </div>

          <div>
            <label
              htmlFor="resignedAt"
              className="block pb-1.5 text-[11px] font-semibold text-text-primary"
            >
              퇴사일 <span className="text-text-danger">*</span>
            </label>
            <input
              id="resignedAt"
              type="date"
              value={resignedAt}
              // 입사일보다 앞선 날짜는 애초에 고를 수 없게 한다
              min={employee.hiredAt ?? undefined}
              required
              onChange={(event) => {
                setResignedAt(event.target.value);
                setError('');
              }}
              className="w-full cursor-pointer rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-[11px] text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
            />
          </div>

          <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-[11px] leading-relaxed break-keep text-text-danger">
            퇴사 처리하면 계정이 즉시 정지되어 로그인할 수 없습니다.
            <br />
            사원 정보는 삭제되지 않고 과거 프로젝트 · 파일 이력에 그대로
            남습니다.
          </p>

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
              className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="cursor-pointer rounded-lg bg-red-text px-4 py-1.5 text-[11px] font-semibold text-text-white hover:bg-btn-danger-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
            >
              {isSubmitting ? '처리 중…' : '퇴사 처리'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}
