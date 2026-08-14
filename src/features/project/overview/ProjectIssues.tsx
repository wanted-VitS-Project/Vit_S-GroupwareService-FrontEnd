'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { personLabel } from '@/components/PersonNote';
import { getProjectIssues } from '@/features/issue/api';
import { IssuePriorityBadge, OverdueBadge } from '@/features/issue/IssueBadges';
import {
  byDueDate,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
  ISSUE_STATUS_STYLES,
  overdueDays,
  type IssueSummary,
  type ProjectIssueStep,
  type ProjectIssuesResponse,
} from '@/features/issue/types';
import { isAbortError } from '@/lib/api';
import { formatDate } from '@/lib/format';

import IssueProgressBar, { IssueProgressCounts } from './IssueProgressBar';
import { ProjectIssuesSkeleton } from './ProjectOverviewSkeletons';
import StageSection from './StageSection';
import { groupByStage, useProjectStages } from './useProjectStages';

const loadIssueDetailModal = () => import('@/features/issue/IssueDetailModal');
const IssueDetailModal = dynamic(loadIssueDetailModal, {
  loading: () => (
    <ModalLoadingFallback
      title="이슈 상세"
      className="flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-hidden rounded-2xl border border-border-default p-6 shadow-2xl"
      bodyClassName="mt-5 h-[460px]"
    />
  ),
});

/**
 * 프로젝트 전체 일정 — 스테이지 > 스텝 아코디언. (명세 108번)
 *
 * 스텝 이슈 보드(`IssueBoard`)와 **역할이 다르다.**
 * 보드는 일을 옮기는 곳이고 여기는 **훑어보는 곳**이다 — 그래서 이 화면은 전부 조회 전용이다.
 * 상태를 바꾸려면 스텝 일정 화면으로 넘어간다 (스텝 머리의 `일정 열기`).
 *
 * ⚠️ 서버가 페이징 · 필터를 하지 않는다. 프로젝트의 모든 이슈가 한 번에 오므로
 *    기본 펼침은 **이슈가 있는 스텝**으로만 제한한다 (빈 스텝까지 펼치면 화면이 길어지기만 한다).
 */
