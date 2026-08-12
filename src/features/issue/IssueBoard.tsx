'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { getProjectSteps } from '@/features/project/api';
import { isAbortError, messageOf } from '@/lib/api';

import DeleteIssueModal from './DeleteIssueModal';
import { getStepIssues, updateIssueStatus } from './api';
import { notifyIssueChanged } from './events';
import IssueCard from './IssueCard';
import { IssueBoardSkeleton } from './IssueSkeletons';
import { useIssueMoveAnimation } from './useIssueMoveAnimation';
import {
  byDueDate,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
  ISSUE_STATUS_STYLES,
  type IssueDetail,
  type IssueStatus,
  type IssueSummary,
} from './types';

const loadIssueDetailModal = () => import('./IssueDetailModal');
const loadIssueFormModal = () => import('./IssueFormModal');
const IssueDetailModal = dynamic(loadIssueDetailModal, {
  loading: () => (
    <ModalLoadingFallback
      title="이슈 상세"
      className="flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-hidden rounded-2xl border border-border-default p-6 shadow-2xl"
      bodyClassName="mt-5 h-[460px]"
    />
  ),
});
const IssueFormModal = dynamic(loadIssueFormModal, {
  loading: () => (
    <ModalLoadingFallback
      title="이슈 작성"
      className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-base border border-border-default p-6 shadow-2xl"
      bodyClassName="mt-5 h-[460px]"
    />
  ),
});

function preloadIssueModals() {
  void loadIssueDetailModal();
  void loadIssueFormModal();
}

/** 지금 열려 있는 모달 — 한 번에 하나만 뜬다 */
type OpenModal =
  | { kind: 'detail'; issueId: number }
  | { kind: 'create' }
  | { kind: 'edit'; issueId: number }
  | { kind: 'delete'; issueId: number }
  | null;

/**
 * 스텝 이슈(일정) 보드 — 상태 3열 칸반. (.ai/API.md 55~60번)
 *
 * 서버는 필터 · 정렬을 하지 않는다. **첫 조회만 마감일 순(미지정 마지막)** 으로 세우고,
 * 그 뒤로는 화면이 들고 있는 순서를 따른다 — 새로 만들거나 상태를 바꾼 이슈가
 * 해당 열 **맨 위**에 오게 하기 위함이다. (서버에 순서 저장 기능이 없어 새로고침하면 다시 마감일 순)
 *
 * 상태 변경은 **드래그로만** 한다. 상세 모달은 현재 상태를 보여주기만 한다.
 * 드래그는 화면을 먼저 옮기고 API 를 호출하며, 실패하면 원래 자리로 되돌린다.
 */
