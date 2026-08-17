'use client';

import { useEffect, useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import LoadingSpinner from '@/components/Spinner';
import { getStepBlocks } from '@/features/block/api';
import type { StepBlock } from '@/features/block/types';
import { FILE_CODES } from '@/features/file/errorCodes';
import { ApiError, messageOf } from '@/lib/api';

import { deleteStep } from '../api';
import { STEP_CODES } from '../errorCodes';
import type { ProjectStep } from '../types';

interface StepDeleteModalProps {
  step: ProjectStep;
  /** 블록을 옮길 후보 — 자기 자신은 여기서 걸러낸다 */
  steps: ProjectStep[];
  onClose: () => void;
  /** 삭제 성공 · 이미 삭제된 경우 모두 재조회한다 */
  onDeleted: (result: { movedBlockCount: number }) => void;
}

/**
 * 스텝 삭제 모달. (.ai/API.md 117)
 *
 * 하위 블록은 **골라서 살릴 수 있다** — 고른 것만 다른 스텝으로 옮기고 나머지는 삭제한다.
 * 그래서 열 때 블록 목록을 한 번 조회한다 (`moveBlockIds` 에 실을 ID 가 필요하다).
 *
 * ⛔ **이슈는 선택지가 없다** — 스텝을 지우면 하위 이슈는 무조건 함께 삭제된다 (STP-013).
 * ⚠️ 옮긴 블록의 **이슈 연결은 끊긴다** (BLK-014 · INV-06) — 블록과 이슈는 같은 스텝이어야 한다.
 * ⛔ 낙관적 락 대상이 아니다 — `version` 을 받지 않는다.
 */
export default function StepDeleteModal({
  step,
  steps,
  onClose,
  onDeleted,
}: StepDeleteModalProps) {
  /** `null` = 아직 조회 중 */
  const [blocks, setBlocks] = useState<StepBlock[] | null>(null);
  const [haveBlocksFailed, setHaveBlocksFailed] = useState(false);
  const [movingIds, setMovingIds] = useState<number[]>([]);
  const [moveToStepId, setMoveToStepId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targets = steps.filter((candidate) => candidate.stepId !== step.stepId);
  /** 실제로 고를 수 있는 곳 — 도착 스텝도 EDITOR 여야 블록이 옮겨진다 */
  const hasEditableTarget = targets.some(
    (target) => target.myPermission === 'EDITOR',
  );

  useEffect(() => {
    const controller = new AbortController();

    getStepBlocks(step.stepId, controller.signal)
      .then(setBlocks)
      .catch(() => {
        if (!controller.signal.aborted) {
          setHaveBlocksFailed(true);
          setBlocks([]);
        }
      });

    return () => controller.abort();
  }, [step.stepId]);

  const isLoading = blocks === null;
  const hasMoveTarget = movingIds.length > 0;
  const canSubmit =
    !isLoading && !isSubmitting && (!hasMoveTarget || moveToStepId !== '');

  function toggleBlock(blockId: number) {
    setError('');
    setMovingIds((previous) =>
      previous.includes(blockId)
        ? previous.filter((id) => id !== blockId)
        : [...previous, blockId],
    );
  }

  async function handleDelete() {
    if (!canSubmit) return;

    setError('');
    setIsSubmitting(true);

    try {
      const result = await deleteStep(step.stepId, {
        ...(hasMoveTarget
          ? { moveBlockIds: movingIds, moveToStepId: Number(moveToStepId) }
          : {}),
      });
      onDeleted({ movedBlockCount: result.movedBlockCount });
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 이미 삭제됨 — 목록만 갱신하고 닫는다
      if (code === STEP_CODES.notFound) {
        onDeleted({ movedBlockCount: 0 });
        onClose();
        return;
      }
      // 옮길 곳이 그 사이 사라졌거나 다른 프로젝트다 — 다시 고르게 둔다
      if (
        code === STEP_CODES.blockMoveTargetInvalid ||
        code === STEP_CODES.blockMoveTargetRequired
      ) {
        setMoveToStepId('');
        setError(messageOf(caught, '블록을 옮길 스텝을 다시 골라주세요.'));
        setIsSubmitting(false);
        return;
      }

      /*
        ⛔ 진행 중 결재가 하위 블록의 문서를 보고 있으면 막힌다 (2026-08-16 D안).
        다시 눌러도 결과가 같으므로 **다음에 할 일**(회수 · 완료)을 적어 준다.
      */
      if (code === FILE_CODES.approvalInProgress) {
        setError(
          '진행 중인 결재가 이 스텝의 문서를 참조하고 있어 삭제할 수 없습니다. 결재를 회수하거나 완료한 뒤 다시 시도해주세요.',
        );
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

  const deletingBlockCount = (blocks?.length ?? 0) - movingIds.length;

  return (
    <PanelModal title="스텝 삭제" onClose={requestClose}>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
          <span className="min-w-0 truncate text-label font-semibold text-text-primary">
            {step.name}
          </span>
          <span className="shrink-0 rounded-button-sm border border-border-default bg-bg-card px-1.5 py-0.5 text-caption text-text-secondary">
            이슈 {step.totalIssueCount}개
          </span>
        </div>

        {isLoading ? (
          <LoadingSpinner label="블록 목록 불러오는 중" className="py-8" />
        ) : haveBlocksFailed ? (
          <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
            블록 목록을 불러오지 못했습니다. 이대로 삭제하면 하위 블록을 골라
            남길 수 없고 <strong>모두 함께 삭제</strong>됩니다.
          </p>
        ) : blocks.length === 0 ? (
          <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
            이 스텝에는 블록이 없습니다.
          </p>
        ) : (
          <div>
            <div className="flex items-end justify-between gap-2 pb-1.5">
              <span className="text-detail font-semibold text-text-primary">
                남길 블록 선택
              </span>
              <span className="text-caption text-text-secondary">
                {movingIds.length} / {blocks.length} 이동
              </span>
            </div>
            <ul className="divide-y divide-border-default overflow-hidden rounded-lg border border-border-default">
              {blocks.map((block) => {
                const isMoving = movingIds.includes(block.blockId);

                return (
                  <li key={block.blockId}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-bg-hover">
                      <input
                        type="checkbox"
                        checked={isMoving}
                        disabled={isSubmitting}
                        onChange={() => toggleBlock(block.blockId)}
                        className="size-3.5 shrink-0 cursor-pointer accent-btn-primary"
                      />
                      <span className="min-w-0 flex-1 truncate text-detail text-text-primary">
                        {block.title || '제목 없음'}
                      </span>
                      <span
                        className={`shrink-0 text-caption ${
                          isMoving
                            ? 'text-text-primary-blue'
                            : 'text-text-muted'
                        }`}
                      >
                        {isMoving ? '이동' : '삭제'}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-caption break-keep text-text-secondary">
              고르지 않은 블록 {deletingBlockCount}개는 스텝과 함께 삭제됩니다.
            </p>
          </div>
        )}

        {/*
          블록이 지워지면 그 문서도 함께 휴지통으로 간다 — 목록을 못 받은 경우에도
          삭제는 진행되므로 **분기 바깥**에 둔다. 옮기기로 고른 블록의 문서는 남는다.
        */}
        <p className="text-caption break-keep text-text-secondary">
          삭제되는 블록에 올린 문서는 프로젝트 휴지통으로 이동합니다.
        </p>

        {hasMoveTarget && (
          <div>
            <label
              htmlFor="blockMoveTarget"
              className="block pb-1.5 text-detail font-semibold text-text-primary"
            >
              블록을 옮길 스텝 <span className="text-text-danger">*</span>
            </label>
            <select
              id="blockMoveTarget"
              value={moveToStepId}
              onChange={(event) => {
                setMoveToStepId(event.target.value);
                setError('');
              }}
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-detail text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                옮길 스텝을 선택해주세요
              </option>
              {/*
                편집 권한이 없는 스텝은 서버가 `STEP_EDIT_DENIED` 로 거절한다 —
                삭제를 누른 뒤에 알게 되지 않도록 **고르기 전에** 막는다.
                목록에서 아예 지우지는 않는다: "왜 저 스텝이 안 보이지" 가 된다.
              */}
              {targets.map((target) => {
                const canEdit = target.myPermission === 'EDITOR';
                return (
                  <option
                    key={target.stepId}
                    value={target.stepId}
                    disabled={!canEdit}
                  >
                    {target.name}
                    {canEdit ? '' : ' (편집 권한 없음)'}
                  </option>
                );
              })}
            </select>
            {hasEditableTarget ? (
              <p className="mt-1 text-caption break-keep text-yellow-text">
                옮긴 블록의 <strong>이슈 연결은 끊깁니다.</strong> 블록과 이슈는
                같은 스텝에 있어야 합니다.
              </p>
            ) : (
              <p className="mt-1 text-caption break-keep text-text-danger">
                편집 권한이 있는 스텝이 없어 블록을 옮길 수 없습니다. 체크를
                해제하면 블록과 함께 삭제됩니다.
              </p>
            )}
          </div>
        )}

        <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-text-danger">
          이 스텝의 이슈 {step.totalIssueCount}개는{' '}
          <strong>선택 없이 함께 삭제</strong>됩니다. 되돌릴 수 없습니다.
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
            className="btn btn-md btn-gray-outlined"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className="btn btn-md btn-danger"
          >
            {isSubmitting ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </ModalFooter>
    </PanelModal>
  );
}