export default function ProjectIssues() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  /** 어느 프로젝트의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    projectId: string;
    data: ProjectIssuesResponse;
  } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  /** 펼쳐 둔 스텝. 스텝 수만큼 불리언을 두지 않고 열린 것만 담는다 */
  const [openStepIds, setOpenStepIds] = useState<Set<number>>(new Set());
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);

  /*
   * 108번 응답에 `stageId` 가 없어 따로 읽는다. 실패해도 목록은 그대로 보인다.
   * 다만 **판정이 끝나기 전에는 그리지 않는다** (`isSettled`) — 색인 없이 먼저 그리면
   * 스텝이 한 덩어리로 늘어섰다가 색인이 도착하는 순간 스테이지별로 다시 묶여
   * 제목이 끼어들고 높이가 바뀐다.
   */
  const { index: stageIndex, isSettled: isStageSettled } =
    useProjectStages(projectId);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectIssues(projectId, signal)
      .then((data) => {
        setLoaded({ projectId, data });
        setFailedProjectId((failed) => (failed === projectId ? null : failed));
      })
      .catch((caught) => {
        // 취소는 실패가 아니다
        if (!isAbortError(caught)) setFailedProjectId(projectId);
      });

    return () => controller.abort();
  }, [projectId, reloadCount]);

  // 다른 프로젝트의 응답은 쓰지 않는다
  const data = loaded?.projectId === projectId ? loaded.data : null;
  const hasFailed = failedProjectId === projectId;

  /*
   * 데이터가 도착하면 이슈가 있는 스텝을 펼친다.
   * (effect 가 아니라 렌더 중 상태 조정 — https://react.dev/reference/react/useState)
   * 프로젝트가 바뀌면 다시 잡아야 하므로 동기화 기준을 `projectId` 로 둔다.
   */
  const [syncedProjectId, setSyncedProjectId] = useState<string | null>(null);
  if (data && syncedProjectId !== projectId) {
    setSyncedProjectId(projectId);
    /*
     * 열려 있던 상세를 닫는다. `IssueDetailModal` 은 `issueId` 만 받으므로,
     * 그대로 두면 **이전 프로젝트의 이슈**가 새 프로젝트 화면 위에 다시 뜬다.
     */
    setSelectedIssueId(null);
    setOpenStepIds(
      new Set(
        data.steps
          .filter((step) => step.totalIssueCount > 0)
          .map((step) => step.stepId),
      ),
    );
  }

  /*
   * `StepAccordion` 은 `memo` 다 — 스텝 하나를 접었다고 나머지 스텝의 이슈 카드가
   * 전부 다시 그려지면 이슈가 많은 프로젝트에서 눈에 띄게 멎는다.
   * 그래서 콜백은 **대상 ID 를 인자로 받는 고정 함수**로 넘긴다 (`IssueCard` 와 같은 규칙).
   */
  const toggleStep = useCallback((stepId: number) => {
    setOpenStepIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(stepId)) next.add(stepId);
      return next;
    });
  }, []);

  const openIssue = useCallback((issueId: number) => {
    setSelectedIssueId(issueId);
  }, []);

  const steps = data?.steps;
  // 스테이지 색인이 늦게 도착하므로 둘 중 하나라도 바뀔 때만 다시 묶는다
  const stageGroups = useMemo(
    () => (steps ? groupByStage(steps, (step) => step.stepId, stageIndex) : []),
    [steps, stageIndex],
  );

  if (hasFailed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-default px-4 py-12">
        <p className="text-label text-text-secondary">
          이슈를 불러오지 못했습니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setFailedProjectId(null);
            setReloadCount((count) => count + 1);
          }}
          className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 스테이지 색인까지 기다렸다가 **묶인 모습으로 한 번에** 그린다
  if (!data || !steps || !isStageSettled) return <ProjectIssuesSkeleton />;

  const { progress } = data;
  const areAllOpen = steps.every((step) => openStepIds.has(step.stepId));

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="프로젝트 전체 진척도"
        className="flex flex-col gap-3 rounded-base border border-border-default bg-bg-card p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-body-m font-semibold text-text-primary">
              전체 일정
            </h2>
            <span className="rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
              총 {progress.totalIssueCount}건
            </span>
          </div>
          <IssueProgressCounts progress={progress} />
        </div>

        <div className="flex items-center gap-2.5">
          <IssueProgressBar progress={progress} className="h-2 flex-1" />
          <span className="w-10 shrink-0 text-right text-label font-medium whitespace-nowrap text-text-primary-blue">
            {/* 이슈가 없으면 `null` 이 온다 — 0% 로 그리면 '다 못 끝냈다' 로 읽힌다 */}
            {progress.progressRate === null ? '—' : `${progress.progressRate}%`}
          </span>
        </div>
      </section>

      {steps.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-4 py-12 text-center text-label text-text-secondary">
          등록된 스텝이 없습니다.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption text-text-secondary">
              스텝 {steps.length}개 · 머리를 눌러 접거나 펼칩니다
            </p>
            <button
              type="button"
              onClick={() =>
                setOpenStepIds(
                  areAllOpen
                    ? new Set()
                    : new Set(steps.map((step) => step.stepId)),
                )
              }
              className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
            >
              {areAllOpen ? '모두 접기' : '모두 펼치기'}
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {stageGroups.map((group) => (
              <StageSection
                key={group.stageId}
                name={group.name}
                count={group.items.reduce(
                  (total, step) => total + step.totalIssueCount,
                  0,
                )}
                countLabel="건"
              >
                {group.items.map((step) => (
                  <StepAccordion
                    key={step.stepId}
                    projectId={projectId}
                    step={step}
                    isOpen={openStepIds.has(step.stepId)}
                    onToggle={toggleStep}
                    onOpenIssue={openIssue}
                  />
                ))}
              </StageSection>
            ))}
          </div>
        </>
      )}

      {selectedIssueId !== null && (
        /*
         * 조회 전용으로 연다 — 이 화면에는 수정 · 삭제 진입점이 없다.
         * (`BlockIssuesPanel` 이 쓰는 방식과 같다)
         */
        <IssueDetailModal
          issueId={selectedIssueId}
          canEdit={false}
          onClose={() => setSelectedIssueId(null)}
          onEdit={() => undefined}
          onDelete={() => undefined}
        />
      )}
    </div>
  );
}

