'use client';

import { useEffect, useState } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import Modal from '@/components/Modal';
import { Skeleton, SkeletonGroup } from '@/components/Skeleton';
import { getStepBlocks } from '@/features/block/api';
import type { StepBlock } from '@/features/block/types';
import { getProjectMembers } from '@/features/project/api';
import type { ProjectMember } from '@/features/project/types';
import { isAbortError, messageOf } from '@/lib/api';

import { createIssue, getIssue, toCreateDueDate, updateIssue } from './api';
import { IssueBlockIcon } from './IssueBadges';
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_ORDER,
  ISSUE_PRIORITY_STYLES,
  type IssueDetail,
  type IssueFormValues,
  type IssuePriority,
  type UpdateIssueRequest,
} from './types';

const FIELD_CLASS =
  'w-full rounded-lg border border-[#1C1F2A]/9 bg-[#ECEEF4]/50 px-3 py-2 text-xs text-[#1C1F2A] placeholder:text-[#6C7389] focus:border-[#3B5BDB] focus:outline-none';

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold text-[#1C1F2A]">
      {children}
      {required && <span className="text-[#E7000B]"> *</span>}
    </span>
  );
}

/** 모달 머리의 이슈 아이콘 (#) */
function IssueMarkIcon() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded border border-[#DDD6FF] bg-[#EDE9FE]">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7F22FE"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
        className="size-2.5"
      >
        <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
      </svg>
    </span>
  );
}

/** 새 이슈는 항상 `TODO` 로 만든다 — 이후 상태 변경은 보드 드래그로만 한다 */
const EMPTY_FORM: IssueFormValues = {
  title: '',
  content: '',
  priority: 'MEDIUM',
  dueDate: '',
  assigneeIds: [],
  blockIds: [],
};

function toFormValues(issue: IssueDetail): IssueFormValues {
  return {
    title: issue.title,
    content: issue.content ?? '',
    priority: issue.priority,
    dueDate: issue.dueDate ?? '',
    assigneeIds: issue.assignees.map((assignee) => assignee.userId),
    blockIds: issue.relatedBlocks.map((block) => block.blockId),
  };
}

/** 순서만 다른 같은 집합은 변경으로 보지 않는다 — 불필요한 관계 재동기화를 막는다 */
function isSameSet<T>(left: T[], right: T[]) {
  return (
    left.length === right.length && left.every((item) => right.includes(item))
  );
}

/**
 * 이슈 생성 · 수정 폼. (.ai/API.md 56 · 58번)
 *
 * `issueId` 를 넘기면 수정 모드다 — 목록에는 `content` 가 없어 상세를 다시 조회한다.
 * 수정은 **바뀐 필드만** PATCH 로 보낸다.
 *
 * ⚠️ 상태는 이 폼에서 다루지 않는다. 생성은 항상 `TODO`(시작 전)이고,
 *    이후 변경은 보드에서 드래그로만 한다.
 */
