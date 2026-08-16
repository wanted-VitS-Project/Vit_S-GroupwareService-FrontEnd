'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { notifyToast } from '@/components/Toast';
import EmployeeSearchInput from '@/features/employee/EmployeeSearchInput';
import { ApiError, messageOf } from '@/lib/api';

import { addProjectMember } from '../api';
import { MEMBER_CODES } from '../errorCodes';
import { MEMBER_PERMISSION_LABELS, MEMBER_PERMISSIONS } from '../labels';
import type { ProjectMember, ProjectPermission } from '../types';
import MemberPicker, { type PickablePerson } from './MemberPicker';

interface AddMemberModalProps {
  projectId: string;
  /** 이미 참여 중인 사람 — 후보에서 뺀다 */
  members: ProjectMember[];
  onClose: () => void;
  onAdded: () => void;
}

/**
 * 참여자 추가 모달. (.ai/API.md 125)
 *
 * ⛔ **한 명씩 부른다** — 팀 · 부서 일괄 추가 파라미터가 없다 (PRJ-009 · INV-07).
 *    여러 명을 고를 수 있게 두되 **호출은 한 명씩** 하고, 중간에 실패하면 어디까지 됐는지 알린다.
 *
 * 검색은 인사 쪽에서 쓰는 **`EmployeeSearchInput`**(명세 35번) 을 그대로 쓴다 —
 * 디바운스 · 취소 · 키보드 조작 · `이미 추가됨` 표시가 이미 들어 있고,
 * 인사관리 목록(`GET /employees`)과 달리 **ADMIN 이 아니어도** 호출할 수 있다.
 * 🗑️ 퇴사자 · 시스템 계정 · 삭제된 사원은 그 API 가 이미 후보에서 뺀다.
 *
 * 고른 사람은 블록 · 이슈와 **같은 칩**(`MemberPicker`)으로 보여준다.
 */
export default function AddMemberModal({
  projectId,
  members,
  onClose,
  onAdded,
}: AddMemberModalProps) {
  const [selected, setSelected] = useState<PickablePerson[]>([]);
  const [permission, setPermission] = useState<ProjectPermission>('VIEWER');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 검색 목록에서 고를 수 없게 막을 사번 —
   * **이미 참여 중** + **이번에 고른 사람**. 목록에서 숨기지 않고 `이미 추가됨` 으로 남는다.
   */
  const excludedIds = [
    ...members.map((member) => member.userId),
    ...selected.map((person) => person.userId),
  ];

  async function submit() {
    if (isSubmitting) return;

    if (selected.length === 0) {
      setError('추가할 사원을 골라주세요.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    /** 일괄 API 가 없어 한 명씩 부른다 — 어디까지 됐는지 세어 둔다 */
    let addedCount = 0;

    try {
      for (const person of selected) {
        await addProjectMember(projectId, {
          userId: person.userId,
          permission,
        });
        addedCount += 1;
      }

      onAdded();
      onClose();
      notifyToast(`참여자 ${addedCount}명을 추가했습니다.`);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;
      const reason =
        code === MEMBER_CODES.alreadyExists
          ? '이미 참여 중인 사원이 있습니다.'
          : code === MEMBER_CODES.userNotFound
            ? '삭제됐거나 존재하지 않는 사원이 있습니다.'
            : messageOf(caught, '참여자를 추가하지 못했습니다.');

      setError(
        addedCount > 0
          ? `${reason} 앞선 ${addedCount}명은 추가됐습니다. 남은 사람만 다시 시도해주세요.`
          : reason,
      );

      if (addedCount > 0) {
        /*
         * ⚠️ **성공한 만큼을 골라둔 목록에서 뺀다.**
         * 그대로 두면 `다시 추가` 가 이미 들어간 사람부터 호출해 곧바로
         * `MEMBER_ALREADY_EXISTS` 로 멈춘다 — 뒤에 남은 사람은 영영 추가되지 않는다.
         */
        setSelected((current) => current.slice(addedCount));
        // 앞부분이 들어갔으니 목록도 갱신해 둔다
        onAdded();
      }
      setIsSubmitting(false);
    }
  }

  /** 처리 중에는 닫지 않는다 — 남은 요청이 계속 날아간다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  return (
    <PanelModal title="참여자 추가" onClose={requestClose}>
      <div className="max-h-[55vh] space-y-4 overflow-y-auto p-5">
        <div>
          <span className="block pb-1.5 text-detail font-semibold text-text-primary">
            사원 검색
          </span>
          <EmployeeSearchInput
            excludedIds={excludedIds}
            placeholder="사원 이름 (예: 김)"
            disabled={isSubmitting}
            onSelect={(employee) => {
              setError('');
              setSelected((current) => [...current, employee]);
            }}
          />
        </div>

        <MemberPicker
          label="추가할 사원"
          selected={selected}
          candidates={[]}
          // 후보는 위 검색 목록에 뜬다 — 여기 또 그리면 같은 사람이 두 군데 나온다
          showCandidates={false}
          isBusy={isSubmitting}
          placeholder="위에서 검색해 추가하세요"
          onRelease={(userId) =>
            setSelected((current) =>
              current.filter((person) => person.userId !== userId),
            )
          }
        />

        <fieldset className="border-t border-border-default pt-4">
          <legend className="sr-only">부여할 권한</legend>
          <p className="mb-1.5 text-detail font-semibold text-text-primary">
            부여할 권한
          </p>
          <div className="flex gap-2">
            {MEMBER_PERMISSIONS.map((value) => (
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
                {MEMBER_PERMISSION_LABELS[value]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-caption break-keep text-text-secondary">
            고른 사원 모두에게 같은 권한이 적용됩니다. 추가한 뒤 목록에서 한
            명씩 바꿀 수 있습니다.
          </p>
        </fieldset>

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
          disabled={isSubmitting}
          className="cursor-pointer rounded-lg px-4 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting || selected.length === 0}
          className="min-w-[104px] cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
        >
          {isSubmitting ? '추가 중…' : `추가 (${selected.length})`}
        </button>
      </ModalFooter>
    </PanelModal>
  );
}
