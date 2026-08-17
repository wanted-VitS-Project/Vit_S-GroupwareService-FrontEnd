'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { notifyToast } from '@/components/Toast';
import { messageOf } from '@/lib/api';

import { closeProject } from '../api';
import { CLOSE_REASON_LABELS, CLOSE_REASONS } from '../labels';
import type { CloseReasonCode } from '../types';
import { CLOSE_REASON_NOTE_MAX_LENGTH } from '../types';

interface CloseProjectModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  /** 종결 응답에 `version` 이 없어 상세를 다시 읽는다 */
  onClosed: () => void;
}

/**
 * 프로젝트 종결 모달. (.ai/API.md 131)
 *
 * ⛔ **낙관적 락 대상이 아니다** — `version` 을 싣지 않고 409 도 오지 않는다.
 *    사유가 필수라 두 번 눌러도 결과가 같고 잃을 편집 내용이 없어서다.
 * ℹ️ 삭제가 아니다 — 목록 · 활동 기록에는 그대로 남는다는 것을 문구로 알린다.
 */
export default function CloseProjectModal({
  projectId,
  projectName,
  onClose,
  onClosed,
}: CloseProjectModalProps) {
  const [reasonCode, setReasonCode] = useState<CloseReasonCode | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (isSubmitting) return;

    // 백엔드도 막지만, 사유 없이 눌렀다가 400 을 보는 것보다 여기서 잡는 편이 낫다
    if (!reasonCode) {
      setError('종결 사유를 골라주세요.');
      return;
    }
    if (note.length > CLOSE_REASON_NOTE_MAX_LENGTH) {
      setError(
        `사유 상세는 ${CLOSE_REASON_NOTE_MAX_LENGTH}자를 넘을 수 없습니다.`,
      );
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await closeProject(projectId, {
        closeReasonCode: reasonCode,
        ...(note.trim() ? { closeReasonNote: note.trim() } : {}),
      });
      onClosed();
      onClose();
      // 모달을 닫은 뒤에 띄운다 — <dialog> 가 최상위 레이어라 토스트를 가린다
      notifyToast('프로젝트를 종결했습니다.');
    } catch (caught) {
      setError(messageOf(caught, '종결하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  /** 처리 중에는 닫지 않는다 — 요청은 계속 날아간다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  return (
    <PanelModal title="프로젝트 종결" onClose={requestClose}>
      <div className="space-y-4 p-5">
        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-primary">
          {projectName}
        </p>

        <fieldset>
          <legend className="mb-1.5 text-detail font-medium text-text-primary">
            종결 사유
            <span aria-hidden className="ml-0.5 text-text-danger">
              *
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {CLOSE_REASONS.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={reasonCode === code}
                disabled={isSubmitting}
                onClick={() => {
                  setReasonCode(code);
                  setError('');
                }}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-detail font-medium whitespace-nowrap disabled:cursor-not-allowed ${
                  reasonCode === code
                    ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
                    : 'border-border-default text-text-primary hover:bg-bg-hover'
                }`}
              >
                {CLOSE_REASON_LABELS[code]}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="closeReasonNote"
            className="mb-1.5 block text-detail font-medium text-text-primary"
          >
            사유 상세 (선택)
          </label>
          <textarea
            id="closeReasonNote"
            value={note}
            rows={3}
            maxLength={CLOSE_REASON_NOTE_MAX_LENGTH}
            disabled={isSubmitting}
            onChange={(event) => setNote(event.target.value)}
            placeholder="예) 기술평가 2순위로 탈락"
            className="w-full resize-y rounded-lg border border-border-default px-3 py-2 text-label text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
          />
          <p className="mt-1 text-right text-caption text-text-secondary">
            {note.length} / {CLOSE_REASON_NOTE_MAX_LENGTH}
          </p>
        </div>

        <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
          종결해도 프로젝트가 삭제되지는 않습니다.
          <br />
          목록과 활동 기록에 그대로 남고, 나중에 다른 상태로 되돌릴 수 있습니다.
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
          {isSubmitting ? '종결 중…' : '종결'}
        </button>
      </ModalFooter>
    </PanelModal>
  );
}
