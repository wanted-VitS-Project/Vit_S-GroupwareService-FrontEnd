'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { deleteStage } from '../api';
import { STAGE_CODES } from '../errorCodes';
import { type ProjectStage, UNASSIGN_STEPS } from '../types';

interface StageDeleteModalProps {
  stage: ProjectStage;
  /** 이전 대상 후보를 뽑을 전체 목록 — 자기 자신은 여기서 걸러낸다 */
  stages: ProjectStage[];
  onClose: () => void;
  /** 삭제 성공 · 이미 삭제된 경우 모두 재조회한다 */
  onDeleted: () => void;
}

/**
 * 스테이지 삭제 모달. (.ai/API.md 114)
 *
 * ⛔ **하위 스텝은 함께 삭제되지 않는다** (STG-003) — 어디로 옮길지 고르지 않으면 400 이다.
 *    그래서 이 모달의 본체는 경고문이 아니라 **이전 대상 선택**이다.
 *
 * ⚠️ 이전된 스텝의 권한은 그대로 유지된다 — 도착 스테이지의 기본값이 소급되지 않는다.
 */
export default function StageDeleteModal({
  stage,
  stages,
  onClose,
  onDeleted,
}: StageDeleteModalProps) {
  /** 옮길 스텝이 없으면 고를 것도 없다 — 선택을 건너뛰고 미소속으로 보낸다 */
  const hasSteps = stage.stepCount > 0;
  const targets = stages.filter(
    (candidate) => candidate.stageId !== stage.stageId,
  );

  /** `''` = 아직 안 고름. 값이 있어야 삭제 버튼이 열린다 */
  const [moveTo, setMoveTo] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = (!hasSteps || moveTo !== '') && !isSubmitting;

  async function handleDelete() {
    if (!canSubmit) return;

    setError('');
    setIsSubmitting(true);

    try {
      await deleteStage(
        stage.stageId,
        hasSteps ? Number(moveTo) : UNASSIGN_STEPS,
      );
      onDeleted();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 이미 삭제됨 — 목록만 갱신하고 닫는다
      if (code === STAGE_CODES.notFound) {
        onDeleted();
        onClose();
        return;
      }
      // 고른 대상이 그 사이 사라졌거나 다른 프로젝트다 — 다시 고르게 둔다
      if (
        code === STAGE_CODES.moveTargetInvalid ||
        code === STAGE_CODES.moveTargetRequired
      ) {
        setMoveTo('');
        setError(messageOf(caught, '스텝을 옮길 단계를 다시 골라주세요.'));
        setIsSubmitting(false);
        return;
      }

      setError(messageOf(caught, '삭제하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  /** 삭제 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  return (
    <PanelModal title="단계 삭제" onClose={requestClose}>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
          <span className="min-w-0 truncate text-label font-semibold text-text-primary">
            {stage.name}
          </span>
          <span className="shrink-0 rounded-button-sm border border-border-default bg-bg-card px-1.5 py-0.5 text-caption text-text-secondary">
            스텝 {stage.stepCount}개
          </span>
        </div>

        {hasSteps ? (
          <div>
            <label
              htmlFor="stageMoveTarget"
              className="block pb-1.5 text-[11px] font-semibold text-text-primary"
            >
              하위 스텝을 옮길 곳 <span className="text-text-danger">*</span>
            </label>
            <select
              id="stageMoveTarget"
              value={moveTo}
              onChange={(event) => {
                setMoveTo(event.target.value);
                setError('');
              }}
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-[11px] text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                옮길 곳을 선택해주세요
              </option>
              {targets.map((target) => (
                <option key={target.stageId} value={target.stageId}>
                  {target.name}
                </option>
              ))}
              <option value={UNASSIGN_STEPS}>미분류 (단계 없음)</option>
            </select>
            <p className="mt-1 text-caption break-keep text-text-secondary">
              스텝 {stage.stepCount}개는 삭제되지 않고 이곳으로 옮겨집니다.
              스텝의 편집 권한은 그대로 유지됩니다.
            </p>
          </div>
        ) : (
          <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-[11px] leading-relaxed break-keep text-yellow-text">
            소속된 스텝이 없어 바로 삭제할 수 있습니다.
            <br />
            되돌릴 수 없으니 단계명을 확인해주세요.
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
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className="cursor-pointer rounded-lg bg-red-text px-4 py-1.5 text-[11px] font-semibold text-text-white hover:bg-btn-danger-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
          >
            {isSubmitting ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </ModalFooter>
    </PanelModal>
  );
}
