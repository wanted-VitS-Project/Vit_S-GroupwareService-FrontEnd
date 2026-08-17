'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { deleteProject } from '../api';
import { PROJECT_CODES } from '../errorCodes';

interface DeleteProjectModalProps {
  projectId: string;
  projectName: string;
  /** 함께 지워질 스텝 수 — 0 이면 개수를 적지 않는다 */
  stepCount: number;
  /** 서버가 되물을 조건(진행 전 + 스텝 0개가 아님)인가 — 미리 알리고 `confirm` 을 실어 보낸다 */
  requiresConfirm: boolean;
  onClose: () => void;
  /** 삭제 성공 — 부르는 쪽이 목록으로 보낸다 (이 화면은 더 이상 열 수 없다) */
  onDeleted: () => void;
}

/**
 * 프로젝트 삭제 확인 모달. **2단계다.** (.ai/API.md 139)
 *
 * 진행 전 + 스텝 0개면 첫 호출에 바로 지워지고, 아니면 409
 * `PROJECT_DELETE_CONFIRM_REQUIRED` 로 되묻는다.
 *
 * ℹ️ 되물을 조건(`requiresConfirm`)은 상세 응답으로 이미 알 수 있어 **누르기 전에 미리 알리고**,
 *    그 경우 첫 호출부터 `confirm` 을 실어 보낸다 — 이 모달이 곧 확인 단계라 두 번 묻지 않는다.
 * ⛔ **409 를 실패로 끝내면 그 프로젝트는 영영 지울 수 없다** — 경합(그 사이 남이 스텝을 만듦)으로
 *    되물음이 오면 서버 `message` 를 그대로 띄우고 한 번 더 확인받는다. **분기는 `code`, 표시는 `message`.**
 * ℹ️ 논리 삭제이고 연결된 공고는 풀린다 — 그 공고로 다시 프로젝트를 만들 수 있다.
 */
export default function DeleteProjectModal({
  projectId,
  projectName,
  stepCount,
  requiresConfirm,
  onClose,
  onDeleted,
}: DeleteProjectModalProps) {
  const [error, setError] = useState('');
  /** 409 되물음 — 서버가 준 문구 그대로. 비어 있으면 아직 1단계다 */
  const [confirmMessage, setConfirmMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      // 아래 경고로 이미 범위를 알렸거나 되물음을 받았으면 confirm 을 실어 보낸다
      await deleteProject(projectId, {
        confirm: requiresConfirm || confirmMessage !== '',
      });
      onDeleted();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (code === PROJECT_CODES.deleteConfirmRequired) {
        setConfirmMessage(
          messageOf(caught, '하위 스텝까지 함께 삭제됩니다. 계속할까요?'),
        );
      } else {
        setError(
          code === PROJECT_CODES.notFound
            ? '이미 삭제된 프로젝트입니다.'
            : messageOf(caught, '삭제하지 못했습니다.'),
        );
      }

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
          이 프로젝트를 삭제하면 목록에서 사라지고{' '}
          <strong>되돌릴 수 없습니다.</strong>
        </p>

        {/* 함께 지워지는 범위 — 되물을 조건일 때만 따로 알린다 */}
        {requiresConfirm && !confirmMessage && (
          <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-text-danger">
            {stepCount > 0
              ? `스텝 ${stepCount}개와 그 안의 블록 · 이슈도 함께 삭제됩니다.`
              : '이미 시작한 프로젝트입니다. 하위 항목도 함께 삭제됩니다.'}
          </p>
        )}

        {/* 경합으로 되물음이 오면(그 사이 남이 스텝을 만듦) 서버 문구로 갈아 끼운다 */}
        {confirmMessage && (
          <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-text-danger">
            {confirmMessage}
          </p>
        )}

        <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
          연결된 공고가 있으면 함께 풀립니다.
          <br />
          그 공고로 프로젝트를 다시 만들 수 있습니다.
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
          onClick={requestClose}
          disabled={isSubmitting}
          className="btn btn-md btn-gray-outlined"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting}
          className="btn btn-md btn-danger"
        >
          {isSubmitting ? '삭제 중…' : confirmMessage ? '그래도 삭제' : '삭제'}
        </button>
      </ModalFooter>
    </PanelModal>
  );
}
