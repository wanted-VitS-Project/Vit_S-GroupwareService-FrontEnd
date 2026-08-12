'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { deleteDepartment } from './api';
import { DEPARTMENT_CODES } from './errorCodes';
import type { Department } from './types';

interface DeleteDepartmentModalProps {
  department: Department;
  onClose: () => void;
  /** 삭제 성공 · 이미 삭제된 경우 모두 재조회한다 */
  onDeleted: () => void;
}

/** 목록 값으로 미리 막을 수 있는 경우의 안내 문구 */
function blockedReason({ directEmployeeCount, children }: Department) {
  if (directEmployeeCount > 0) {
    return `이 부서에 직속 사원이 ${directEmployeeCount}명 있습니다. 사원의 부서를 먼저 옮긴 뒤 삭제해주세요.`;
  }
  if (children.length > 0) {
    return `하위 부서가 ${children.length}개 있습니다. 하위 부서를 먼저 삭제해주세요.`;
  }
  return '';
}

/**
 * 부서 삭제 모달. (.ai/API.md 25)
 * 목록 값으로 미리 차단하고, 그 사이 사원 · 하위 부서가 생긴 경우는 409 로 다시 차단한다.
 */
export default function DeleteDepartmentModal({
  department,
  onClose,
  onDeleted,
}: DeleteDepartmentModalProps) {
  const [blockedMessage, setBlockedMessage] = useState(
    blockedReason(department),
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await deleteDepartment(department.departmentId);
      onDeleted();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (
        code === DEPARTMENT_CODES.hasEmployees ||
        code === DEPARTMENT_CODES.hasChildren
      ) {
        // 인원 수 · 부서 수가 담긴 백엔드 문구가 가장 정확하다
        setBlockedMessage(messageOf(caught, '삭제할 수 없는 부서입니다.'));
        setIsSubmitting(false);
        return;
      }
      // 이미 삭제됨 — 목록만 갱신하고 닫는다
      if (code === DEPARTMENT_CODES.notFound) {
        onDeleted();
        onClose();
        return;
      }

      setError(messageOf(caught, '삭제하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  const isBlocked = blockedMessage !== '';
  const title = isBlocked ? '삭제할 수 없습니다' : '부서 삭제';

  /** 삭제 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  return (
    <PanelModal title={title} onClose={requestClose}>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
          <span className="min-w-0 truncate text-label font-semibold text-text-primary">
            {department.name}
          </span>
          <span className="shrink-0 rounded-button-sm border border-border-default bg-bg-card px-1.5 py-0.5 text-caption text-text-secondary">
            {department.totalEmployeeCount}명
          </span>
        </div>

        {isBlocked ? (
          <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-[11px] leading-relaxed break-keep text-text-danger">
            {blockedMessage}
          </p>
        ) : (
          <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-[11px] leading-relaxed break-keep text-yellow-text">
            삭제하면 사원 등록 · 수정 시 더 이상 선택할 수 없습니다.
            <br />
            되돌릴 수 없으니 부서명을 확인해주세요.
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
          {isBlocked ? (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-[11px] font-semibold text-text-white hover:bg-btn-primary-hover"
            >
              확인
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg bg-red-text px-4 py-1.5 text-[11px] font-semibold text-text-white hover:bg-btn-danger-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
              >
                {isSubmitting ? '삭제 중…' : '삭제'}
              </button>
            </>
          )}
        </div>
      </ModalFooter>
    </PanelModal>
  );
}
