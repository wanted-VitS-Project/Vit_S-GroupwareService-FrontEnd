'use client';

import { useEffect, useRef, useState } from 'react';

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
  'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:border-border-primary focus:outline-none';

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold text-text-primary">
      {children}
      {required && <span className="text-text-danger"> *</span>}
    </span>
  );
}

/** 모달 머리의 이슈 아이콘 (#) */
function IssueMarkIcon() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded border border-purple-bg bg-purple-bg">
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
  /** 생성 모드는 `null` 로 표시한다 — 아래 상태가 어느 이슈의 것인지 가리는 열쇠다 */
  const formKey = issueId ?? null;

  /**
   * 입력값과 비교 원본을 **어느 이슈의 것인지와 함께** 담는다.
   *
   * ⚠️ 이렇게 묶지 않으면 `issueId` 가 A → B 로 바뀐 직후(B 상세가 오기 전) 저장했을 때
   *    A 의 값으로 만든 본문이 B 에 PATCH 되어 **다른 이슈를 덮어쓴다.**
   */
  const [form, setForm] = useState<{
    key: number | null;
    /** 수정 모드에서 무엇이 바뀌었는지 비교할 원본 (생성 모드는 null) */
    original: IssueDetail | null;
    values: IssueFormValues;
  } | null>(isEdit ? null : { key: null, original: null, values: EMPTY_FORM });
  /** 상세 조회 실패 — 로딩과 구분한다 */
  const [failed, setFailed] = useState<{
    key: number | null;
    message: string;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [blocks, setBlocks] = useState<StepBlock[]>([]);
  /** 저장 오류도 대상과 함께 담는다 — 대상이 바뀌면 앞선 문구가 저절로 사라진다 */
  const [saveError, setSaveError] = useState<{
    key: number | null;
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 지금 열려 있는 이슈의 것만 화면에 쓴다 (다른 이슈의 잔상 · 실패는 버린다)
  const current = form?.key === formKey ? form : null;
  const values = current?.values ?? null;
  const original = current?.original ?? null;
  const loadFailure = failed?.key === formKey ? failed.message : null;
  const errorMessage = saveError?.key === formKey ? saveError.message : '';

  /** 저장 오류 문구를 지금 대상에 붙여 둔다 */
  function showError(message: string) {
    setSaveError({ key: formKey, message });
  }

  useEffect(() => {
    if (issueId === undefined) return;
    const controller = new AbortController();

    getIssue(issueId, controller.signal)
      .then((issue) => {
        setForm({ key: issueId, original: issue, values: toFormValues(issue) });
        setFailed((prev) => (prev?.key === issueId ? null : prev));
      })
      .catch((caught) => {
        if (isAbortError(caught)) return;
        setFailed({
          key: issueId,
          message: messageOf(caught, '이슈를 불러오지 못했습니다.'),
        });
      });

    return () => controller.abort();
  }, [issueId, retryCount]);

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

  /**
   * 담당자를 넣거나 뺀 **다음 렌더에서** 초점을 옮길 대상.
   *
   * 고른 후보 버튼과 방금 뺀 제외 버튼은 DOM 에서 사라진다. 그대로 두면 초점이
   * 문서로 떨어져 키보드 사용자가 모달을 처음부터 다시 훑어야 한다.
   */
  const focusAfterRender = useRef<{
    kind: 'remove' | 'candidate';
    userId: string;
  } | null>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const candidateButtons = useRef(new Map<string, HTMLButtonElement>());
  /** 옮길 버튼이 없을 때 붙잡아 둘 자리 (후보 영역) */
  const assigneeBoxRef = useRef<HTMLDivElement>(null);

  // 초점 이동은 DOM 조작이라 렌더가 끝난 뒤에 한다
  useEffect(() => {
    const target = focusAfterRender.current;
    if (!target) return;
    focusAfterRender.current = null;

    const store =
      target.kind === 'remove'
        ? removeButtons.current
        : candidateButtons.current;
    const next = store.get(target.userId);

    if (next) next.focus();
    else assigneeBoxRef.current?.focus();
  });

  function patch(next: Partial<IssueFormValues>) {
    setForm((prev) =>
      // 대상이 바뀐 뒤 늦게 들어온 입력은 버린다
      prev === null || prev.key !== formKey
        ? prev
        : { ...prev, values: { ...prev.values, ...next } },
    );
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
    // 현재 대상의 상세를 아직 못 받았으면 저장하지 않는다 (다른 이슈를 덮어쓸 수 있다)
    if (values === null || isSaving) return;
    if (isEdit && original === null) return;

    const title = values.title.trim();
    if (!title) {
      showError('이슈 이름을 입력해주세요.');
      return;
    }
    if (title.length > 200) {
      showError('이슈 이름은 200자까지 입력할 수 있습니다.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

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
      showError(
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
      className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-border-default shadow-2xl"
      header={
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-default px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <IssueMarkIcon />
            <h2 className="text-sm font-semibold text-text-primary">
              {modalTitle}
            </h2>
            {stepName && (
              <span className="truncate rounded bg-bg-hover px-1.5 py-0.5 text-[10px] text-text-secondary">
                {stepName}
              </span>
            )}
            {isEdit && (
              <span className="text-[10px] text-text-secondary">
                #{issueId}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="닫기"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      }
    >
      {loadFailure ? (
        <div className="flex flex-col items-center gap-3 px-5 py-12">
          <p role="alert" className="text-xs text-text-danger">
            {loadFailure}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="cursor-pointer rounded-lg border border-border-default px-3 py-1.5 text-[11px] font-medium text-text-primary-blue hover:bg-blue-bg-soft"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover"
            >
              닫기
            </button>
          </div>
        </div>
      ) : values === null ? (
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
                          : 'border-border-default text-text-secondary hover:bg-bg-hover'
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
            <div className="flex min-h-[40px] flex-wrap gap-1.5 rounded-lg border border-border-default bg-bg-surface p-2.5">
              {values.assigneeIds.length === 0 ? (
                <span className="text-[10px] text-text-secondary">
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
                      className="flex items-center gap-1 rounded-full border border-border-default bg-white px-2 py-0.5"
                    >
                      <MemberAvatar
                        userId={userId}
                        name={name}
                        size="xs"
                        decorative
                      />
                      <span className="text-[10px] font-medium text-text-primary">
                        {name}
                      </span>
                      <button
                        type="button"
                        ref={(node) => {
                          if (node) removeButtons.current.set(userId, node);
                          else removeButtons.current.delete(userId);
                        }}
                        aria-label={`${name} 제외`}
                        onClick={() => {
                          // 이 버튼은 곧 사라진다 — 다시 나타날 후보 버튼으로 초점을 넘긴다
                          focusAfterRender.current = {
                            kind: 'candidate',
                            userId,
                          };
                          patch({
                            assigneeIds: values.assigneeIds.filter(
                              (picked) => picked !== userId,
                            ),
                          });
                        }}
                        className="cursor-pointer text-[10px] text-text-secondary hover:text-text-primary"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })
              )}
            </div>
            {/* 옮길 버튼이 사라졌을 때 초점을 받아줄 자리 */}
            <div
              ref={assigneeBoxRef}
              tabIndex={-1}
              className="mt-1.5 flex flex-wrap gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-primary"
            >
              {members.length === 0 ? (
                <span className="text-[10px] text-text-secondary">
                  참여자를 불러오지 못했습니다.
                </span>
              ) : (
                candidates.map((member) => (
                  <button
                    key={member.userId}
                    type="button"
                    ref={(node) => {
                      if (node)
                        candidateButtons.current.set(member.userId, node);
                      else candidateButtons.current.delete(member.userId);
                    }}
                    onClick={() => {
                      // 고르면 이 버튼이 사라진다 — 새로 생기는 제외 버튼으로 초점을 넘긴다
                      focusAfterRender.current = {
                        kind: 'remove',
                        userId: member.userId,
                      };
                      patch({
                        assigneeIds: [...values.assigneeIds, member.userId],
                      });
                    }}
                    className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-bg-hover hover:text-text-primary"
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

          <div>
            <FieldLabel>관련 블록 연결</FieldLabel>
            {blocks.length === 0 ? (
              <p className="text-[10px] text-text-secondary">
                연결할 블록이 없습니다.
              </p>
            ) : (
              <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
                {blocks.map((block) => {
                  const isPicked = values.blockIds.includes(block.blockId);

                  return (
                    <label
                      key={block.blockId}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-bg-hover"
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
                      <span className="flex-1 truncate text-[11px] font-medium text-text-primary">
                        {block.title || '제목 없음'}
                      </span>
                      <span className="text-[9px] text-text-secondary">
                        {block.type}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {errorMessage && (
            <p role="alert" className="text-[10px] text-text-danger">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border-default bg-bg-surface px-5 py-3.5">
        <span className="text-[10px] text-text-secondary">
          * 필수 입력 항목
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSaving || values === null || loadFailure !== null}
            className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
          >
            {isSaving ? '저장 중…' : isEdit ? '수정 완료' : '이슈 생성'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
