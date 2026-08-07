'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import Modal from '@/components/Modal';
import { getProjectMembers } from '@/features/project/api';
import type { ProjectMember } from '@/features/project/types';
import { messageOf } from '@/lib/api';

import { updateBlock } from './api';
import BlockTypeIcon from './BlockTypeIcon';
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
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(true);
  const [membersFailed, setMembersFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getProjectMembers(projectId, controller.signal)
      .then((nextMembers) => {
        setMembers(nextMembers);
        setIsMembersLoading(false);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setMembersFailed(true);
          setIsMembersLoading(false);
          setErrorMessage(messageOf(caught, '참여자를 불러오지 못했습니다.'));
        }
      });
    return () => controller.abort();
  }, [projectId]);

  async function submit() {
    if (isSubmitting) return;
    const nextTitle = title.trim();
    const titleChanged = nextTitle !== (block.title ?? '');
    const ownerChanged = owner !== (block.owner?.userId ?? '');
    if (!titleChanged && !ownerChanged) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const updated = await updateBlock(block.blockId, {
        ...(titleChanged ? { title: nextTitle || null } : {}),
        ...(ownerChanged ? { owner: owner || null } : {}),
      });
      onUpdated(updated);
      onClose();
    } catch (caught) {
      setErrorMessage(messageOf(caught, '블록을 수정하지 못했습니다.'));
      setIsSubmitting(false);
    }
  }

  /** 담당자는 한 명이라 고른 사람은 칩으로, 나머지는 후보 버튼으로 나눈다 */
  const selectedMember = members.find((member) => member.userId === owner);
  const candidates = members.filter((member) => member.userId !== owner);

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
    <Modal
      title="블록 수정"
      onClose={isSubmitting ? undefined : onClose}
      className="w-full max-w-[480px] overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      header={
        <div className="flex items-center gap-2.5 border-b border-[#1C1F2A]/10 px-5 py-3.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded border border-[#3B5BDB]/20 bg-[#3B5BDB]/10 text-[#3B5BDB]">
            <BlockTypeIcon code={block.type} />
          </span>
          <h2 className="shrink-0 text-sm font-semibold text-[#1C1F2A]">
            블록 수정
          </h2>
          <span className="max-w-[50%] truncate rounded bg-[#ECEEF4] px-1.5 py-0.5 text-[10px] text-[#6C7389]">
            {block.title || '제목 없음'}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="닫기"
            className="ml-auto flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CloseIcon />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 p-5">
        <label className="block">
          <span className="block pb-1.5 text-[11px] font-semibold text-[#1C1F2A]">
            블록 제목
          </span>
          <input
            value={title}
            maxLength={BLOCK_TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="블록 제목을 입력해주세요."
            className="w-full rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/50 px-3 py-2 text-[11px] font-normal text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB]"
          />
        </label>
        {/* 담당자 지정 — 이슈 담당자 지정과 같은 모양(칩 + 후보 버튼)을 쓴다 */}
        <div>
          <span className="block pb-1.5 text-[11px] font-semibold text-[#1C1F2A]">
            담당자
          </span>
          <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/50 p-2.5">
            {selectedMember ? (
              <span className="flex items-center gap-1 rounded-full border border-[#1C1F2A]/10 bg-white px-2 py-0.5">
                <MemberAvatar
                  userId={selectedMember.userId}
                  name={selectedMember.name}
                  size="xs"
                  decorative
                />
                <span className="text-[10px] font-medium text-[#1C1F2A]">
                  {selectedMember.name}
                </span>
                <button
                  type="button"
                  ref={releaseButtonRef}
                  aria-label={`${selectedMember.name} 해제`}
                  disabled={isSubmitting}
                  onClick={() => {
                    // 해제하면 이 버튼이 사라진다 — 다시 나타날 후보 버튼으로 초점을 넘긴다
                    releasedUserId.current = selectedMember.userId;
                    focusAfterRender.current = 'candidate';
                    setOwner('');
                  }}
                  className="cursor-pointer text-[10px] text-[#6C7389] hover:text-[#1C1F2A] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✕
                </button>
              </span>
            ) : (
              <span className="text-[10px] text-[#6C7389]">
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
            className="mt-1.5 flex flex-wrap gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5BDB]"
          >
            {membersFailed ? (
              <span className="text-[10px] text-[#6C7389]">
                참여자를 불러오지 못했습니다.
              </span>
            ) : (
              candidates.map((member) => (
                <button
                  key={member.memberId}
                  type="button"
                  ref={(node) => {
                    if (node) candidateButtons.current.set(member.userId, node);
                    else candidateButtons.current.delete(member.userId);
                  }}
                  disabled={isSubmitting}
                  onClick={() => {
                    // 고르면 이 버튼이 사라진다 — 새로 생기는 해제 버튼으로 초점을 넘긴다
                    focusAfterRender.current = 'chip';
                    setOwner(member.userId);
                  }}
                  title={`${member.name}${member.department ? ` · ${member.department}` : ''}${member.resigned ? ' · 퇴사' : ''}`}
                  className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[#6C7389] hover:bg-[#ECEEF4] hover:text-[#1C1F2A] disabled:cursor-not-allowed disabled:opacity-40"
                >
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
      <div className="flex items-center justify-between gap-4 border-t border-[#1C1F2A]/10 bg-[#ECEEF4]/20 px-5 py-3.5">
        <p
          role={errorMessage ? 'alert' : undefined}
          className={`text-[10px] ${errorMessage ? 'text-[#E7000B]' : 'text-[#6C7389]'}`}
        >
          {errorMessage || '블록 제목과 담당자를 변경할 수 있습니다.'}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg bg-[#3B5BDB] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3450c4] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
          >
            {isSubmitting ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </Modal>
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
