'use client';

import { useEffect, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import PanelModal, { ModalFooter } from '@/components/PanelModal';
import LoadingSpinner from '@/components/Spinner';
import { getProjectSteps } from '@/features/project/api';
import type { ProjectStep } from '@/features/project/types';
import { ApiError, messageOf } from '@/lib/api';

import { moveBlockToStep } from './api';
import { BLOCK_CODES } from './errorCodes';
import { notifyBlockChanged } from './events';
import type { MoveBlockResponse, StepBlock } from './types';

interface BlockMoveStepModalProps {
  projectId: string;
  /** 지금 이 블록이 있는 스텝 — 후보에서 뺀다 */
  currentStepId: string;
  block: StepBlock;
  blockTitle: string;
  onClose: () => void;
  onMoved: (result: MoveBlockResponse) => void;
}

// 블록을 다른 스텝으로 옮기는 모달. (.ai/API.md 121)
// 배치 편집(드래그)은 같은 스텝 안에서만 자리를 바꾼다 — 스텝을 넘는 이동은
// 드롭 대상이 화면에 없어서 끌어서 할 수 없다. 그래서 ⋯ 메뉴에서 목적지를 고른다.
// 옮기면 이슈 연결이 끊긴다 (BLK-014·INV-06) — 블록과 이슈는 같은 스텝이어야 한다.
// 출발·도착 양쪽 스텝의 EDITOR 여야 한다 — 편집 권한이 없는 스텝은 고를 수 없게 막는다.
// 낙관적 락 — 409 면 덮어쓸지 다시 불러올지 묻는다.
export default function BlockMoveStepModal({
  projectId,
  currentStepId,
  block,
  blockTitle,
  onClose,
  onMoved,
}: BlockMoveStepModalProps) {
  /** null = 아직 조회 중 */
  const [steps, setSteps] = useState<ProjectStep[] | null>(null);
  const [haveStepsFailed, setHaveStepsFailed] = useState(false);
  const [targetStepId, setTargetStepId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConflicting, setIsConflicting] = useState(false);

  /** 이동에 필요한 version 이 조회 응답에 없는 경우 (types.ts 참고) */
  const hasNoVersion = block.version === undefined;

  useEffect(() => {
    const controller = new AbortController();

    getProjectSteps(projectId, controller.signal)
      .then(setSteps)
      .catch(() => {
        if (!controller.signal.aborted) {
          setHaveStepsFailed(true);
          setSteps([]);
        }
      });

    return () => controller.abort();
  }, [projectId]);

  // 자기 자신은 목적지가 될 수 없다. 나머지는 권한이 없어도 보여주되 못 고르게 한다 —
  // 목록에서 아예 지우면 "왜 저 스텝이 안 보이지" 로 읽힌다
  const candidates =
    steps?.filter((step) => String(step.stepId) !== currentStepId) ?? [];

  // 실제로 고를 수 있는 후보가 하나라도 있는지.
  // 후보는 있는데 전부 권한이 없으면 <option> 이 모두 disabled 라
  // 아무것도 못 고르는데 이유도 안 보인다. 그 경우를 따로 알린다.
  const hasSelectableCandidate = candidates.some(
    (step) => step.myPermission === 'EDITOR',
  );

  const isLoading = steps === null;
  const canSubmit =
    !isLoading && !isSubmitting && !hasNoVersion && targetStepId !== '';

  async function move(overwrite: boolean) {
    if (block.version === undefined) {
      setError('버전 정보가 없어 옮길 수 없습니다. 새로고침해주세요.');
      return;
    }

    setError('');
    setIsConflicting(false);
    setIsSubmitting(true);

    try {
      const result = await moveBlockToStep(block.blockId, {
        stepId: Number(targetStepId),
        version: block.version,
        ...(overwrite ? { overwrite: true } : {}),
      });
      onMoved(result);
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 남이 먼저 고쳤다 — 덮어쓸지 다시 불러올지 묻는다
      if (caught instanceof ApiError && caught.status === 409) {
        setIsConflicting(true);
        setIsSubmitting(false);
        return;
      }
      if (code === BLOCK_CODES.stepEditDenied) {
        setTargetStepId('');
        setError('옮길 스텝의 편집 권한이 없습니다. 다른 스텝을 골라주세요.');
        setIsSubmitting(false);
        return;
      }

      setError(messageOf(caught, '블록을 옮기지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  /** 옮기는 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  return (
    <>
      <PanelModal title="다른 스텝으로 이동" onClose={requestClose}>
        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
            <span className="block text-caption text-text-secondary">
              옮길 블록
            </span>
            <span className="mt-0.5 block truncate text-label font-semibold text-text-primary">
              {blockTitle}
            </span>
          </div>

          {isLoading ? (
            <LoadingSpinner label="스텝 목록 불러오는 중" className="py-8" />
          ) : haveStepsFailed ? (
            <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-detail break-keep text-text-danger">
              스텝 목록을 불러오지 못했습니다. 닫고 다시 시도해주세요.
            </p>
          ) : candidates.length === 0 ? (
            <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
              옮길 수 있는 다른 스텝이 없습니다.
            </p>
          ) : !hasSelectableCandidate ? (
            <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
              편집 권한이 있는 스텝이 없어 옮길 수 없습니다. 스텝 편집 권한을
              요청해주세요.
            </p>
          ) : (
            <div>
              <label
                htmlFor="blockMoveStep"
                className="block pb-1.5 text-detail font-semibold text-text-primary"
              >
                옮길 스텝 <span className="text-text-danger">*</span>
              </label>
              <select
                id="blockMoveStep"
                value={targetStepId}
                onChange={(event) => {
                  setTargetStepId(event.target.value);
                  setError('');
                }}
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-detail text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  옮길 스텝을 선택해주세요
                </option>
                {candidates.map((step) => {
                  const canEdit = step.myPermission === 'EDITOR';
                  return (
                    <option
                      key={step.stepId}
                      value={step.stepId}
                      disabled={!canEdit}
                    >
                      {step.name}
                      {canEdit ? '' : ' (편집 권한 없음)'}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/*
            연결된 이슈가 있을 때만 강조한다 — 없는데 빨간 경고를 띄우면
            다음에 진짜 위험할 때 읽지 않는다.
          */}
          {block.linkedIssueTotal > 0 ? (
            <p className="rounded-lg bg-red-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-text-danger">
              이 블록에 연결된 이슈 {block.linkedIssueTotal}건의{' '}
              <strong>연결이 끊깁니다.</strong> 블록과 이슈는 같은 스텝에 있어야
              합니다. 이슈 자체는 지워지지 않습니다.
            </p>
          ) : (
            <p className="text-caption break-keep text-text-secondary">
              블록의 내용 · 담당자는 그대로 따라갑니다. 옮긴 뒤에는 대상 스텝의
              맨 뒤에 놓입니다.
            </p>
          )}

          {hasNoVersion && (
            <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
              이 블록의 버전 정보를 받지 못해 옮길 수 없습니다. 새로고침 후 다시
              시도해주세요.
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
              className="btn btn-md btn-gray-outlined"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void move(false)}
              disabled={!canSubmit}
              className="btn btn-md btn-primary min-w-[104px]"
            >
              {isSubmitting ? '옮기는 중…' : '이동'}
            </button>
          </div>
        </ModalFooter>
      </PanelModal>

      {isConflicting && (
        // 취소(= Esc·배경 클릭)를 다시 불러오기에 둔다 — 잘못 눌러도 남의 값이 지워지지 않는다
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="다른 사람이 먼저 저장했습니다"
          description="그 사이 이 블록이 수정됐습니다. 그대로 옮기거나, 최신 내용을 다시 불러올 수 있습니다."
          confirmLabel="그대로 옮기기"
          cancelLabel="다시 불러오기"
          isDanger
          onConfirm={() => void move(true)}
          onCancel={() => {
            // 재조회는 보드가 한다 — 여기서는 닫기만 하고 목록 갱신 신호를 남긴다
            notifyBlockChanged();
            onClose();
          }}
        />
      )}
    </>
  );
}