/**
 * 스텝 하나 — 머리에 진척도, 펼치면 이슈 3열.
 *
 * `memo` 로 감싼다 — 다른 스텝을 접었다 펼 때마다 이 스텝의 카드까지 다시 그리면
 * 이슈가 많은 프로젝트에서 클릭이 무거워진다. 그래서 `onToggle` 은 **대상 ID 를 받는**
 * 고정 함수다 (스텝마다 새 화살표 함수를 넘기면 `memo` 가 무력해진다).
 */
const StepAccordion = memo(function StepAccordion({
  projectId,
  step,
  isOpen,
  onToggle,
  onOpenIssue,
}: {
  projectId: string;
  step: ProjectIssueStep;
  isOpen: boolean;
  onToggle: (stepId: number) => void;
  onOpenIssue: (issueId: number) => void;
}) {
  /*
   * 정렬은 서버가 하지 않는다 — 보드 첫 조회와 같은 규칙(마감일 순 · 미지정 마지막).
   * 접혀 있을 때도 계산하지 않도록 `isOpen` 을 조건에 넣는다.
   */
  const issues = useMemo(
    () => (isOpen ? [...step.issues].sort(byDueDate) : []),
    [step.issues, isOpen],
  );

  return (
    <section className="overflow-hidden rounded-base border border-border-default bg-bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => onToggle(step.stepId)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <ChevronIcon isOpen={isOpen} />
          <span
            className={`truncate text-[13px] font-semibold ${
              isOpen ? 'text-text-primary-blue' : 'text-text-primary'
            }`}
          >
            {step.stepName}
          </span>
          <span className="shrink-0 rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
            {step.doneIssueCount}/{step.totalIssueCount}
          </span>
        </button>

        {/* 머리를 접어도 진척도는 계속 보인다 — 접는 이유(한눈에 보기)가 사라지면 안 된다 */}
        <div className="hidden w-40 shrink-0 items-center gap-2 sm:flex">
          <IssueProgressBar progress={step} className="h-1.5 flex-1" />
          <span
            /* `100%` 가 들어갈 만큼은 넓혀 둔다 — 좁으면 숫자와 `%` 가 두 줄로 갈린다 */
            className={`w-9 shrink-0 text-right text-detail font-medium whitespace-nowrap ${
              step.progressRate === null
                ? 'text-text-muted'
                : 'text-text-primary-blue'
            }`}
          >
            {step.progressRate === null ? '—' : `${step.progressRate}%`}
          </span>
        </div>

        {/* 이 화면은 조회 전용이다 — 고치려면 스텝 일정 화면으로 넘어간다 */}
        <Link
          href={`/projects/${projectId}/steps/${step.stepId}/issue`}
          className="shrink-0 rounded-button-sm px-2 py-1 text-detail font-medium text-text-secondary hover:bg-bg-surface hover:text-text-primary-blue"
        >
          일정 열기
        </Link>
      </div>

      {isOpen &&
        (issues.length === 0 ? (
          <p className="border-t border-border-default px-4 py-6 text-center text-detail text-text-secondary">
            등록된 이슈가 없습니다.
          </p>
        ) : (
          /*
           * 스텝 이슈 보드와 **같은 3열 칸반**으로 펼친다 — 두 화면에서 같은 이슈를
           * 다른 배열로 보면 어느 쪽이 정본인지 흐려진다.
           * 다만 여기는 조회 전용이라 드래그 · 드롭 대상 강조는 없다.
           */
          <div className="grid grid-cols-3 items-start gap-3 border-t border-border-default bg-bg-surface/60 p-3">
            {ISSUE_STATUS_ORDER.map((status) => {
              const { badge, dot } = ISSUE_STATUS_STYLES[status];
              const columnIssues = issues.filter(
                (issue) => issue.status === status,
              );

              return (
                <section key={status} aria-label={ISSUE_STATUS_LABELS[status]}>
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
                  </div>

                  <ul className="flex flex-col gap-2">
                    {columnIssues.map((issue) => (
                      <li key={issue.issueId} className="min-w-0">
                        <IssueRow issue={issue} onOpen={onOpenIssue} />
                      </li>
                    ))}
                  </ul>

                  {columnIssues.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border-default px-3 py-6 text-center text-caption text-text-secondary">
                      이슈가 없습니다.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        ))}
    </section>
  );
});

/**
 * 이슈 한 건 — 조회 전용 카드. 누르면 상세 모달이 열린다.
 *
 * 상태 배지는 없다 — **어느 열에 있는지가 곧 상태**다 (보드의 `IssueCard` 와 같은 규칙).
 * `memo` 인 이유도 같다 — 스텝을 여닫을 때 다른 스텝의 카드까지 다시 그리지 않는다.
 */
const IssueRow = memo(function IssueRow({
  issue,
  onOpen,
}: {
  issue: IssueSummary;
  onOpen: (issueId: number) => void;
}) {
  return (
    <button
      type="button"
      // 열기 직전 신호 — 여기서 상세 모달 청크를 미리 받아 둔다
      onPointerEnter={() => void loadIssueDetailModal()}
      onFocus={() => void loadIssueDetailModal()}
      onClick={() => onOpen(issue.issueId)}
      aria-label={`${issue.title} 이슈 상세 보기`}
      className="h-full w-full cursor-pointer rounded-lg border border-border-default bg-bg-card p-3 text-left transition-[border-color,box-shadow] hover:border-border-primary/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-primary"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <IssuePriorityBadge priority={issue.priority} />
        <OverdueBadge days={overdueDays(issue)} />
        <span className="ml-auto text-micro text-text-secondary">
          #{issue.issueId}
        </span>
      </div>

      <p className="mb-2 line-clamp-2 text-detail leading-snug font-semibold text-text-primary">
        {issue.title}
      </p>

      <div className="flex items-center justify-between gap-2 text-micro text-text-secondary">
        <span className="flex min-w-0 items-center">
          {issue.assignees.slice(0, 3).map((assignee, index) => (
            <span
              key={assignee.userId}
              /*
               * 겹친 아바타라 문구 자리가 없다 — 흐리게 + tooltip 으로 알린다.
               * 뒤쪽 아바타는 `decorative` 라 아바타 자체가 `aria-hidden` 이다.
               * `title` 만으로는 접근성 이름이 되지 않으므로 감싼 쪽이 대신 읽힌다.
               */
              {...(index > 0
                ? {
                    role: 'img',
                    'aria-label': personLabel(
                      assignee.name,
                      assignee.resignedAt !== null,
                    ),
                  }
                : {})}
              title={personLabel(assignee.name, assignee.resignedAt !== null)}
              className={index > 0 ? '-ml-1' : ''}
            >
              <MemberAvatar
                userId={assignee.userId}
                name={assignee.name}
                size="xs"
                decorative={index > 0}
                resigned={assignee.resignedAt !== null}
              />
            </span>
          ))}
          {issue.assignees.length > 3 && (
            <span className="ml-1">+{issue.assignees.length - 3}</span>
          )}
          {issue.assignees.length === 0 && <span>담당자 없음</span>}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {issue.relatedBlocks.length > 0 && (
            <span title={`연결된 블록 ${issue.relatedBlocks.length}개`}>
              🔗 {issue.relatedBlocks.length}
            </span>
          )}
          <span>{formatDate(issue.dueDate) || '마감일 없음'}</span>
        </span>
      </div>
    </button>
  );
});

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`size-4 shrink-0 text-text-muted transition-transform ${
        isOpen ? 'rotate-90' : ''
      }`}
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}
