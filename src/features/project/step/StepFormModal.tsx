'use client';

import { useEffect, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { createStep, getProjectMembers, updateStep } from '../api';
import { STEP_CODES } from '../errorCodes';
import {
  type ProjectMember,
  type ProjectStep,
  STEP_NAME_MAX_LENGTH,
} from '../types';

interface StepFormModalProps {
  projectId: string;
  /** 있으면 수정, 없으면 추가 */
  step?: ProjectStep;
  /** 추가할 때 소속시킬 스테이지. 없으면 미분류 스텝이 된다 */
  stageId?: number;
  /** 어느 단계에 넣는지 모달 머리에 보여준다 */
  stageName?: string;
  onClose: () => void;
  onSaved: () => void;
}

const FIELD_CLASS =
  'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-[11px] text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:cursor-not-allowed';

/**
 * 스텝 추가 · 수정 모달. (.ai/API.md 115 · 116)
 *
 * ⚠️ **수정은 전체 덮어쓰기다** — 생략한 필드는 유지가 아니라 해제된다.
 *    그래서 비운 칸도 그대로 "해제" 로 읽히도록 폼 전체를 매번 보낸다.
 *
 * ⛔ 소속 스테이지는 **추가할 때만** 정할 수 있다 (2026-08-09 · `47a3866`).
 *    수정 API 는 `stageId` 를 받지 않는다 — 위치 변경은 `steps/order` 소관이다.
 *
 * ⚠️ 수정은 낙관적 락이라 409 면 덮어쓸지 다시 불러올지 묻는다.
 */
export default function StepFormModal({
  projectId,
  step,
  stageId,
  stageName,
  onClose,
  onSaved,
}: StepFormModalProps) {
  const isEditing = step !== undefined;

  const [name, setName] = useState(step?.name ?? '');
  const [startedOn, setStartedOn] = useState(step?.startedOn ?? '');
  const [endedOn, setEndedOn] = useState(step?.endedOn ?? '');
  const [ownerUserId, setOwnerUserId] = useState(step?.owner?.userId ?? '');

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [haveMembersFailed, setHaveMembersFailed] = useState(false);

  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConflicting, setIsConflicting] = useState(false);

  /** 수정에 필요한 `version` 이 목록 응답에 없는 경우 (`types.ts` 참고) */
  const hasNoVersion = isEditing && step.version === undefined;

  // 책임자는 보조 정보다 — 못 불러와도 이름 · 일정은 저장할 수 있어야 한다
  useEffect(() => {
    const controller = new AbortController();

    getProjectMembers(projectId, controller.signal)
      .then(setMembers)
      .catch(() => {
        if (!controller.signal.aborted) setHaveMembersFailed(true);
      });

    return () => controller.abort();
  }, [projectId]);

  const trimmedName = name.trim();
  /** 기간을 거꾸로 넣으면 서버에 보내기 전에 막는다 */
  const isRangeReversed =
    startedOn !== '' && endedOn !== '' && endedOn < startedOn;
  const canSubmit =
    trimmedName !== '' && !isRangeReversed && !isSubmitting && !hasNoVersion;

  /** 값을 고치면 직전 서버 오류는 더 이상 맞지 않는다 */
  function clearErrors() {
    setNameError('');
    setError('');
  }

  /** 저장 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  async function save(overwrite: boolean) {
    clearErrors();
    setIsConflicting(false);
    setIsSubmitting(true);

    // 빈 칸은 아예 싣지 않는다 — 수정에서는 그것이 곧 '해제' 다
    const optional = {
      ...(startedOn ? { startedOn } : {}),
      ...(endedOn ? { endedOn } : {}),
      ...(ownerUserId ? { ownerUserId } : {}),
    };

    try {
      if (step) {
        if (step.version === undefined) {
          setError('버전 정보가 없어 저장할 수 없습니다. 새로고침해주세요.');
          setIsSubmitting(false);
          return;
        }
        await updateStep(step.stepId, {
          name: trimmedName,
          ...optional,
          version: step.version,
          ...(overwrite ? { overwrite: true } : {}),
        });
      } else {
        await createStep(projectId, {
          name: trimmedName,
          ...(stageId === undefined ? {} : { stageId }),
          ...optional,
        });
      }

      onSaved();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 남이 먼저 저장했다 — 덮어쓸지 다시 불러올지 묻는다
      if (code === STEP_CODES.versionConflict) {
        setIsConflicting(true);
        setIsSubmitting(false);
        return;
      }
      // 남이 먼저 지웠다 — 목록만 갱신하고 닫는다
      if (code === STEP_CODES.notFound) {
        onSaved();
        onClose();
        return;
      }

      const message = messageOf(caught, '저장하지 못했습니다.');
      if (caught instanceof ApiError && caught.status === 400) {
        setNameError(message);
      } else {
        setError(message);
      }
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // 기간 역전은 `canSubmit` 이 막고, 이유는 폼에 상시 표시된다
    if (canSubmit) void save(false);
  }

  return (
    <>
      <PanelModal
        title={isEditing ? '스텝 수정' : '스텝 추가'}
        onClose={requestClose}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            {!isEditing && (
              <div className="rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
                <span className="block text-caption text-text-secondary">
                  소속 단계
                </span>
                <span className="mt-0.5 block truncate text-label font-semibold text-text-primary">
                  {stageName ?? '미분류 (단계 없음)'}
                </span>
              </div>
            )}

            <div>
              <div className="flex items-end justify-between gap-2 pb-1.5">
                <label
                  htmlFor="stepName"
                  className="text-[11px] font-semibold text-text-primary"
                >
                  스텝명 <span className="text-text-danger">*</span>
                </label>
                <span className="text-caption text-text-secondary">
                  {name.length} / {STEP_NAME_MAX_LENGTH}
                </span>
              </div>
              <input
                id="stepName"
                type="text"
                value={name}
                maxLength={STEP_NAME_MAX_LENGTH}
                onChange={(event) => {
                  setName(event.target.value);
                  clearErrors();
                }}
                placeholder="제안서 작성"
                autoFocus
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? 'stepName-error' : undefined}
                className={
                  nameError
                    ? `${FIELD_CLASS} border-border-danger focus:outline-border-danger`
                    : FIELD_CLASS
                }
              />
              {nameError && (
                <p
                  id="stepName-error"
                  role="alert"
                  className="mt-1 text-caption break-keep text-text-danger"
                >
                  {nameError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="stepStartedOn"
                  className="block pb-1.5 text-[11px] font-semibold text-text-primary"
                >
                  시작일
                </label>
                <input
                  id="stepStartedOn"
                  type="date"
                  value={startedOn}
                  onChange={(event) => {
                    setStartedOn(event.target.value);
                    clearErrors();
                  }}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor="stepEndedOn"
                  className="block pb-1.5 text-[11px] font-semibold text-text-primary"
                >
                  종료일
                </label>
                <input
                  id="stepEndedOn"
                  type="date"
                  value={endedOn}
                  min={startedOn || undefined}
                  onChange={(event) => {
                    setEndedOn(event.target.value);
                    clearErrors();
                  }}
                  aria-invalid={isRangeReversed ? true : undefined}
                  className={
                    isRangeReversed
                      ? `${FIELD_CLASS} border-border-danger focus:outline-border-danger`
                      : FIELD_CLASS
                  }
                />
              </div>
            </div>
            {/*
              저장 버튼이 이미 막혀 있어 **누르는 순간 알리는 방식은 닿지 않는다** —
              역전된 순간 바로 이유를 보여준다.
            */}
            {isRangeReversed && (
              <p
                role="alert"
                className="text-caption break-keep text-text-danger"
              >
                종료일은 시작일보다 앞설 수 없습니다.
              </p>
            )}

            <div>
              <label
                htmlFor="stepOwner"
                className="block pb-1.5 text-[11px] font-semibold text-text-primary"
              >
                책임자
              </label>
              <select
                id="stepOwner"
                value={ownerUserId}
                onChange={(event) => {
                  setOwnerUserId(event.target.value);
                  clearErrors();
                }}
                disabled={isSubmitting || haveMembersFailed}
                className={`${FIELD_CLASS} cursor-pointer`}
              >
                <option value="">지정 안 함</option>
                {/*
                  목록을 못 받았거나 참여자에서 빠진 사이에도 지금 책임자는 보여야 한다 —
                  선택지에 없으면 <select> 가 값을 버려 저장 시 조용히 해제된다
                */}
                {step?.owner &&
                  !members.some(
                    (member) => member.userId === step.owner?.userId,
                  ) && (
                    <option value={step.owner.userId}>
                      {step.owner.name}
                      {step.owner.deleted ? ' · 삭제된 사원' : ''}
                    </option>
                  )}
                {members.map((member) => (
                  <option key={member.memberId} value={member.userId}>
                    {member.name}
                    {member.department ? ` · ${member.department}` : ''}
                    {member.resigned ? ' · 퇴사' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-caption break-keep text-text-secondary">
                {haveMembersFailed
                  ? '참여자를 불러오지 못해 책임자를 바꿀 수 없습니다.'
                  : '책임자는 작업자가 아니라 이 스텝을 책임지는 한 사람입니다.'}
              </p>
            </div>

            {isEditing && (
              <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-caption leading-relaxed break-keep text-text-secondary">
                비운 칸은 저장 시 <strong>해제</strong>됩니다. 소속 단계와
                순서는 이 화면에서 바꿀 수 없습니다.
              </p>
            )}

            {hasNoVersion && (
              <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-[11px] leading-relaxed break-keep text-yellow-text">
                이 스텝의 버전 정보를 받지 못해 수정할 수 없습니다. 새로고침 후
                다시 시도해주세요.
              </p>
            )}
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
                onClick={requestClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-[11px] font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
              >
                {isSubmitting ? '저장 중…' : isEditing ? '저장' : '추가'}
              </button>
            </div>
          </ModalFooter>
        </form>
      </PanelModal>

      {isConflicting && (
        // 취소(= Esc · 배경 클릭)를 다시 불러오기에 둔다 — 잘못 눌러도 남의 값이 지워지지 않는다
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="다른 사람이 먼저 저장했어요"
          description="그 사이 이 스텝이 수정됐습니다. 지금 입력한 내용으로 덮어쓰거나, 최신 내용을 다시 불러올 수 있습니다."
          confirmLabel="덮어쓰기"
          cancelLabel="다시 불러오기"
          isDanger
          onConfirm={() => void save(true)}
          onCancel={() => {
            onSaved();
            onClose();
          }}
        />
      )}
    </>
  );
}
