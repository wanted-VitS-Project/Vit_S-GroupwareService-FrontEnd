'use client';

import { useEffect, useRef, useState } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import Modal from '@/components/Modal';
import PersonNote from '@/components/PersonNote';
import LoadingSpinner from '@/components/Spinner';
import { notifyToast } from '@/components/Toast';
import { getStepBlocks } from '@/features/block/api';
import type { StepBlock } from '@/features/block/types';
import { getProjectMembers } from '@/features/project/api';
import type { ProjectMember } from '@/features/project/types';
import { isAbortError, messageOf } from '@/lib/api';

import { createIssue, getIssue, toCreateDueDate, updateIssue } from './api';
import { ISSUE_MERGED_MESSAGE, isIssueVersionConflict } from './errorCodes';
import { IssueBlockIcon } from './IssueBadges';
import IssueConflictModal, {
  type IssueConflictChoice,
  type IssueConflictRow,
} from './IssueConflictModal';
import {
  changedIssueFields,
  ISSUE_FIELD_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_ORDER,
  ISSUE_PRIORITY_STYLES,
  type IssueDetail,
  type IssueEditField,
  type IssueFormValues,
  type IssuePriority,
  issuePatchOf,
  mergeIssueFields,
  toIssueFormValues,
} from './types';

const FIELD_CLASS =
  'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-label text-text-primary placeholder:text-text-secondary focus:border-border-primary focus:outline-none';

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-detail font-semibold text-text-primary">
      {children}
      {required && <span className="text-text-danger"> *</span>}
    </span>
  );
}

/** 모달 머리의 이슈 아이콘 (#) */
function IssueMarkIcon() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-button-sm border border-purple-bg bg-purple-bg">
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

