'use client';

import { useEffect, useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { notifyToast } from '@/components/Toast';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { messageOf } from '@/lib/api';

import { applyStepPermissions, getProjectMembers } from '../api';
import { STEP_PERMISSION_LABELS, STEP_PERMISSIONS } from '../labels';
import MemberPicker, { type PickablePerson } from '../member/MemberPicker';
import type { ProjectMember, StepPermission } from '../types';

interface StagePermissionModalProps {
  projectId: string;
  stageId: number;
  stageName: string;
  onClose: () => void;
  /** 기존 스텝에 적용했으면 스텝 권한이 바뀌었을 수 있어 목록을 다시 읽는다 */
  onApplied: () => void;
}

/**
 * 스테이지의 **새 스텝 권한 기본값** 설정. (.ai/API.md 128)
 *
 * ⚠️ **판정에 쓰이는 값이 아니다.** `stage_permission` 테이블은 없고, 여기서 정한 값은
 *    스텝이 **새로 생길 때** `step_permission` 행으로 복사될 뿐이다 (STG-004 · INV-01).
 *    그래서 이미 만들어진 스텝에는 소급되지 않는다 — 지금 반영하려면 아래 체크박스를 켠다.
 * ⚠️ **현재 기본값을 조회하는 API 가 없다** — 이 모달은 "무엇으로 두겠다" 를 정할 뿐,
 *    지금 무엇으로 돼 있는지 보여주지 못한다. 문구로 분명히 알린다.
 * ⛔ 자기 자신의 권한 행은 바꿀 수 없다 (INV-10).
 */
export default function StagePermissionModal({
  projectId,
  stageId,
  stageName,
  onClose,
  onApplied,
}: StagePermissionModalProps) {
  const me = useCurrentUser();

  const [members, setMembers] = useState<ProjectMember[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  /** 대상은 한 명이다 — `MemberPicker` 는 배열을 받으므로 0~1개만 담는다 */
  const [selected, setSelected] = useState<PickablePerson | null>(null);
  const [permission, setPermission] = useState<StepPermission>('VIEWER');
  /**
   * ⚠️ **기본값은 끔.** 켠 채로 두면 "새 스텝 기본값만 정하려던" 저장이
   * 이 스테이지의 **기존 스텝 권한을 전부 덮어쓴다** — 되돌리는 화면이 없다.
   * 안내문("이미 있는 스텝은 아래를 켜야 함께 바뀝니다")과도 이 상태가 맞다.
   */
  const [applyToExistingSteps, setApplyToExistingSteps] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectMembers(projectId, signal)
      .then(setMembers)
      .catch(() => {
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, [projectId]);

  async function submit() {
    if (isSubmitting) return;

    if (!selected) {
      setError('대상 참여자를 골라주세요.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await applyStepPermissions(stageId, {
        userId: selected.userId,
        permission,
        // 생략하면 백엔드 기본값이 `true` 지만, 화면의 뜻을 분명히 하려고 항상 싣는다
        applyToExistingSteps,
      });

      if (result.appliedStepCount > 0) onApplied();
      onClose();
      // 모달을 닫은 뒤에 띄운다 — <dialog> 가 최상위 레이어라 토스트를 가린다
      notifyToast(
        result.appliedStepCount > 0
          ? `기본값을 저장하고 기존 스텝 ${result.appliedStepCount}개에 적용했습니다.`
          : '스테이지 권한(새 스텝 기본값)을 저장했습니다.',
      );
    } catch (caught) {
      setError(messageOf(caught, '기본값을 저장하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  /** 처리 중에는 닫지 않는다 — 요청은 계속 날아간다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  // 자기 자신은 대상이 될 수 없다 (INV-10) — 후보에서 미리 뺀다
  const candidates = members?.filter((member) => member.userId !== me.userId);

  return (
    <PanelModal title="스테이지 권한" onClose={requestClose}>
      <div className="max-h-[55vh] overflow-y-auto p-5">
        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-primary">
          {stageName}
        </p>

        <p className="mt-3 rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-caption leading-relaxed break-keep text-yellow-text">
          여기서 정한 값은{' '}
          <strong>이 스테이지에 새 스텝이 생성될 때 기본값</strong>으로
          적용됩니다. 이미 있는 스텝은 아래를 켜야 함께 바뀝니다. 현재 기본값을
          조회하는 기능은 아직 없어, 지금 무엇으로 돼 있는지는 표시되지
          않습니다.
        </p>

        <div className="mt-4">
          <MemberPicker
            label="대상 참여자"
            selected={selected ? [selected] : []}
            // 한 명만 고르는 화면 — 이미 고른 사람은 후보에서 빠진다
            candidates={(candidates ?? []).filter(
              (member) => member.userId !== selected?.userId,
            )}
            isBusy={isSubmitting}
            isLoading={!members && !hasFailed}
            hasFailed={hasFailed}
            placeholder="아래에서 참여자를 선택하세요"
            emptyHint="지정할 수 있는 참여자가 없습니다. (자기 자신의 권한은 바꿀 수 없습니다)"
            hint="퇴사한 참여자에게도 지정할 수 있습니다."
            onSelect={(person) => {
              setError('');
              setSelected(person);
            }}
            onRelease={() => setSelected(null)}
          />
        </div>

        <fieldset className="mt-4">
          <legend className="mb-1.5 text-detail font-semibold text-text-primary">
            권한 등급
          </legend>
          <div className="flex gap-2">
            {STEP_PERMISSIONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={permission === value}
                disabled={isSubmitting}
                onClick={() => setPermission(value)}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-detail font-medium whitespace-nowrap disabled:cursor-not-allowed ${
                  permission === value
                    ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
                    : 'border-border-default text-text-primary hover:bg-bg-hover'
                }`}
              >
                {STEP_PERMISSION_LABELS[value]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-caption break-keep text-text-secondary">
            <strong>차단</strong>은 이 스테이지의 스텝을 아예 보지 못하게
            합니다.
          </p>
        </fieldset>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={applyToExistingSteps}
            disabled={isSubmitting}
            onChange={(event) => setApplyToExistingSteps(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer"
          />
          <span className="text-detail break-keep text-text-primary">
            이미 있는 하위 스텝에도 지금 적용
            <span className="mt-0.5 block text-caption text-text-secondary">
              끄면 기본값만 저장되고, 지금 있는 스텝의 권한은 그대로 둡니다.
            </span>
          </span>
        </label>

        <p
          role="alert"
          className="mt-2 text-caption break-keep text-text-danger empty:hidden"
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
          disabled={isSubmitting || !selected}
          className="btn btn-md btn-primary min-w-[104px]"
        >
          {isSubmitting ? '저장 중…' : '저장'}
        </button>
      </ModalFooter>
    </PanelModal>
  );
}
