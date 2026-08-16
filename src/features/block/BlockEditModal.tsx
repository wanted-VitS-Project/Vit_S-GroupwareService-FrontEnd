'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import MemberAvatar from '@/components/MemberAvatar';
import Modal from '@/components/Modal';
import PersonNote from '@/components/PersonNote';
import { ApiError, messageOf } from '@/lib/api';

import { updateBlock } from './api';
import { useBlockMembers, useBlockMembersSource } from './BlockMembersContext';
import BlockTypeIcon from './BlockTypeIcon';
import { notifyBlockChanged } from './events';
import {
  BLOCK_TITLE_MAX_LENGTH,
  type StepBlock,
  type UpdateBlockResponse,
} from './types';

export default function BlockEditModal({
  block,
  onClose,
  onUpdated,
}: {
  block: StepBlock;
  onClose: () => void;
  /** 응답을 그대로 넘긴다 — 받는 쪽이 재조회 없이 화면에 꽂을 수 있게 */
  onUpdated: (updated: UpdateBlockResponse) => void;
}) {
  const { id: projectId } = useParams<{ id: string }>();
  const [title, setTitle] = useState(block.title ?? '');
  const [owner, setOwner] = useState(block.owner?.userId ?? '');
  /**
   * 참여자 목록은 **보드가 이미 받아 둔 것**을 쓴다 (`BlockMembersContext`).
   * 보드 밖에서 열렸을 때만(컨텍스트 없음) 직접 조회한다 — 같은 목록을 두 번 받지 않는다.
   */
  const sharedMembers = useBlockMembers();
  const ownMembers = useBlockMembersSource(sharedMembers ? null : projectId);
  const {
    members,
    isLoading: isMembersLoading,
    failed: membersFailed,
  } = sharedMembers ?? ownMembers;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmation, setConfirmation] = useState<
    'save' | 'leave' | 'conflict' | null
  >(null);

  const isDirty =
    title.trim() !== (block.title ?? '') ||
    owner !== (block.owner?.userId ?? '');

  /** 수정에 필요한 `version` 이 조회 응답에 없는 경우 (`types.ts` 참고) */
  const hasNoVersion = block.version === undefined;

  function requestClose() {
    if (isSubmitting) return;
    if (isDirty) setConfirmation('leave');
    else onClose();
  }

  function requestSave() {
    if (isSubmitting) return;
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirmation('save');
  }

  async function submit(overwrite = false) {
    if (isSubmitting) return;
    const nextTitle = title.trim();
    const titleChanged = nextTitle !== (block.title ?? '');
    const ownerChanged = owner !== (block.owner?.userId ?? '');
    // 둘 다 안 바뀌면 보내지 않는다 — 서버도 400(`BLOCK_UPDATE_FIELD_REQUIRED`)이다
    if (!titleChanged && !ownerChanged) return;

    if (block.version === undefined) {
      setErrorMessage('버전 정보가 없어 저장할 수 없습니다. 새로고침해주세요.');
      setConfirmation(null);
      return;
    }

    setConfirmation(null);
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const updated = await updateBlock(block.blockId, {
        // 키를 생략하면 유지, `null` 이면 해제 — 이 API 는 진짜 부분 수정이다
        ...(titleChanged ? { title: nextTitle || null } : {}),
        ...(ownerChanged ? { owner: owner || null } : {}),
        version: block.version,
        ...(overwrite ? { overwrite: true } : {}),
      });
      onUpdated(updated);
      onClose();
    } catch (caught) {
      // 남이 먼저 저장했다 — 조용히 삼키지 않고 덮어쓸지 다시 불러올지 묻는다
      if (caught instanceof ApiError && caught.status === 409) {
        setConfirmation('conflict');
        setIsSubmitting(false);
        return;
      }

      setErrorMessage(messageOf(caught, '블록을 수정하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  /**
   * 담당자는 한 명이라 고른 사람은 칩으로, 나머지는 후보 버튼으로 나눈다.
   *
   * ⚠️ 지금 담당자가 **참여자 목록에 없을 수 있다** — 사원이 삭제됐거나(D-6) 권한이 회수된 경우다.
   *    그대로 두면 칩이 사라져 `담당자 없음` 으로 오해하니, 블록 응답의 이름으로 대신 그린다.
   *    (담당자를 **바꿀 때만** 후보에서 빠질 뿐, 지금 값은 지우지 않는다)
   */
  const selectedMember = members.find((member) => member.userId === owner);
  const selected =
    selectedMember ??
    (owner && block.owner?.userId === owner
      ? { userId: owner, name: block.owner.name }
      : null);
  /**
   * 담당자 후보.
   *
   * **퇴사자는 새로 지정할 수 없다** — 이미 지정된 사람은 위 칩으로 그대로 남기고
   * 여기서만 뺀다 (이슈 담당자 지정과 같은 규칙 · `IssueFormModal`).
   * 삭제된 사원은 참여자 목록 자체에 없어 따로 거를 것이 없다.
   */
  const candidates = members.filter(
    (member) => member.userId !== owner && !member.resigned,
  );
  /**
   * 칩에 `(퇴사자)` 를 붙일지.
   * 근거가 둘이다 — 블록 응답의 `owner.deleted`(사원 데이터 삭제) · 참여자 목록의 `resigned`(퇴사).
   * 사용자에게는 "재직 중이 아니다" 하나로 읽히면 되므로 둘을 합쳐 같은 문구를 쓴다.
   */
  const isSelectedResigned =
    (block.owner?.userId === owner && block.owner.deleted) ||
    selectedMember?.resigned === true;

  /**
   * 담당자를 고르거나 해제하면 방금 누른 버튼이 사라진다.
   * 그대로 두면 초점이 문서로 떨어져 키보드 사용자가 모달을 처음부터 훑어야 한다.
   */
  const focusAfterRender = useRef<'chip' | 'candidate' | null>(null);
  const releaseButtonRef = useRef<HTMLButtonElement>(null);
  const candidateButtons = useRef(new Map<string, HTMLButtonElement>());
  const candidateBoxRef = useRef<HTMLDivElement>(null);
  /** 해제 후 초점을 돌려줄 후보 — 방금 해제한 사람 */
  const releasedUserId = useRef<string | null>(null);

  useEffect(() => {
    const target = focusAfterRender.current;
    if (!target) return;
    focusAfterRender.current = null;

    if (target === 'chip') {
      releaseButtonRef.current?.focus();
      return;
    }

    const back = releasedUserId.current
      ? candidateButtons.current.get(releasedUserId.current)
      : undefined;
    releasedUserId.current = null;

    if (back) back.focus();
    else candidateBoxRef.current?.focus();
  });

  return (
    <>
      <Modal
        title="블록 수정"
        onClose={isSubmitting ? undefined : requestClose}
        className="w-full max-w-[480px] overflow-hidden rounded-base border border-border-default shadow-2xl"
        header={
          <div className="flex items-center gap-2.5 border-b border-border-default px-5 py-3.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-button-sm border border-border-primary/20 bg-blue-bg-soft text-text-primary-blue">
              <BlockTypeIcon code={block.type} />
            </span>
            <h2 className="shrink-0 text-body-m font-semibold text-text-primary">
              블록 수정
            </h2>
            <span className="max-w-[50%] truncate rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-caption text-text-secondary">
              {block.title || '제목 없음'}
            </span>
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              aria-label="닫기"
              className="ml-auto flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CloseIcon />
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 p-5">
          <label className="block">
            <span className="block pb-1.5 text-detail font-semibold text-text-primary">
              블록 제목
            </span>
            <input
              value={title}
              maxLength={BLOCK_TITLE_MAX_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="블록 제목을 입력하세요"
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-detail font-normal text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
            />
          </label>
          {/* 담당자 지정 — 이슈 담당자 지정과 같은 모양(칩 + 후보 버튼)을 쓴다 */}
          <div>
            <span className="block pb-1.5 text-detail font-semibold text-text-primary">
              담당자
            </span>
            <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border border-border-default bg-bg-surface p-2.5">
              {selected ? (
                <span className="flex items-center gap-1 rounded-pill border border-border-default bg-bg-card px-2 py-0.5">
                  <MemberAvatar
                    userId={selected.userId}
                    name={selected.name}
                    size="xs"
                    decorative
                    resigned={isSelectedResigned}
                  />
                  <span className="flex items-center gap-0.5">
                    <span className="text-caption font-medium text-text-primary">
                      {selected.name}
                    </span>
                    {isSelectedResigned && <PersonNote />}
                  </span>
                  <button
                    type="button"
                    ref={releaseButtonRef}
                    aria-label={`${selected.name} 해제`}
                    disabled={isSubmitting}
                    onClick={() => {
                      // 해제하면 이 버튼이 사라진다 — 다시 나타날 후보 버튼으로 초점을 넘긴다
                      releasedUserId.current = selected.userId;
                      focusAfterRender.current = 'candidate';
                      setOwner('');
                    }}
                    className="cursor-pointer text-caption text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <span className="text-caption text-text-secondary">
                  {isMembersLoading
                    ? '참여자 불러오는 중…'
                    : '아래에서 담당자를 선택하세요'}
                </span>
              )}
            </div>
            {/* 옮길 버튼이 사라졌을 때 초점을 받아줄 자리 */}
            <div
              ref={candidateBoxRef}
              tabIndex={-1}
              className="mt-1.5 flex flex-wrap gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-primary"
            >
              {membersFailed ? (
                <span className="text-caption text-text-secondary">
                  참여자를 불러오지 못했습니다.
                </span>
              ) : (
                candidates.map((member) => (
                  <button
                    key={member.memberId}
                    type="button"
                    ref={(node) => {
                      if (node)
                        candidateButtons.current.set(member.userId, node);
                      else candidateButtons.current.delete(member.userId);
                    }}
                    disabled={isSubmitting}
                    onClick={() => {
                      // 고르면 이 버튼이 사라진다 — 새로 생기는 해제 버튼으로 초점을 넘긴다
                      focusAfterRender.current = 'chip';
                      setOwner(member.userId);
                    }}
                    title={`${member.name}${member.department ? ` · ${member.department}` : ''}`}
                    className="flex cursor-pointer items-center gap-1 rounded-button-md px-1.5 py-0.5 text-caption text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {/* 후보는 재직자뿐이라 상태 문구가 붙을 일이 없다 */}
                    <MemberAvatar
                      userId={member.userId}
                      name={member.name}
                      size="xs"
                      decorative
                    />
                    {member.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border-default bg-bg-surface px-5 py-3.5">
          <p
            role={errorMessage ? 'alert' : undefined}
            className={`text-caption ${errorMessage ? 'text-text-danger' : 'text-text-secondary'}`}
          >
            {errorMessage ||
              (hasNoVersion
                ? '버전 정보를 받지 못해 저장할 수 없습니다. 새로고침해주세요.'
                : '블록 제목과 담당자를 변경할 수 있습니다.')}
          </p>
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
              onClick={requestSave}
              disabled={isSubmitting || hasNoVersion}
              className="btn btn-md btn-primary min-w-[104px]"
            >
              {isSubmitting ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </Modal>
      {confirmation === 'save' && (
        <AlertDialogTwoButton
          icon={DialogIcons.info}
          title="변경사항을 저장할까요?"
          description="블록 제목과 담당자 변경사항을 저장합니다."
          confirmLabel="저장"
          onConfirm={() => void submit()}
          onCancel={() => setConfirmation(null)}
        />
      )}
      {confirmation === 'conflict' && (
        // 취소(= Esc · 배경 클릭)를 다시 불러오기에 둔다 — 잘못 눌러도 남의 값이 지워지지 않는다
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="다른 사람이 먼저 저장했습니다"
          description="그 사이 이 블록이 수정됐습니다. 지금 입력한 내용으로 덮어쓰거나, 최신 내용을 다시 불러올 수 있습니다."
          confirmLabel="덮어쓰기"
          cancelLabel="다시 불러오기"
          isDanger
          onConfirm={() => void submit(true)}
          onCancel={() => {
            notifyBlockChanged();
            onClose();
          }}
        />
      )}
      {confirmation === 'leave' && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="수정을 취소할까요?"
          description="저장하지 않은 변경사항은 사라집니다."
          confirmLabel="나가기"
          isDanger
          onConfirm={onClose}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="size-3.5"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