/**
 * 이슈 생성 · 수정 폼. (.ai/API.md 56 · 58번)
 *
 * `issueId` 를 넘기면 수정 모드다 — 목록에는 `content` 가 없어 상세를 다시 조회한다.
 * 수정은 **바뀐 필드만** PATCH 로 보낸다.
 *
 * ⚠️ 상태는 이 폼에서 다루지 않는다. 생성은 항상 `TODO`(시작 전)이고,
 *    이후 변경은 보드에서 드래그로만 한다.
 *
 * ⚠️ **낙관적 락** (2026-08-12 신설) — 세 벌을 구분해서 든다:
 *    - `base` : 최초 조회값. 비교 기준이자 **요청에 실을 `version` 의 출처**다
 *    - `values`(draft) : 사용자가 지금 입력하고 있는 값. 409 가 와도 **건드리지 않는다**
 *    - `latest` : 409 뒤에 다시 읽은 서버값. `conflict` 안에만 두고 `base` 를 바로 덮지 않는다
 *
 *    409 를 받으면 `내가 고친 필드 ∩ 남이 고친 필드` 를 계산해서,
 *    겹치지 않으면 **조용히 병합해 한 번 재시도**하고, 겹치면 **사용자에게 고르게 한다.**
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
    /**
     * 최초 조회값 — 무엇이 바뀌었는지 비교할 기준이고, 요청에 실을 `version` 의 출처다.
     * (생성 모드는 `null`)
     */
    base: IssueDetail | null;
    /** 사용자가 입력하고 있는 값(draft). 409 가 와도 초기화하지 않는다 */
    values: IssueFormValues;
  } | null>(isEdit ? null : { key: null, base: null, values: EMPTY_FORM });
  /**
   * 409 로 멈춘 뒤 사용자에게 물을 것.
   *
   * ⚠️ `latest` 를 `base` 에 바로 꽂지 않는다 — 사용자가 고르기 전에 기준을 옮기면
   *    "내가 고친 필드" 판정이 달라져 내 입력이 변경 아닌 것으로 보일 수 있다.
   */
  const [conflict, setConflict] = useState<{
    key: number | null;
    latest: IssueDetail;
    fields: IssueEditField[];
  } | null>(null);
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
  const base = current?.base ?? null;
  const loadFailure = failed?.key === formKey ? failed.message : null;
  const errorMessage = saveError?.key === formKey ? saveError.message : '';
  const asking = conflict?.key === formKey ? conflict : null;

  /** 저장 오류 문구를 지금 대상에 붙여 둔다 */
  function showError(message: string) {
    setSaveError({ key: formKey, message });
  }

  useEffect(() => {
    if (issueId === undefined) return;
    const controller = new AbortController();

    getIssue(issueId, controller.signal)
      .then((issue) => {
        // base 와 draft 에 각각 복사한다 — 이후 입력은 draft 만 바꾼다
        setForm({
          key: issueId,
          base: issue,
          values: toIssueFormValues(issue),
        });
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
      /*
       * 퇴사자 · **삭제된 사원**은 후보에서 뺀다 — 담당자 검증에서 거절된다 (명세 58번).
       * `permission !== 'NONE'` 필터는 걷어냈다: `NONE` 이 폐기돼(2026-08-06) 참여자는
       * 항상 `VIEWER` · `EDITOR` 둘 중 하나다 (명세 45번). 차단은 참여자 제거로 표현된다.
       */
      .then((loaded) =>
        setMembers(
          loaded.filter((member) => !member.resigned && !member.deleted),
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

  /** draft 를 지금 base 기준으로 갈아끼운다 — 자동 병합 · 충돌 해소가 함께 쓴다 */
  function rebase(nextBase: IssueDetail, nextValues: IssueFormValues) {
    setForm((prev) =>
      prev === null || prev.key !== formKey
        ? prev
        : { ...prev, base: nextBase, values: nextValues },
    );
  }

  /**
   * 수정 저장 — **바뀐 필드만** `base.version` 과 함께 보낸다.
   *
   * `isMerged` 는 자동 병합 재시도인지다. 재시도에서 또 409 면 다시 병합하지 않는다 —
   * 남이 계속 저장하는 동안 화면이 같은 자리를 무한히 돌 수 있다.
   */
  async function saveEdit(
    id: number,
    draft: IssueFormValues,
    from: IssueDetail,
    isMerged: boolean,
  ) {
    const mine = changedIssueFields(draft, toIssueFormValues(from));

    // 바뀐 게 없으면 요청을 보내지 않는다
    if (mine.length === 0) {
      onSaved(from);
      return;
    }

    try {
      const saved = await updateIssue(
        id,
        issuePatchOf(draft, mine, from.version),
      );
      // 병합해 저장한 것을 모르고 지나가면 안 된다 — 모달은 닫히므로 토스트로 알린다
      if (isMerged) notifyToast(ISSUE_MERGED_MESSAGE);
      onSaved(saved);
      return;
    } catch (caught) {
      if (!isIssueVersionConflict(caught)) {
        showError(messageOf(caught, '이슈를 수정하지 못했습니다.'));
        setIsSaving(false);
        return;
      }
    }

    // 409 — draft · 입력 화면 · 커서는 그대로 두고 뒷처리만 한다
    await resolveConflict(id, draft, from, mine, isMerged);
  }

  /** 409 뒷처리 — 최신값을 읽어 자동 병합하거나, 겹치는 필드를 사용자에게 묻는다 */
  async function resolveConflict(
    id: number,
    draft: IssueFormValues,
    from: IssueDetail,
    mine: IssueEditField[],
    isMerged: boolean,
  ) {
    let latest: IssueDetail;
    try {
      latest = await getIssue(id);
    } catch (caught) {
      showError(
        messageOf(
          caught,
          '최신 내용을 불러오지 못했습니다. 다시 시도해주세요.',
        ),
      );
      setIsSaving(false);
      return;
    }

    const latestValues = toIssueFormValues(latest);
    const theirs = changedIssueFields(latestValues, toIssueFormValues(from));
    // 남이 고쳤어도 **결과가 내 값과 같으면** 다툴 게 없다
    const differs = changedIssueFields(draft, latestValues);
    const clash = mine.filter(
      (field) => theirs.includes(field) && differs.includes(field),
    );

    if (clash.length > 0) {
      // 여기서는 base 를 옮기지 않는다 — 사용자가 고른 뒤에 옮긴다
      setConflict({ key: formKey, latest, fields: clash });
      setIsSaving(false);
      return;
    }

    // 겹치는 필드가 없다 — 최신값 위에 내 수정만 얹어 최신 version 으로 다시 보낸다
    const merged = mergeIssueFields(latestValues, draft, mine);
    rebase(latest, merged);

    if (isMerged) {
      // 병합 재시도까지 밀렸다 — 기준만 최신으로 옮기고 다음 저장은 사용자에게 맡긴다
      showError(
        '다른 사람이 계속 수정하고 있어 저장이 밀렸습니다. 최신 내용을 반영했으니 다시 저장해주세요.',
      );
      setIsSaving(false);
      return;
    }

    await saveEdit(id, merged, latest, true);
  }

  /** 비교 UI 에서 고른 결과로 저장한다 — 고르지 않은(겹치지 않는) 필드는 이미 병합 대상이다 */
  async function applyConflictChoice(choices: IssueConflictChoice) {
    if (asking === null || values === null || base === null) return;
    if (issueId === undefined) return;

    const { latest } = asking;
    const mine = changedIssueFields(values, toIssueFormValues(base));
    // `최신값` 을 고른 필드만 내 수정에서 뺀다
    const keep = mine.filter((field) => choices[field] !== 'theirs');
    const resolved = mergeIssueFields(toIssueFormValues(latest), values, keep);

    setConflict(null);
    rebase(latest, resolved);
    setSaveError(null);
    setIsSaving(true);
    // 기준을 최신으로 옮겼으니 또 409 면 자동 병합 대신 다시 묻는다
    await saveEdit(issueId, resolved, latest, true);
  }

  async function submit() {
    // 현재 대상의 상세를 아직 못 받았으면 저장하지 않는다 (다른 이슈를 덮어쓸 수 있다)
    if (values === null || isSaving) return;
    if (isEdit && base === null) return;

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

    if (base !== null && issueId !== undefined) {
      await saveEdit(issueId, { ...values, title }, base, false);
      return;
    }

    try {
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
      // 수정 실패는 `saveEdit` 이 안내한다 — 여기까지 오는 것은 생성뿐이다
      showError(messageOf(caught, '이슈를 생성하지 못했습니다.'));
      setIsSaving(false);
    }
  }

  const modalTitle = isEdit ? '이슈 수정' : '새 이슈 생성';
  const candidates = members.filter(
    (member) => !values?.assigneeIds.includes(member.userId),
  );

  /**
   * 겹친 필드의 비교 문구.
   *
   * 담당자 · 블록은 ID 만으로는 무엇이 다른지 알 수 없다 — 이름을 아는 곳이 여기라
   * 문구를 만들어 넘긴다 (비교 모달은 값을 그리기만 한다).
   */
  function conflictRows(latest: IssueDetail): IssueConflictRow[] {
    if (values === null) return [];

    const latestValues = toIssueFormValues(latest);

    /** 담당자 이름 — 참여자 목록에 없으면(퇴사 · 권한 회수) 최신값의 이름, 없으면 사번 */
    function assigneeNames(ids: string[]) {
      return (
        ids
          .map(
            (userId) =>
              members.find((member) => member.userId === userId)?.name ??
              latest.assignees.find((assignee) => assignee.userId === userId)
                ?.name ??
              userId,
          )
          .join(', ') || ''
      );
    }

    function blockNames(ids: number[]) {
      return (
        ids
          .map(
            (blockId) =>
              blocks.find((block) => block.blockId === blockId)?.title ||
              latest.relatedBlocks.find((block) => block.blockId === blockId)
                ?.title ||
              `블록 #${blockId}`,
          )
          .join(', ') || ''
      );
    }

    function describe(field: IssueEditField, from: IssueFormValues) {
      if (field === 'priority') return ISSUE_PRIORITY_LABELS[from.priority];
      if (field === 'assigneeIds') return assigneeNames(from.assigneeIds);
      if (field === 'blockIds') return blockNames(from.blockIds);
      return from[field];
    }

    return (asking?.fields ?? []).map((field) => ({
      field,
      label: ISSUE_FIELD_LABELS[field],
      mine: describe(field, values),
      theirs: describe(field, latestValues),
    }));
  }

  return (
    <>
      <Modal
        title={modalTitle}
        onClose={isSaving ? undefined : onClose}
        className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
        header={
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-default px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <IssueMarkIcon />
              <h2 className="text-body-m font-semibold text-text-primary">
                {modalTitle}
              </h2>
              {stepName && (
                <span className="truncate rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-caption text-text-secondary">
                  {stepName}
                </span>
              )}
              {isEdit && (
                <span className="text-caption text-text-secondary">
                  #{issueId}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              aria-label="닫기"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        }
      >
        {loadFailure ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <p role="alert" className="text-label text-text-danger">
              {loadFailure}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="cursor-pointer rounded-lg border border-border-default px-3 py-1.5 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
              >
                다시 시도
              </button>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover"
              >
                닫기
              </button>
            </div>
          </div>
        ) : values === null ? (
          <LoadingSpinner label="이슈를 불러오는 중" className="py-16" />
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
                        className={`flex-1 cursor-pointer rounded-button-md border py-1.5 text-caption font-medium ${
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
                  <span className="text-caption text-text-secondary">
                    아래에서 담당자를 선택하세요
                  </span>
                ) : (
                  values.assigneeIds.map((userId) => {
                    /*
                     * 이미 담당자인 퇴사자는 후보 목록에 없다 (후보에서만 제외한다) —
                     * 이름과 퇴사 여부는 **이슈 응답**에서 가져와 칩을 그대로 그린다.
                     */
                    const assigned = base?.assignees.find(
                      (assignee) => assignee.userId === userId,
                    );
                    const name =
                      members.find((member) => member.userId === userId)
                        ?.name ??
                      assigned?.name ??
                      userId;
                    const isResigned = assigned?.resignedAt != null;

                    return (
                      <span
                        key={userId}
                        className="flex items-center gap-1 rounded-pill border border-border-default bg-bg-card px-2 py-0.5"
                      >
                        <MemberAvatar
                          userId={userId}
                          name={name}
                          size="xs"
                          decorative
                          resigned={isResigned}
                        />
                        <span className="flex items-center gap-0.5">
                          <span className="text-caption font-medium text-text-primary">
                            {name}
                          </span>
                          {isResigned && <PersonNote />}
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
                          className="cursor-pointer text-caption text-text-secondary hover:text-text-primary"
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
                  <span className="text-caption text-text-secondary">
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
                      className="flex cursor-pointer items-center gap-1 rounded-button-md px-1.5 py-0.5 text-caption text-text-secondary hover:bg-bg-hover hover:text-text-primary"
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
                <p className="text-caption text-text-secondary">
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
                        <span className="flex-1 truncate text-detail font-medium text-text-primary">
                          {block.title || '제목 없음'}
                        </span>
                        <span className="text-micro text-text-secondary">
                          {block.type}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {errorMessage && (
              <p role="alert" className="text-caption text-text-danger">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border-default bg-bg-surface px-5 py-3.5">
          <span className="text-caption text-text-secondary">
            * 필수 입력 항목
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn btn-md btn-gray-outlined"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isSaving || values === null || loadFailure !== null}
              className="btn btn-md btn-primary min-w-[104px]"
            >
              {isSaving ? '저장 중…' : isEdit ? '수정 완료' : '이슈 생성'}
            </button>
          </div>
        </div>
      </Modal>

      {asking !== null && (
        <IssueConflictModal
          rows={conflictRows(asking.latest)}
          isSaving={isSaving}
          onSave={(choices) => void applyConflictChoice(choices)}
          // 계속 편집 — draft 를 그대로 두고 닫는다. 다시 저장하면 최신값을 또 확인한다
          onCancel={() => setConflict(null)}
        />
      )}
    </>
  );
}
