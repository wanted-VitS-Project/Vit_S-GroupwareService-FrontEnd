'use client';

import { useState } from 'react';

import PersonNote from '@/components/PersonNote';
import { notifyToast } from '@/components/Toast';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { ApiError, messageOf } from '@/lib/api';
import { useModal, useModalTarget } from '@/lib/useModal';

import { updateProjectMemberPermission } from '../api';
import { MEMBER_CODES } from '../errorCodes';
import { MEMBER_PERMISSION_LABELS, MEMBER_PERMISSIONS } from '../labels';
import { canManageMembers } from '../permissions';
import type { ProjectMember, ProjectPermission } from '../types';
import AddMemberModal from './AddMemberModal';
import RemoveMemberModal from './RemoveMemberModal';

interface MemberListProps {
  projectId: string;
  /** 아직 도착하지 않았으면 null */
  members: ProjectMember[] | null;
  hasFailed: boolean;
  canEdit: boolean;
  onChanged: () => void;
  /** 추가 버튼을 목록 위에 그릴지. 바깥(섹션 헤더)에 이미 있으면 끈다 */
  showAddButton?: boolean;
}

// 참여자 목록·권한 변경·제거·추가. (.ai/API.md 45·125~127)
// 설정 화면과 사이드바가 같은 것을 쓴다 — 진입점이 둘이라 복제하면 한쪽만 고쳐진다.
// 바깥 껍데기(설정 섹션 / 모달)만 다르고 안쪽 조작은 여기 한 벌뿐이다.
// 자기 자신의 행은 권한 변경·제거를 막는다 (PRJ-011·INV-10) —
// 백엔드가 403 으로 막지만, 눌러 보고 실패를 보는 것보다 아예 잠가 두는 편이 낫다.
// (혼자 남은 EDITOR 가 스스로 권한을 낮춰 프로젝트가 잠기는 것도 이걸로 막힌다)
// 차단은 NONE 이 아니라 제거로 표현한다 — NONE 은 폐기됐다 (2026-08-06).
// 🗑️ 삭제된 사원(deleted)은 배지를 달되 행을 지우지 않는다 — 정리하라는 표시다.
// 권한 변경은 404 로 막히므로 셀렉트를 잠그고 제거만 남긴다.
export default function MemberList({
  projectId,
  members,
  hasFailed,
  canEdit,
  onChanged,
  showAddButton = false,
}: MemberListProps) {
  /** 내 사번은 프로바이더에서 직접 읽는다 — 껍데기마다 prop 으로 나르지 않는다 */
  const me = useCurrentUser();
  const addModal = useModal();
  const removeModal = useModalTarget<ProjectMember>();
  const [error, setError] = useState('');
  /** 권한을 바꾸는 중인 행 — 그 줄만 막는다 */
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null);

  // 참여자 추가 — 편집 권한이면 보인다 (VIEWER 에게만 감춘다).
  // 전사 ADMIN 은 프로젝트 권한과 무관하게 예외다 (permissions.ts).
  const canAdd = canManageMembers({ role: me.role, canEdit });

  async function changePermission(
    member: ProjectMember,
    permission: ProjectPermission,
  ) {
    if (savingMemberId !== null || permission === member.permission) return;

    setError('');
    setSavingMemberId(member.memberId);

    try {
      await updateProjectMemberPermission(
        projectId,
        member.memberId,
        permission,
      );
      onChanged();
      notifyToast(
        `${member.name} 님의 권한을 '${MEMBER_PERMISSION_LABELS[permission]}' 로 바꿨습니다.`,
      );
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (code === MEMBER_CODES.notFound) {
        // 남이 먼저 뺐다 — 목록만 맞춘다
        setError('이미 제거된 참여자입니다. 목록을 다시 불러왔습니다.');
        onChanged();
      } else {
        setError(messageOf(caught, '권한을 바꾸지 못했습니다.'));
      }
    } finally {
      setSavingMemberId(null);
    }
  }

  return (
    <>
      {showAddButton && canAdd && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={addModal.open}
            className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
          >
            + 참여자 추가
          </button>
        </div>
      )}

      {hasFailed ? (
        <div className="rounded-lg bg-red-bg-soft px-3 py-2.5">
          <p className="text-detail break-keep text-text-danger">
            참여자를 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={onChanged}
            className="mt-2 cursor-pointer text-caption font-medium text-text-primary-blue hover:underline"
          >
            다시 시도
          </button>
        </div>
      ) : members === null ? (
        <p className="text-detail text-text-secondary">불러오는 중…</p>
      ) : members.length === 0 ? (
        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
          참여자가 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border-default">
          {members.map((member) => {
            const isMe = member.userId === me.userId;
            /** 지금 이 행을 저장 중인지 — 스크린리더에 진행 상태를 알린다 */
            const isSavingThisRow = savingMemberId === member.memberId;
            // 삭제된 사원은 쓰기 검증을 통과하지 못한다 — 권한 변경만 잠그고 제거는 남긴다
            const canChangePermission = canEdit && !isMe && !member.deleted;

            return (
              <li
                key={member.memberId}
                aria-busy={isSavingThisRow || undefined}
                className="flex items-center gap-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-0.5 text-detail font-medium text-text-primary">
                    <span className="truncate">{member.name}</span>
                    {member.resigned && <PersonNote />}
                    {member.deleted && (
                      <span className="badge badge-gray ml-1 shrink-0">
                        삭제된 사원
                      </span>
                    )}
                    {isMe && (
                      <span className="ml-1 shrink-0 text-caption text-text-secondary">
                        (나)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-caption text-text-secondary">
                    {member.userId}
                    {member.department ? ` · ${member.department}` : ''}
                  </p>
                </div>

                {canChangePermission ? (
                  <>
                    <label
                      htmlFor={`permission-${member.memberId}`}
                      className="sr-only"
                    >
                      {member.name} 권한
                    </label>
                    <select
                      id={`permission-${member.memberId}`}
                      value={member.permission}
                      /*
                       * 저장 중에는 모든 행을 잠근다 — changePermission 이
                       * savingMemberId !== null 이면 그냥 돌아서기 때문에, 저장 중인 행만
                       * 잠그면 다른 행을 바꿔도 값만 되돌아가고 아무 안내가 없다.
                       * (StepPermissionModal 과 같은 규칙)
                       */
                      disabled={savingMemberId !== null}
                      onChange={(event) =>
                        void changePermission(
                          member,
                          event.target.value as ProjectPermission,
                        )
                      }
                      className="shrink-0 cursor-pointer rounded-lg border border-border-default bg-bg-card px-2 py-1 text-detail text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:cursor-not-allowed disabled:text-text-muted"
                    >
                      {MEMBER_PERMISSIONS.map((permission) => (
                        <option key={permission} value={permission}>
                          {MEMBER_PERMISSION_LABELS[permission]}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <span
                    title={
                      isMe
                        ? '자기 자신의 권한은 바꿀 수 없습니다'
                        : member.deleted
                          ? '삭제된 사원이라 권한을 바꿀 수 없습니다'
                          : undefined
                    }
                    className="shrink-0 rounded-button-sm bg-bg-surface px-2 py-1 text-detail whitespace-nowrap text-text-secondary"
                  >
                    {MEMBER_PERMISSION_LABELS[member.permission]}
                  </span>
                )}

                {canEdit && (
                  <button
                    type="button"
                    disabled={isMe || savingMemberId !== null}
                    title={isMe ? '자기 자신은 제거할 수 없습니다' : undefined}
                    onClick={() => removeModal.open(member)}
                    className="shrink-0 cursor-pointer rounded-button-sm px-2 py-1 text-caption font-medium whitespace-nowrap text-text-danger hover:bg-red-bg-soft disabled:cursor-not-allowed disabled:text-text-muted"
                  >
                    제거
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
      <p
        role="alert"
        className="mt-3 text-caption break-keep text-text-danger empty:hidden"
      >
        {error}
      </p>

      {addModal.isOpen && (
        <AddMemberModal
          projectId={projectId}
          members={members ?? []}
          onClose={addModal.close}
          onAdded={onChanged}
        />
      )}

      {removeModal.target && (
        <RemoveMemberModal
          projectId={projectId}
          member={removeModal.target}
          onClose={removeModal.close}
          onRemoved={onChanged}
        />
      )}
    </>
  );
}