export default function IssueBoard() {
  const params = useParams<{ id: string; stepId: string }>();
  const projectId = params.id;
  const stepId = params.stepId;

  /** 어느 스텝의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    stepId: string;
    issues: IssueSummary[];
  } | null>(null);
  const [failedStepId, setFailedStepId] = useState<string | null>(null);
  /** 값이 바뀌면 목록을 다시 불러온다 */
  const [reloadCount, setReloadCount] = useState(0);
  /** 상태 변경 실패처럼 화면을 막지 않는 오류 */
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * 스텝 권한 · 이름. **어느 스텝의 응답인지 함께 담는다.**
   *
   * ⚠️ 값만 들고 있으면 경로를 옮긴 뒤 도착한 이전 스텝의 응답이 현재 화면을 덮어
   *    `VIEWER` 에게 생성 · 수정 · 삭제 · 드래그가 열릴 수 있다.
   */
  const [permission, setPermission] = useState<{
    key: string;
    canEdit: boolean;
    stepName: string;
  } | null>(null);

  const [openModal, setOpenModal] = useState<OpenModal>(null);

  // 드래그 상태
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<IssueStatus | null>(
    null,
  );
  /**
   * 드래그 직후의 클릭으로 상세가 열리지 않게 한 박자 물린다.
   * 화면에 안 보이는 값이라 state 가 아니라 ref 로 둔다 — state 면 드래그마다
   * 보드 전체가 두 번(잠금 · 해제) 더 그려진다.
   */
  const didDragRef = useRef(false);
  const moveAnimation = useIssueMoveAnimation();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getStepIssues(stepId, { signal })
      .then((issues) => {
        // 첫 조회만 마감일 순으로 세운다 — 이후 순서는 화면이 관리한다
        setLoaded({ stepId, issues: [...issues].sort(byDueDate) });
        // 같은 스텝에서 재조회가 성공하면 이전 실패를 지운다
        setFailedStepId((failed) => (failed === stepId ? null : failed));
      })
      .catch((caught) => {
        // 취소는 실패가 아니다
        if (!isAbortError(caught)) setFailedStepId(stepId);
      });

    return () => controller.abort();
  }, [stepId, reloadCount]);

  const permissionKey = `${projectId}:${stepId}`;

  // 스텝 상세 조회 API 가 없어 프로젝트 스텝 목록에서 권한 · 이름을 찾는다
  useEffect(() => {
    const controller = new AbortController();

    getProjectSteps(projectId, controller.signal)
      .then((steps) => {
        const step = steps.find((current) => String(current.stepId) === stepId);
        setPermission({
          key: `${projectId}:${stepId}`,
          canEdit: step?.myPermission === 'EDITOR',
          stepName: step?.name ?? '',
        });
      })
      // 권한을 못 읽으면 보기 전용으로 둔다 — 눌러도 서버가 403 을 줄 뿐이다
      .catch(() => undefined);

    return () => controller.abort();
  }, [projectId, stepId]);

  // 다른 스텝의 응답은 쓰지 않는다 — 확인되기 전까지는 보기 전용이다
  const current = permission?.key === permissionKey ? permission : null;
  const canEdit = current?.canEdit ?? false;
  const stepName = current?.stepName ?? '';

  const issues = loaded?.stepId === stepId ? loaded.issues : null;
  const hasFailed = failedStepId === stepId;

  /** 목록을 통째로 갈지 않고 한 건만 갈아끼운다 — 스크롤 · 드래그 상태를 지킨다 */
  function replaceIssue(next: IssueDetail | IssueSummary) {
    setLoaded((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            issues: prev.issues.map((issue) =>
              issue.issueId === next.issueId ? { ...issue, ...next } : issue,
            ),
          },
    );
  }

  /** 새 이슈는 열 맨 위에 놓는다 — 방금 만든 것이 눈에 보여야 한다 */
  function addIssue(created: IssueDetail) {
    setLoaded((prev) =>
      prev === null ? prev : { ...prev, issues: [created, ...prev.issues] },
    );
    // 이슈 개수가 늘어 스텝 진척률이 바뀐다
    notifyIssueChanged();
  }

  function removeIssue(issueId: number) {
    setLoaded((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            issues: prev.issues.filter((issue) => issue.issueId !== issueId),
          },
    );
    // 삭제분은 집계에서 빠진다 — 진척률이 바뀐다
    notifyIssueChanged();
  }

  /** 상태를 바꾸고 목록 맨 앞으로 옮긴다 — 옮긴 이슈가 새 열의 맨 위에 보이게 */
  function moveToFront(issue: IssueSummary, status: IssueStatus) {
    moveAnimation.capture();
    setLoaded((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            issues: [
              { ...issue, status },
              ...prev.issues.filter(
                (current) => current.issueId !== issue.issueId,
              ),
            ],
          },
    );
  }

  /** 실패 시 원래 상태 · 원래 자리로 되돌린다 */
  function restoreAt(issue: IssueSummary, index: number) {
    moveAnimation.capture();
    setLoaded((prev) => {
      if (prev === null) return prev;

      const rest = prev.issues.filter(
        (current) => current.issueId !== issue.issueId,
      );
      rest.splice(index, 0, issue);
      return { ...prev, issues: rest };
    });
  }

  /**
   * 상태 변경이 나가 있는 이슈. 응답 전에 같은 이슈를 또 옮기면
   * 먼저 실패한 요청이 나중에 성공한 이동을 되돌려 **서버와 화면이 갈린다.**
   * 그래서 이슈 단위로 한 번에 하나만 보낸다.
   */
  const sendingStatusRef = useRef(new Set<number>());

  /** 화면을 먼저 옮기고 호출한다. 실패하면 되돌린다 (명세 59번) */
  async function changeStatus(issueId: number, status: IssueStatus) {
    const index = issues?.findIndex((issue) => issue.issueId === issueId) ?? -1;
    const before = index >= 0 ? issues?.[index] : undefined;
    if (!before || before.status === status) return;
    if (sendingStatusRef.current.has(issueId)) return;

    sendingStatusRef.current.add(issueId);
    setErrorMessage('');
    moveToFront(before, status);

    try {
      await updateIssueStatus(issueId, status);
      // 스텝 · 프로젝트 진척률이 바뀐다 — 사이드바가 다시 읽게 알린다
      notifyIssueChanged();
    } catch (caught) {
      restoreAt(before, index);
      setErrorMessage(messageOf(caught, '이슈 상태를 변경하지 못했습니다.'));
    } finally {
      sendingStatusRef.current.delete(issueId);
    }
  }

  const handleDragStart = useCallback(
    (event: React.DragEvent, issue: IssueSummary) => {
      setDraggingId(issue.issueId);
      didDragRef.current = true;
      // 카드 전체 대신 제목만 따라오게 한다 — 열 사이 이동이 한눈에 보인다
      const ghost = document.createElement('div');
      ghost.textContent = issue.title;
      ghost.style.cssText =
        'position:fixed;top:-999px;background:#3B5BDB;color:#fff;padding:6px 12px;border-radius:8px;font-size:var(--text-detail);font-weight:600;white-space:nowrap';
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, 60, 16);
      event.dataTransfer.effectAllowed = 'move';
      // 다음 프레임에 지운다 — 즉시 지우면 드래그 이미지가 잡히지 않는다
      requestAnimationFrame(() => ghost.remove());
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStatus(null);
    // 클릭 이벤트가 지나간 뒤에 잠금을 푼다
    setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  }, []);

  /** 카드마다 새 함수를 만들지 않도록 대상 ID 를 인자로 받는다 (`IssueCard` 는 memo) */
  const openDetail = useCallback((issueId: number) => {
    // 드래그를 끝낸 직후의 클릭은 무시한다
    if (didDragRef.current) return;
    setOpenModal({ kind: 'detail', issueId });
  }, []);

  const openEdit = useCallback((issueId: number) => {
    setOpenModal({ kind: 'edit', issueId });
  }, []);

  const openDelete = useCallback((issueId: number) => {
    setOpenModal({ kind: 'delete', issueId });
  }, []);

  const draggingIssue = issues?.find((issue) => issue.issueId === draggingId);

  if (hasFailed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-default px-4 py-12">
        <p className="text-label text-text-secondary">
          이슈를 불러오지 못했습니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setFailedStepId(null);
            setReloadCount((count) => count + 1);
          }}
          className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-body-m font-semibold text-text-primary">
            이슈 보드
          </h2>
          {issues && (
            <span className="rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
              총 {issues.length}건
            </span>
          )}
          {draggingIssue && (
            <span className="text-caption font-medium text-text-primary-blue">
              드래그하여 상태 변경
            </span>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            onPointerEnter={() => void loadIssueFormModal()}
            onFocus={() => void loadIssueFormModal()}
            onClick={() => setOpenModal({ kind: 'create' })}
            className="cursor-pointer rounded-lg bg-btn-primary px-3 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover"
          >
            + 이슈 생성
          </button>
        )}
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-red-border bg-red-bg-soft px-3 py-2 text-caption text-text-danger"
        >
          {errorMessage}
        </p>
      )}

      {!issues ? (
        <IssueBoardSkeleton />
      ) : (
        // 열을 세로로 끝까지 늘려 카드가 없는 아래쪽에 놓아도 드롭이 잡히게 한다
        <div className="grid min-h-[60vh] grid-cols-3 items-stretch gap-3">
          {ISSUE_STATUS_ORDER.map((status) => {
            const { badge, dot, columnBg, columnRing } =
              ISSUE_STATUS_STYLES[status];
            // 정렬은 첫 조회에서 끝났다 — 여기서는 목록 순서를 그대로 따른다
            const columnIssues = issues.filter(
              (issue) => issue.status === status,
            );
            const isDropTarget = dragOverStatus === status;
            const showDropHint = Boolean(
              isDropTarget && draggingIssue && draggingIssue.status !== status,
            );

            return (
              <section
                key={status}
                aria-label={ISSUE_STATUS_LABELS[status]}
                onDragOver={(event) => {
                  if (!canEdit) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  // dragover 는 커서를 멈춰도 계속 들어온다.
                  // 값이 그대로일 때 setState 를 부르면 보드 전체가 초당 수십 번 다시 그려진다
                  if (dragOverStatus !== status) setDragOverStatus(status);
                }}
                onDragLeave={(event) => {
                  // 자식(카드) 로 옮겨갈 때도 dragleave 가 뜬다 — 열 밖으로 나갈 때만 지운다
                  const next = event.relatedTarget;
                  if (
                    next instanceof Node &&
                    event.currentTarget.contains(next)
                  ) {
                    return;
                  }
                  if (dragOverStatus === status) setDragOverStatus(null);
                }}
                onDrop={() => {
                  if (draggingId !== null) changeStatus(draggingId, status);
                  handleDragEnd();
                }}
                // 배경 · 테두리만 바꾼다 (ring 은 자리를 차지하지 않아 카드가 밀리지 않는다)
                className={`-m-2 flex flex-col rounded-base p-2 transition-colors ${
                  showDropHint ? `${columnBg} ring-2 ${columnRing}` : ''
                }`}
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-caption font-semibold ${badge}`}
                  >
                    <span className={`size-1.5 rounded-pill ${dot}`} />
                    {ISSUE_STATUS_LABELS[status]}
                  </span>
                  <span className="text-caption text-text-secondary">
                    {columnIssues.length}
                  </span>
                  {showDropHint && (
                    <span className="ml-auto text-caption font-medium text-text-primary-blue">
                      여기에 놓기
                    </span>
                  )}
                </div>

                {/*
                  드롭 자리표시자는 두지 않는다 — 카드 위에 상자가 끼어들면
                  나머지 카드가 아래로 밀려 화면이 흔들린다. 열 색과 머리 문구로만 알린다.
                */}

                {/* 남는 공간까지 이 영역이 차지해야 아래쪽 빈 자리도 드롭 대상이 된다 */}
                <div className="flex flex-1 flex-col gap-2">
                  {columnIssues.map((issue) => (
                    <div
                      key={issue.issueId}
                      ref={moveAnimation.register(issue.issueId)}
                      onPointerEnter={preloadIssueModals}
                      onFocusCapture={preloadIssueModals}
                      className="min-w-0"
                    >
                      <IssueCard
                        issue={issue}
                        canEdit={canEdit}
                        isDragging={draggingId === issue.issueId}
                        onOpen={openDetail}
                        onEdit={openEdit}
                        onDelete={openDelete}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    </div>
                  ))}

                  {columnIssues.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border-default px-3 py-6 text-center text-caption text-text-secondary">
                      이슈가 없습니다.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {openModal?.kind === 'detail' && (
        <IssueDetailModal
          issueId={openModal.issueId}
          canEdit={canEdit}
          onClose={() => setOpenModal(null)}
          onEdit={() =>
            setOpenModal({ kind: 'edit', issueId: openModal.issueId })
          }
          onDelete={() =>
            setOpenModal({ kind: 'delete', issueId: openModal.issueId })
          }
        />
      )}

      {openModal?.kind === 'create' && (
        <IssueFormModal
          projectId={projectId}
          stepId={stepId}
          stepName={stepName}
          onClose={() => setOpenModal(null)}
          onSaved={(created) => {
            addIssue(created);
            setOpenModal(null);
          }}
        />
      )}

      {openModal?.kind === 'edit' && (
        <IssueFormModal
          projectId={projectId}
          stepId={stepId}
          stepName={stepName}
          issueId={openModal.issueId}
          onClose={() => setOpenModal(null)}
          onSaved={(updated) => {
            replaceIssue(updated);
            setOpenModal(null);
          }}
        />
      )}

      {openModal?.kind === 'delete' && (
        <DeleteIssueModal
          issueId={openModal.issueId}
          issueTitle={
            issues?.find((issue) => issue.issueId === openModal.issueId)
              ?.title ?? ''
          }
          onClose={() => setOpenModal(null)}
          onDeleted={(issueId) => {
            removeIssue(issueId);
            setOpenModal(null);
          }}
        />
      )}
    </div>
  );
}
