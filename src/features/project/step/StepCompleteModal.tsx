'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { completeStep } from '../api';
import { STEP_CODES } from '../errorCodes';
import type { CompletedStep, OpenIssueAction, ProjectStep } from '../types';

interface StepCompleteModalProps {
  step: ProjectStep;
  onClose: () => void;
  onCompleted: (result: CompletedStep) => void;
}

const ACTIONS: {
  value: OpenIssueAction;
  label: string;
  description: string;
}[] = [
  {
    value: 'KEEP',
    label: '그대로 두기',
    description: '남은 이슈에 `완료된 스텝` 배지가 붙고 계속 다룰 수 있습니다.',
  },
  {
    value: 'CLOSE',
    label: '함께 종료',
    description: '남은 이슈를 이 스텝과 함께 종료 처리합니다.',
  },
];

/**
 * 스텝 완료 처리 모달. (.ai/API.md 118)
 *
 * **이슈가 미완료여도 스텝을 완료할 수 있다** (STP-005) — 다만 남은 이슈를
 * 그대로 둘지 함께 종료할지(`openIssueAction`)는 **반드시 골라야 한다** (없으면 400).
 *
 * ℹ️ 멱등이라 낙관적 락 대상이 아니다. 이미 완료된 스텝을 다시 완료해도
 *    최초 완료자·완료시각을 덮어쓰지 않는다.
 */
export default function StepCompleteModal({
  step,
  onClose,
  onCompleted,
}: StepCompleteModalProps) {
  /**
   * 목록이 주는 카운트로 미리 셈한다 — 정확한 값은 응답의 `openIssueCount` 다.
   * (진행 중 + 진행 전을 합친 수라 `total - done` 으로 잡는다)
   */
  const openIssueCount = Math.max(
    step.totalIssueCount - step.doneIssueCount,
    0,
  );
  const hasOpenIssues = openIssueCount > 0;

  const [action, setAction] = useState<OpenIssueAction>('KEEP');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleComplete() {
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      // 미완료 이슈가 없어도 파라미터는 필수다 — 기본값 `KEEP` 을 그대로 보낸다
      const result = await completeStep(step.stepId, action);
      onCompleted(result);
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (code === STEP_CODES.notFound) {
        setError('이미 삭제된 스텝입니다. 새로고침해주세요.');
        setIsSubmitting(false);
        return;
      }

      setError(messageOf(caught, '완료 처리하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  /** 처리 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  return (
    <PanelModal title="스텝 완료 처리" onClose={requestClose}>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
          <span className="min-w-0 truncate text-label font-semibold text-text-primary">
            {step.name}
          </span>
          <span className="shrink-0 rounded-button-sm border border-border-default bg-bg-card px-1.5 py-0.5 text-caption text-text-secondary">
            이슈 {step.doneIssueCount} / {step.totalIssueCount}
          </span>
        </div>

        {hasOpenIssues ? (
          <fieldset>
            <legend className="pb-1.5 text-detail font-semibold text-text-primary">
              미완료 이슈 {openIssueCount}개를 어떻게 할까요?{' '}
              <span className="text-text-danger">*</span>
            </legend>
            <div className="space-y-1.5">
              {ACTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-2 rounded-lg border px-3 py-2.5 ${
                    action === option.value
                      ? 'border-border-primary bg-blue-bg-soft'
                      : 'border-border-default bg-bg-surface hover:bg-bg-hover'
                  }`}
                >
                  <input
                    type="radio"
                    name="openIssueAction"
                    value={option.value}
                    checked={action === option.value}
                    disabled={isSubmitting}
                    onChange={() => {
                      setAction(option.value);
                      setError('');
                    }}
                    className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-btn-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-detail font-semibold text-text-primary">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-caption break-keep text-text-secondary">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
            미완료 이슈가 없습니다. 바로 완료 처리할 수 있습니다.
          </p>
        )}

        <p className="text-caption break-keep text-text-secondary">
          완료자와 완료 시각이 기록됩니다. 이미 완료된 스텝을 다시 완료해도 최초
          기록은 바뀌지 않습니다.
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
            onClick={requestClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg px-4 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
          >
            {isSubmitting ? '처리 중…' : '완료 처리'}
          </button>
        </div>
      </ModalFooter>
    </PanelModal>
  );
}
