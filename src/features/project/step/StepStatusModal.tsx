'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { notifyToast } from '@/components/Toast';
import { ApiError, messageOf } from '@/lib/api';

import { updateStepStatus } from '../api';
import { isVersionConflict } from '../errorCodes';
import { STEP_STATUS_CHANGE_LABELS } from '../labels';
import type { ProjectStep, StepStatus, StepStatusChange } from '../types';

// 모달 안에서 고를 수 있는 값. 완료까지 한 줄에 놓는다 —
// 사용자에게는 다 같은 "상태 바꾸기" 인데 메뉴 항목이 셋으로 나뉘어 있으면
// 어느 것을 눌러야 할지 매번 읽어야 한다.
// 완료만 다른 API 다 (미완료 이슈 처리 선택이 필요해 completeStep 소관) —
// 그래서 고르면 이 모달을 닫고 완료 처리 모달로 넘긴다.
const CHOICES: { value: StepStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: STEP_STATUS_CHANGE_LABELS.NOT_STARTED },
  { value: 'IN_PROGRESS', label: STEP_STATUS_CHANGE_LABELS.IN_PROGRESS },
  { value: 'DONE', label: '완료' },
];

interface StepStatusModalProps {
  step: ProjectStep;
  onClose: () => void;
  onChanged: () => void;
  /** 완료 를 골랐을 때 — 완료 처리 모달로 넘긴다 (미완료 이슈 처리를 물어야 한다) */
  onRequestComplete: () => void;
}

