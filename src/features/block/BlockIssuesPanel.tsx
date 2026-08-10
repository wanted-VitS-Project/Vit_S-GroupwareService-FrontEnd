'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import Modal from '@/components/Modal';
import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { Skeleton, SkeletonGroup } from '@/components/Skeleton';
import { getStepIssues } from '@/features/issue/api';
import {
  IssuePriorityBadge,
  IssueStatusBadge,
} from '@/features/issue/IssueBadges';
import {
  byDueDate,
  ISSUE_STATUS_LABELS,
  type IssueStatus,
  type IssueSummary,
} from '@/features/issue/types';
import { isAbortError, messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';

const loadIssueDetailModal = () => import('@/features/issue/IssueDetailModal');
const IssueDetailModal = dynamic(loadIssueDetailModal, {
  loading: () => (
    <ModalLoadingFallback
      title="이슈 상세"
      className="flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-hidden rounded-2xl border border-border-default p-6 shadow-2xl"
      bodyClassName="h-[460px]"
    />
  ),
});

type StatusFilter = 'ALL' | IssueStatus;

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'TODO', 'IN_PROGRESS', 'DONE'];

export default function BlockIssuesPanel({
  stepId,
  blockId,
  blockTitle,
  onClose,
}: {
  stepId: string;
  blockId: number;
  blockTitle: string;
  onClose: () => void;
}) {
  const [issues, setIssues] = useState<IssueSummary[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getStepIssues(stepId, { blockId, signal: controller.signal })
      .then((next) => setIssues([...next].sort(byDueDate)))
      .catch((caught) => {
        if (!isAbortError(caught)) {
          setError(messageOf(caught, '연결된 이슈를 불러오지 못했습니다.'));
        }
      });

    return () => controller.abort();
  }, [blockId, retryCount, stepId]);

  const filteredIssues =
    issues?.filter(
      (issue) => statusFilter === 'ALL' || issue.status === statusFilter,
    ) ?? null;

  return (
    <>
      <Modal
        title="연결된 이슈"
        onClose={onClose}
        className="mt-auto mr-4 mb-4 ml-auto flex h-[72vh] max-h-[560px] w-[380px] flex-col overflow-hidden rounded-xl border border-border-default shadow-2xl"
        header={
          <div className="flex shrink-0 items-center gap-2 border-b border-border-default px-4 py-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded border border-blue-border-soft bg-blue-bg text-[11px] font-semibold text-text-primary-blue">
              #
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-semibold text-text-primary">
                연결된 이슈
              </h2>
              <p className="truncate text-[10px] text-text-secondary">
                {blockTitle}
              </p>
            </div>
            {issues && (
              <span className="shrink-0 rounded-full bg-blue-bg-soft px-2 py-0.5 text-[10px] font-semibold text-text-primary-blue">
                {issues.length}건
              </span>
            )}
            {!issues && !error && (
              <Skeleton className="h-5 w-10 shrink-0 rounded-full" />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex size-6 cursor-pointer items-center justify-center rounded text-text-secondary hover:bg-bg-hover"
            >
              ✕
            </button>
          </div>
        }
      >
        {issues && issues.length > 0 && (
          <div
            role="group"
            aria-label="이슈 상태 필터"
            className="flex shrink-0 items-center gap-1 border-b border-border-default bg-bg-surface px-3 py-2"
          >
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter;
              const label =
                filter === 'ALL' ? '전체' : ISSUE_STATUS_LABELS[filter];
              const count =
                filter === 'ALL'
                  ? issues.length
                  : issues.filter((issue) => issue.status === filter).length;

              return (
                <button
                  key={filter}
                  type="button"
                  title={`${label} 이슈 ${count}건`}
                  aria-label={`${label} 이슈 ${count}건`}
                  aria-pressed={isActive}
                  onClick={() => setStatusFilter(filter)}
                  className={`relative flex size-8 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
                    isActive
                      ? 'border-border-primary/30 bg-white text-text-primary-blue shadow-sm'
                      : 'border-transparent text-text-muted hover:border-border-default hover:bg-white hover:text-gray-text-soft'
                  }`}
                >
                  <StatusFilterIcon filter={filter} />
                  <span
                    className={`absolute -top-1 -right-1 flex min-w-3.5 items-center justify-center rounded-full px-1 text-[8px] leading-3.5 font-semibold ${
                      isActive
                        ? 'bg-btn-primary text-white'
                        : 'bg-bg-hover-secondary text-text-secondary'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            <span className="ml-auto text-[9px] font-medium text-text-secondary">
              {statusFilter === 'ALL'
                ? '전체'
                : ISSUE_STATUS_LABELS[statusFilter]}
            </span>
          </div>
        )}
        {!issues && !error && (
          <SkeletonGroup
            label="이슈 상태 필터를 불러오는 중"
            className="flex shrink-0 items-center gap-1 border-b border-border-default bg-bg-surface px-3 py-2"
          >
            {[0, 1, 2, 3].map((filter) => (
              <span
                key={filter}
                className="relative flex size-8 items-center justify-center"
              >
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton
                  shape="circle"
                  className="absolute -top-1 -right-1 size-3.5"
                />
              </span>
            ))}
            <Skeleton className="ml-auto h-2.5 w-7" />
          </SkeletonGroup>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {error ? (
            <div className="flex h-full min-h-28 flex-col items-center justify-center gap-2 text-center">
              <p role="alert" className="text-[11px] text-text-danger">
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIssues(null);
                  setError('');
                  setRetryCount((count) => count + 1);
                }}
                className="cursor-pointer text-[10px] font-semibold text-text-primary-blue hover:underline"
              >
                다시 시도
              </button>
            </div>
          ) : !issues ? (
            <SkeletonGroup
              label="연결된 이슈를 불러오는 중"
              className="space-y-2"
            >
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <IssueCardSkeleton key={item} />
                ))}
              </div>
            </SkeletonGroup>
          ) : issues.length === 0 ? (
            <div className="flex h-full min-h-28 flex-col items-center justify-center gap-1 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-bg-hover text-text-secondary">
                #
              </span>
              <p className="text-[11px] text-text-secondary">
                연결된 이슈가 없습니다.
              </p>
              <p className="text-[10px] text-text-muted">
                이슈 생성·수정에서 이 블록을 연결하세요.
              </p>
            </div>
          ) : filteredIssues?.length === 0 ? (
            <div className="flex h-full min-h-28 flex-col items-center justify-center gap-1 text-center">
              <StatusFilterIcon
                filter={statusFilter}
                className="size-6 text-text-muted"
              />
              <p className="text-[11px] text-text-secondary">
                {ISSUE_STATUS_LABELS[statusFilter as IssueStatus]} 이슈가
                없습니다.
              </p>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="cursor-pointer text-[10px] font-semibold text-text-primary-blue hover:underline"
              >
                전체 이슈 보기
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredIssues?.map((issue) => (
                <li key={issue.issueId}>
                  <button
                    type="button"
                    onPointerEnter={() => void loadIssueDetailModal()}
                    onFocus={() => void loadIssueDetailModal()}
                    onClick={() => setSelectedIssueId(issue.issueId)}
                    aria-label={`${issue.title} 이슈 상세 보기`}
                    className="w-full cursor-pointer rounded-lg border border-border-default bg-white p-3 text-left transition-[border-color,box-shadow] hover:border-border-primary/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-primary"
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="text-[9px] text-text-secondary">
                        #{issue.issueId}
                      </span>
                      <IssuePriorityBadge priority={issue.priority} />
                      <span className="ml-auto">
                        <IssueStatusBadge status={issue.status} />
                      </span>
                    </div>
                    <p className="mb-2 text-[11px] leading-snug font-semibold text-text-primary">
                      {issue.title}
                    </p>
                    <div className="flex items-center justify-between gap-2 text-[9px] text-text-secondary">
                      <div className="flex min-w-0 items-center">
                        {issue.assignees.slice(0, 3).map((assignee, index) => (
                          <span
                            key={assignee.userId}
                            className={index > 0 ? '-ml-1' : ''}
                          >
                            <MemberAvatar
                              userId={assignee.userId}
                              name={assignee.name}
                              size="xs"
                              decorative={index > 0}
                            />
                          </span>
                        ))}
                        {issue.assignees.length > 3 && (
                          <span className="ml-1">
                            +{issue.assignees.length - 3}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0">
                        {formatDate(issue.dueDate) || '마감일 없음'}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
      {selectedIssueId !== null && (
        <IssueDetailModal
          issueId={selectedIssueId}
          canEdit={false}
          onClose={() => setSelectedIssueId(null)}
          onEdit={() => undefined}
          onDelete={() => undefined}
        />
      )}
    </>
  );
}

function IssueCardSkeleton() {
  return (
    <div className="rounded-lg border border-border-default bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Skeleton className="h-2.5 w-7" />
        <Skeleton className="h-4 w-11 rounded-full" />
        <Skeleton className="ml-auto h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="mb-1.5 h-3 w-4/5" />
      <Skeleton className="mb-2.5 h-3 w-2/5" />
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Skeleton shape="circle" className="size-5" />
          <Skeleton
            shape="circle"
            className="-ml-1 size-5 border border-white"
          />
        </div>
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

function StatusFilterIcon({
  filter,
  className = 'size-3.5',
}: {
  filter: StatusFilter;
  className?: string;
}) {
  if (filter === 'ALL') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
        className={className}
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (filter === 'TODO') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
        className={className}
      >
        <circle cx="12" cy="12" r="8" />
      </svg>
    );
  }

  if (filter === 'IN_PROGRESS') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden
        className={className}
      >
        <circle cx="12" cy="12" r="8" opacity="0.35" />
        <path d="M12 4a8 8 0 0 1 8 8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}
