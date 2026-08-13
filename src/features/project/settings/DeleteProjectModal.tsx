'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { deleteProject } from '../api';
import { PROJECT_CODES } from '../errorCodes';

interface DeleteProjectModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  /** 삭제 성공 — 부르는 쪽이 목록으로 보낸다 (이 화면은 더 이상 열 수 없다) */
  onDeleted: () => void;
}

/**
 * 프로젝트 삭제 확인 모달. (.ai/API.md 139)
 *
 * ⛔ **`진행 전` + 스텝 0개** 조건은 섹션이 미리 막지만, 그 사이 남이 스텝을 만들거나
 *    상태를 바꿨으면 409 `PROJECT_DELETE_NOT_ALLOWED` 가 온다 — 그 경우를 문구로 구분한다.
 * ℹ️ 논리 삭제이고 연결된 공고는 풀린다 — 그 공고로 다시 프로젝트를 만들 수 있다.
 */
export default function DeleteProjectModal({
  projectId,
  projectName,
  onClose,
  onDeleted,
}: DeleteProjectModalProps) {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await deleteProject(projectId);
      onDeleted();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      setError(
        code === PROJECT_CODES.deleteNotAllowed
          ? '이미 시작했거나 스텝이 있는 프로젝트는 삭제할 수 없습니다. 그 사이 다른 사람이 바꿨을 수 있어요 — 새로고침 후 종결로 처리해주세요.'
          : code === PROJECT_CODES.notFound
            ? '이미 삭제된 프로젝트입니다.'
            : messageOf(caught, '삭제하지 못했습니다.'),
      );
      setIsSubmitting(false);
    }
  }

  /** 처리 중에는 닫지 않는다 — 요청은 계속 날아간다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  return (
    <PanelModal title="프로젝트 삭제" onClose={requestClose}>
      <div className="space-y-4 p-5">
        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-primary">
          {projectName}
        </p>

        <p className="text-detail leading-relaxed break-keep text-text-primary">
          이 프로젝트를 삭제하면 <strong>목록에서 사라집니다.</strong>{' '}
          되돌리려면 관리자에게 문의해야 하니 신중히 진행해주세요.
        </p>

        <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
          연결된 공고가 있으면 함께 풀립니다 — 그 공고로 프로젝트를 다시 만들 수
          있습니다.
        </p>

        <p
          role="alert"
          className="text-caption break-keep text-text-danger empty:hidden"
        >
          {error}
        </p>
      </div>

      <ModalFooter>
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
          onClick={() => void submit()}
          disabled={isSubmitting}
          className="cursor-pointer rounded-lg bg-red-text px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-danger-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
        >
          {isSubmitting ? '삭제 중…' : '삭제'}
        </button>
      </ModalFooter>
    </PanelModal>
  );
}
