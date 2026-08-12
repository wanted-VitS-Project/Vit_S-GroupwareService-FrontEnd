'use client';

import { useEffect, useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import EmployeeSearchInput from '@/features/employee/EmployeeSearchInput';
import { ApiError, isAbortError, messageOf } from '@/lib/api';

import { addGroupMembers, getGroupMembers, removeGroupMember } from './api';
import { GROUP_CODES, MEMBER_PICK_REJECTED_CODES } from './errorCodes';
import type { EmployeeGroup, GroupMember } from './types';

interface GroupMembersModalProps {
  group: EmployeeGroup;
  onClose: () => void;
  /** 인원수가 바뀌면 목록의 `memberCount` 도 틀린 값이 된다 */
  onChanged: () => void;
}

/** 목록 한 줄의 상태 — 서버에 있는 것 · 넣을 것 · 뺄 것 */
type RowState = 'saved' | 'adding' | 'removing';

const ROW_BADGE: Record<RowState, string> = {
  saved: '',
  adding: '추가 예정',
  removing: '제거 예정',
};

/**
 * 그룹 구성원 관리. (.ai/API.md 95~97)
 *
 * 검색해서 고르면 **목록에 바로 얹히고**, `확인` 을 눌러야 서버로 간다 —
 * 고른 사람이 목록 밖에 따로 쌓이면 최종 결과를 한눈에 볼 수 없다.
 * 추가 · 제거를 함께 미루는 이유도 같다: 한쪽만 즉시 반영되면 `취소` 가 거짓말이 된다.
 *
 * ⚠️ 구성원을 바꿔도 **그 사람의 페이지 권한은 달라지지 않는다** —
 *    권한은 부여 시점의 개인 단위 스냅샷이다. 그룹은 선택용 인덱스일 뿐이다.
 */
export default function GroupMembersModal({
  group,
  onClose,
  onChanged,
}: GroupMembersModalProps) {
  const [members, setMembers] = useState<GroupMember[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  /** 아직 안 보낸 변경 — `확인` 을 눌러야 서버로 간다 */
  const [added, setAdded] = useState<GroupMember[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getGroupMembers(group.groupId, signal)
      .then((data) => setMembers(data.content))
      .catch((caught) => {
        // 취소는 실패가 아니다
        if (!isAbortError(caught)) setHasFailed(true);
      });

    return () => controller.abort();
  }, [group.groupId, reloadCount]);

  /** 서버 목록을 다시 받는다 — 안 보낸 변경도 함께 버린다 (기준이 달라졌다) */
  function reload() {
    setHasFailed(false);
    setMembers(null);
    setAdded([]);
    setRemovedIds([]);
    setReloadCount((count) => count + 1);
  }

  async function handleConfirm() {
    if (!hasChanges || isSaving) return;

    setError('');
    setIsSaving(true);

    try {
      if (added.length > 0) {
        await addGroupMembers(
          group.groupId,
          added.map((member) => member.userId),
        );
      }
      // 다건 제거 API 가 없어 한 명씩 부른다
      for (const userId of removedIds) {
        await removeGroupMember(group.groupId, userId);
      }

      onChanged();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      setError(messageOf(caught, '변경을 저장하지 못했습니다.'));
      setIsSaving(false);

      /**
       * 고른 사원이 잘못돼 거부된 경우다 — **서버는 아무것도 바꾸지 않았다.**
       * 고른 목록을 비우면 처음부터 다시 골라야 하므로 그대로 두고 문제만 빼게 한다.
       */
      if (MEMBER_PICK_REJECTED_CODES.includes(code ?? '')) return;

      /** 그룹 자체가 사라졌다 — 여기서 할 수 있는 게 없어 목록만 갱신하고 닫는다 */
      if (code === GROUP_CODES.notFound) {
        onChanged();
        onClose();
        return;
      }

      /**
       * 제거는 한 명씩이라 **일부만 끝났을 수 있다.**
       * 이 화면도, 부모 목록의 `memberCount` 도 실제와 어긋나므로 둘 다 맞춘다.
       */
      onChanged();
      reload();
    }
  }

  const rows: { member: GroupMember; state: RowState }[] = [
    ...(members ?? []).map((member) => ({
      member,
      state: (removedIds.includes(member.userId)
        ? 'removing'
        : 'saved') as RowState,
    })),
    ...added.map((member) => ({ member, state: 'adding' as RowState })),
  ];

  /** 이미 목록에 있는 사람은 검색 결과에서 다시 고를 수 없게 한다 */
  const excludedIds = rows.map((row) => row.member.userId);

  const hasChanges = added.length > 0 || removedIds.length > 0;
  /** 확인을 누른 뒤의 인원수 — 무엇이 남는지 미리 보여준다 */
  const nextCount = rows.filter((row) => row.state !== 'removing').length;

  function toggleRow(row: { member: GroupMember; state: RowState }) {
    if (row.state === 'adding') {
      // 아직 안 보낸 추가는 그냥 목록에서 뺀다
      setAdded((list) =>
        list.filter((one) => one.userId !== row.member.userId),
      );
      return;
    }
    setRemovedIds((list) =>
      row.state === 'removing'
        ? list.filter((id) => id !== row.member.userId)
        : [...list, row.member.userId],
    );
  }

  return (
    <PanelModal title={`${group.name} 구성원`} onClose={onClose}>
      <div className="space-y-4 p-5">
        <section>
          {/* `EmployeeSearchInput` 이 id 를 받지 않아 label 로 묶을 수 없다 */}
          <h3 className="pb-1.5 text-[11px] font-semibold text-text-primary">
            사원 검색
          </h3>
          <EmployeeSearchInput
            placeholder="이름으로 검색 (예: 김)"
            disabled={isSaving || members === null}
            excludedIds={excludedIds}
            onSelect={(employee) =>
              setAdded((list) => [
                ...list,
                {
                  userId: employee.userId,
                  name: employee.name,
                  departmentPath: employee.department,
                  jobPositionName: employee.position,
                  addedAt: '',
                },
              ])
            }
          />
          <p className="mt-1 text-caption break-keep text-text-secondary">
            고른 사원은 아래 목록에 바로 표시됩니다. 확인을 눌러야 저장됩니다.
          </p>
        </section>

        {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
        <p
          role="alert"
          className="text-caption break-keep text-text-danger empty:hidden"
        >
          {error}
        </p>

        <section>
          <h3 className="pb-1.5 text-[11px] font-semibold text-text-primary">
            구성원 {members === null ? '' : `${nextCount}명`}
            {hasChanges && (
              <span className="ml-1.5 font-normal text-text-secondary">
                (변경 {added.length + removedIds.length}건)
              </span>
            )}
          </h3>

          <div className="max-h-64 overflow-auto rounded-lg border border-border-default">
            {hasFailed ? (
              <Centered>
                <p className="text-[11px] text-text-secondary">
                  구성원을 불러오지 못했습니다.
                </p>
                <button
                  type="button"
                  onClick={reload}
                  className="btn btn-sm btn-gray-outlined mt-2"
                >
                  다시 시도
                </button>
              </Centered>
            ) : members === null ? (
              <Centered>
                <p className="text-[11px] text-text-secondary">불러오는 중…</p>
              </Centered>
            ) : rows.length === 0 ? (
              <Centered>
                <p className="text-[11px] break-keep text-text-secondary">
                  아직 구성원이 없습니다. 위에서 사원을 검색해 추가해주세요.
                </p>
              </Centered>
            ) : (
              <ul className="divide-y divide-border-default">
                {rows.map((row) => (
                  <li
                    key={row.member.userId}
                    className={`flex items-center gap-2 px-3 py-2.5 ${
                      row.state === 'removing' ? 'opacity-50' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-text-primary">
                        {row.member.name}
                        <span className="ml-1.5 font-normal text-text-secondary">
                          {row.member.userId}
                        </span>
                        {ROW_BADGE[row.state] && (
                          <span className="ml-1.5 rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-caption font-normal text-text-secondary">
                            {ROW_BADGE[row.state]}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-caption text-text-secondary">
                        {[row.member.departmentPath, row.member.jobPositionName]
                          .filter(Boolean)
                          .join(' · ') || '소속 없음'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleRow(row)}
                      disabled={isSaving}
                      className="btn btn-sm btn-gray-outlined shrink-0"
                    >
                      {row.state === 'removing' ? '되돌리기' : '제거'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-caption leading-relaxed break-keep text-text-secondary">
          구성원을 바꿔도 이미 부여된 페이지 권한은 달라지지 않습니다.
          <br />
          그룹은 사람을 고를 때 쓰는 묶음입니다.
        </p>
      </div>

      <ModalFooter>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="btn btn-sm btn-gray-outlined"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasChanges || isSaving}
            className="btn btn-sm btn-primary"
          >
            {isSaving ? '저장 중…' : '확인'}
          </button>
        </div>
      </ModalFooter>
    </PanelModal>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {children}
    </div>
  );
}