export default function IssueFormModal({
  projectId,
  stepId,
  stepName,
  issueId,
  onClose,
  onSaved,
}: {
  projectId: string;
  stepId: string;
  /** 머리 칩에 띄울 스텝 이름 — 못 읽었으면 칩을 숨긴다 */
  stepName?: string;
  /** 없으면 생성 모드 */
  issueId?: number;
  onClose: () => void;
  onSaved: (issue: IssueDetail) => void;
}) {
  const isEdit = issueId !== undefined;

  /** 수정 모드에서 무엇이 바뀌었는지 비교할 원본 */
  const [original, setOriginal] = useState<IssueDetail | null>(null);
  const [values, setValues] = useState<IssueFormValues | null>(
    isEdit ? null : EMPTY_FORM,
  );
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [blocks, setBlocks] = useState<StepBlock[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (issueId === undefined) return;
    const controller = new AbortController();

    getIssue(issueId, controller.signal)
      .then((issue) => {
        setOriginal(issue);
        setValues(toFormValues(issue));
      })
      .catch((caught) => {
        if (isAbortError(caught)) return;
        setErrorMessage(messageOf(caught, '이슈를 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [issueId]);

  // 담당자 · 블록 선택지 — 실패해도 나머지 입력은 계속할 수 있게 둔다
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectMembers(projectId, signal)
      // permission 이 NONE 이면 담당자 검증에서 거절된다 (명세 58번)
      .then((loaded) =>
        setMembers(
          loaded.filter(
            (member) => !member.resigned && member.permission !== 'NONE',
          ),
        ),
      )
      .catch(() => undefined);

    getStepBlocks(stepId, signal)
      .then(setBlocks)
      .catch(() => undefined);

    return () => controller.abort();
  }, [projectId, stepId]);

  function patch(next: Partial<IssueFormValues>) {
    setValues((prev) => (prev === null ? prev : { ...prev, ...next }));
  }

  /** 수정 모드에서 실제로 바뀐 필드만 모은다. `null` 은 해제 신호다 */
  function buildPatch(form: IssueFormValues, before: IssueDetail) {
    const body: UpdateIssueRequest = {};

    if (form.title !== before.title) body.title = form.title;

    const content = form.content.trim() || null;
    if (content !== (before.content ?? null)) body.content = content;

    const dueDate = form.dueDate || null;
    if (dueDate !== (before.dueDate ?? null)) body.dueDate = dueDate;

    if (form.priority !== before.priority) body.priority = form.priority;

    const beforeAssignees = before.assignees.map((assignee) => assignee.userId);
    if (!isSameSet(form.assigneeIds, beforeAssignees)) {
      body.assigneeIds = form.assigneeIds;
    }

    const beforeBlocks = before.relatedBlocks.map((block) => block.blockId);
    if (!isSameSet(form.blockIds, beforeBlocks)) {
      body.blockIds = form.blockIds;
    }

    return body;
  }

  async function submit() {
    if (values === null || isSaving) return;

    const title = values.title.trim();
    if (!title) {
      setErrorMessage('이슈 이름을 입력해주세요.');
      return;
    }
    if (title.length > 200) {
      setErrorMessage('이슈 이름은 200자까지 입력할 수 있습니다.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      if (original !== null && issueId !== undefined) {
        const body = buildPatch({ ...values, title }, original);
        // 바뀐 게 없으면 요청을 보내지 않는다
        const saved =
          Object.keys(body).length > 0
            ? await updateIssue(issueId, body)
            : original;

        onSaved(saved);
        return;
      }

      const created = await createIssue(stepId, {
        title,
        content: values.content.trim() || null,
        // ⚠️ 생성만 날짜+시각 형식이다
        dueDate: toCreateDueDate(values.dueDate),
        // 새 이슈는 언제나 시작 전이다
        status: 'TODO',
        priority: values.priority,
        assigneeIds: values.assigneeIds,
        blockIds: values.blockIds,
      });
      onSaved(created);
    } catch (caught) {
      setErrorMessage(
        messageOf(
          caught,
          isEdit
            ? '이슈를 수정하지 못했습니다.'
            : '이슈를 생성하지 못했습니다.',
        ),
      );
      setIsSaving(false);
    }
  }

  const modalTitle = isEdit ? '이슈 수정' : '새 이슈 생성';
  const candidates = members.filter(
    (member) => !values?.assigneeIds.includes(member.userId),
  );

  return (
    <Modal
      title={modalTitle}
      onClose={isSaving ? undefined : onClose}
      className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-[#1C1F2A]/9 shadow-2xl"
      header={
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#1C1F2A]/9 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <IssueMarkIcon />
            <h2 className="text-sm font-semibold text-[#1C1F2A]">
              {modalTitle}
            </h2>
            {stepName && (
              <span className="truncate rounded bg-[#ECEEF4] px-1.5 py-0.5 text-[10px] text-[#6C7389]">
                {stepName}
              </span>
            )}
            {isEdit && (
              <span className="text-[10px] text-[#6C7389]">#{issueId}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="닫기"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      }
    >
      {values === null ? (
        <SkeletonGroup
          label="이슈를 불러오는 중"
          className="flex flex-col gap-4 p-5"
        >
          <Skeleton className="h-[34px] w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[34px] w-1/2" />
        </SkeletonGroup>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          <label className="block">
            <FieldLabel required>이슈 이름</FieldLabel>
            <input
              autoFocus
              maxLength={200}
              value={values.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="이슈 이름을 입력하세요"
              className={FIELD_CLASS}
            />
          </label>

          <label className="block">
            <FieldLabel>이슈 설명</FieldLabel>
            <textarea
              rows={3}
              value={values.content}
              onChange={(event) => patch({ content: event.target.value })}
              placeholder="이슈에 대한 상세 설명을 입력하세요"
              className={`${FIELD_CLASS} resize-none`}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>우선순위</FieldLabel>
              <div className="flex gap-1.5">
                {ISSUE_PRIORITY_ORDER.map((code: IssuePriority) => {
                  const isPicked = values.priority === code;

                  return (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={isPicked}
                      onClick={() => patch({ priority: code })}
                      className={`flex-1 cursor-pointer rounded-md border py-1.5 text-[10px] font-medium ${
                        isPicked
                          ? ISSUE_PRIORITY_STYLES[code].badge
                          : 'border-[#1C1F2A]/9 text-[#6C7389] hover:bg-[#ECEEF4]'
                      }`}
                    >
                      {ISSUE_PRIORITY_LABELS[code]}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <FieldLabel>마감일</FieldLabel>
              <input
                type="date"
                value={values.dueDate}
                onChange={(event) => patch({ dueDate: event.target.value })}
                className={FIELD_CLASS}
              />
            </label>
          </div>

          <div>
            <FieldLabel>담당자 (다중 지정)</FieldLabel>
            <div className="flex min-h-[40px] flex-wrap gap-1.5 rounded-lg border border-[#1C1F2A]/9 bg-[#ECEEF4]/50 p-2.5">
              {values.assigneeIds.length === 0 ? (
                <span className="text-[10px] text-[#6C7389]">
                  아래에서 담당자를 선택하세요
                </span>
              ) : (
                values.assigneeIds.map((userId) => {
                  const name =
                    members.find((member) => member.userId === userId)?.name ??
                    original?.assignees.find(
                      (assignee) => assignee.userId === userId,
                    )?.name ??
                    userId;

                  return (
                    <span
                      key={userId}
                      className="flex items-center gap-1 rounded-full border border-[#1C1F2A]/9 bg-white px-2 py-0.5"
                    >
                      <MemberAvatar userId={userId} name={name} size="xs" />
                      <span className="text-[10px] font-medium text-[#1C1F2A]">
                        {name}
                      </span>
                      <button
                        type="button"
                        aria-label={`${name} 제외`}
                        onClick={() =>
                          patch({
                            assigneeIds: values.assigneeIds.filter(
                              (picked) => picked !== userId,
                            ),
                          })
                        }
                        className="cursor-pointer text-[10px] text-[#6C7389] hover:text-[#1C1F2A]"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {members.length === 0 ? (
                <span className="text-[10px] text-[#6C7389]">
                  참여자를 불러오지 못했습니다.
                </span>
              ) : (
                candidates.map((member) => (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() =>
                      patch({
                        assigneeIds: [...values.assigneeIds, member.userId],
                      })
                    }
                    className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[#6C7389] hover:bg-[#ECEEF4] hover:text-[#1C1F2A]"
                  >
                    <MemberAvatar
                      userId={member.userId}
                      name={member.name}
                      size="xs"
                    />
                    {member.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <FieldLabel>관련 블록 연결</FieldLabel>
            {blocks.length === 0 ? (
              <p className="text-[10px] text-[#6C7389]">
                연결할 블록이 없습니다.
              </p>
            ) : (
              <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
                {blocks.map((block) => {
                  const isPicked = values.blockIds.includes(block.blockId);

                  return (
                    <label
                      key={block.blockId}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-[#ECEEF4]"
                    >
                      <input
                        type="checkbox"
                        checked={isPicked}
                        onChange={(event) =>
                          patch({
                            blockIds: event.target.checked
                              ? [...values.blockIds, block.blockId]
                              : values.blockIds.filter(
                                  (picked) => picked !== block.blockId,
                                ),
                          })
                        }
                      />
                      <IssueBlockIcon type={block.type} size={16} />
                      <span className="flex-1 truncate text-[11px] font-medium text-[#1C1F2A]">
                        {block.title || '제목 없음'}
                      </span>
                      <span className="text-[9px] text-[#6C7389]">
                        {block.type}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {errorMessage && (
            <p role="alert" className="text-[10px] text-[#E7000B]">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#1C1F2A]/9 bg-[#ECEEF4]/20 px-5 py-3.5">
        <span className="text-[10px] text-[#6C7389]">* 필수 입력 항목</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSaving || values === null}
            className="cursor-pointer rounded-lg bg-[#3B5BDB] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3450C4] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
          >
            {isSaving ? '저장 중…' : isEdit ? '수정 완료' : '이슈 생성'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