// 스텝 상태 변경. (.ai/API.md 137·118)
// DONE 은 137번으로 보낼 수 없다 — 400 STEP_STATUS_INVALID 다.
// 화면에서는 한 줄에 함께 놓되, 고르면 완료 처리(118)로 넘긴다.
// 완료된 스텝을 되돌리면 완료 기록(completedAt·completedBy)까지 비워진다 —
// 상태만 바뀌는 줄 알고 눌렀다가 기록을 잃지 않도록 경고를 띄운다.
// 낙관적 락 — 409 면 재조회 / 덮어쓰기를 묻는다.
export default function StepStatusModal({
  step,
  onClose,
  onChanged,
  onRequestComplete,
}: StepStatusModalProps) {
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  /** 409 를 받아 사용자의 선택을 기다리는 중 */
  const [conflictMessage, setConflictMessage] = useState('');
  /** 되돌리기처럼 한 번 더 물어야 하는 선택 */
  const [pending, setPending] = useState<StepStatusChange | null>(null);

  const isDone = step.status === 'DONE';

  async function save(status: StepStatusChange, overwrite: boolean) {
    if (isSaving) return;

    // 목록 응답에 version 이 없으면 보낼 수가 없다 — 400 을 맞기 전에 막는다
    if (step.version === undefined) {
      setError('버전 정보가 없어 상태를 바꿀 수 없습니다. 새로고침해주세요.');
      setPending(null);
      return;
    }

    setError('');
    setConflictMessage('');
    setPending(status);
    setIsSaving(true);

    try {
      await updateStepStatus(step.stepId, {
        status,
        version: step.version,
        ...(overwrite ? { overwrite: true } : {}),
      });

      onChanged();
      onClose();
      // 모달을 닫은 뒤에 띄운다 — <dialog> 가 최상위 레이어라 토스트를 가린다
      notifyToast(
        `'${step.name}' 을(를) ${STEP_STATUS_CHANGE_LABELS[status]} 상태로 바꿨습니다.`,
      );
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (isVersionConflict(code)) {
        setConflictMessage(
          messageOf(caught, '다른 사람이 먼저 이 스텝을 수정했습니다.'),
        );
      } else {
        setError(messageOf(caught, '상태를 바꾸지 못했습니다.'));
      }
      setIsSaving(false);
    }
  }

  /** 저장 중에는 닫지 않는다 — 요청은 계속 날아간다 (다른 모달과 같은 규칙) */
  function requestClose() {
    if (!isSaving) onClose();
  }

  function choose(value: StepStatus) {
    if (value === step.status || isSaving) return;

    if (value === 'DONE') {
      // 완료는 미완료 이슈 처리 선택이 필요해 전용 모달이 받는다
      onClose();
      onRequestComplete();
      return;
    }

    /*
     * 고른 즉시 저장하지 않는다. 목록의 ⋯ 에서 두 번 눌러 들어온 자리라
     * 잘못 누르기 쉽고, 상태는 활동 기록에 남는 값이다 — 한 번 더 확인을 받는다.
     * (완료를 되돌리는 경우에는 잃는 것까지 함께 알린다)
     */
    setPending(value);
  }

  if (conflictMessage && pending) {
    return (
      <AlertDialogTwoButton
        icon={DialogIcons.warning}
        title="다른 사람이 먼저 수정했습니다"
        description={`${conflictMessage} 최신 내용을 다시 불러올지, 고른 상태로 덮어쓸지 선택해주세요.`}
        errorMessage={error || undefined}
        confirmLabel="덮어쓰기"
        cancelLabel="다시 불러오기"
        isDanger
        isBusy={isSaving}
        onConfirm={() => void save(pending, true)}
        onCancel={() => {
          onChanged();
          onClose();
        }}
      />
    );
  }

  /*
   * 바꾸기 전 확인. 완료를 되돌리는 경우에만 잃는 것을 함께 알리고 빨간 버튼을 쓴다 —
   * 나머지는 되돌릴 수 있는 변경이라 같은 다이얼로그를 안내 톤으로 띄운다.
   */
  if (pending) {
    return (
      <AlertDialogTwoButton
        icon={isDone ? DialogIcons.warning : DialogIcons.info}
        title={
          isDone
            ? `${STEP_STATUS_CHANGE_LABELS[pending]} 상태로 되돌릴까요?`
            : `${STEP_STATUS_CHANGE_LABELS[pending]} 상태로 바꿀까요?`
        }
        description={
          isDone
            ? '완료자와 완료 시각 기록이 함께 지워집니다. 하위 이슈는 그대로 남습니다.'
            : `'${step.name}' 의 상태만 바뀝니다. 진척률은 이슈 진행에 따라 따로 계산됩니다.`
        }
        errorMessage={error || undefined}
        confirmLabel={isDone ? '되돌리기' : STEP_STATUS_CHANGE_LABELS[pending]}
        isDanger={isDone}
        isBusy={isSaving}
        onConfirm={() => void save(pending, false)}
        onCancel={() => {
          if (!isSaving) setPending(null);
        }}
      />
    );
  }

  return (
    <PanelModal title="스텝 상태 변경" onClose={requestClose}>
      <div className="space-y-4 p-5">
        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-primary">
          {step.name}
        </p>

        <div className="flex flex-wrap gap-2">
          {CHOICES.map((choice) => {
            const isCurrent = step.status === choice.value;

            return (
              <button
                key={choice.value}
                type="button"
                aria-pressed={isCurrent}
                disabled={isCurrent || isSaving}
                onClick={() => choose(choice.value)}
                className={`cursor-pointer rounded-lg border px-3.5 py-2 text-detail font-medium whitespace-nowrap disabled:cursor-not-allowed ${
                  isCurrent
                    ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
                    : 'border-border-default text-text-primary hover:bg-bg-hover'
                }`}
              >
                {choice.label}
                {isCurrent && (
                  <span className="ml-1 text-caption text-text-secondary">
                    현재
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-caption leading-relaxed break-keep text-text-secondary">
          상태는 진척률과 별개 값입니다 — 이슈를 다 끝내도 저절로 바뀌지
          않습니다. <strong>완료</strong>는 남은 이슈를 어떻게 할지 함께 골라야
          해서 다음 화면에서 처리합니다.
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
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="btn btn-md btn-gray-outlined"
        >
          {isSaving ? '저장 중…' : '닫기'}
        </button>
      </ModalFooter>
    </PanelModal>
  );
}
