'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { deleteJobPosition } from './api';
import { JOB_POSITION_CODES } from './errorCodes';
import type { JobPosition } from './types';

interface DeleteJobPositionModalProps {
  position: JobPosition;
  onClose: () => void;
  /** 삭제 성공 · 이미 삭제된 경우 모두 재조회한다 */
  onDeleted: () => void;
}

/**
 * 직급 삭제 모달. (.ai/API.md 29)
 * `employeeCount > 0` 이면 미리 차단하고, 그 사이 배정된 경우는 409 로 다시 차단한다.
 */
export default function DeleteJobPositionModal({
  position,
  onClose,
  onDeleted,
}: DeleteJobPositionModalProps) {
  const [blockedMessage, setBlockedMessage] = useState(
    position.employeeCount > 0
      ? `이 직급을 사용 중인 사원이 ${position.employeeCount}명 있습니다. 해당 사원의 직급을 먼저 바꾼 뒤 삭제해주세요.`
      : '',
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await deleteJobPosition(position.jobPositionId);
      onDeleted();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (code === JOB_POSITION_CODES.inUse) {
        // 인원 수가 담긴 백엔드 문구가 가장 정확하다
        setBlockedMessage(messageOf(caught, '사용 중인 직급입니다.'));
        setIsSubmitting(false);
        return;
      }
      // 이미 삭제됨 — 목록만 갱신하고 닫는다
      if (code === JOB_POSITION_CODES.notFound) {
        onDeleted();
        onClose();
        return;
      }

      setError(messageOf(caught, '삭제하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  const isBlocked = blockedMessage !== '';
  const title = isBlocked ? '삭제할 수 없습니다' : '직급 삭제';

  /** 삭제 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  return (
    <PanelModal title={title} onClose={requestClose}>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
          <span className="min-w-0 truncate text-label font-semibold text-text-primary">
            {position.name}
          </span>
          {position.employeeCount > 0 && (
            <span className="shrink-0 rounded-button-sm border border-border-default bg-bg-card px-1.5 py-0.5 text-caption text-text-secondary">
              {position.employeeCount}명 사용 중
            </span>
          )}
        </div>

        {isBlocked ? (
          <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-text-danger">
            {blockedMessage}
          </p>
        ) : (
          <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
            삭제하면 사원 등록 · 수정 시 더 이상 선택할 수 없습니다.
            <br />
            되돌릴 수 없으니 직급명을 확인해주세요.
          </p>
        )}

        {/* 폼 모달과 같은 방식 — 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
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
              className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover"
            >
              확인
            </button>
          ) : (
            <>
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
                onClick={handleDelete}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg bg-red-text px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-danger-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
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
