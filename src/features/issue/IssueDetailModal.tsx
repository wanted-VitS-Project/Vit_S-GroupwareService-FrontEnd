'use client';

import { useEffect, useState } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import Modal from '@/components/Modal';
import PersonNote from '@/components/PersonNote';
import LoadingSpinner from '@/components/Spinner';
import { isAbortError, messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';

import { getIssue } from './api';
import {
  IssueBlockIcon,
  IssuePriorityBadge,
  IssueStatusBadge,
  OverdueBadge,
  OverduePill,
} from './IssueBadges';
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
  ISSUE_STATUS_STYLES,
  overdueDays,
  type IssueDetail,
} from './types';

/** 섹션 제목 — 상세 모달에서만 쓰는 작은 라벨 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-caption font-semibold tracking-[0.5px] text-text-secondary uppercase">
      {children}
    </div>
  );
}

/** 날짜 앞 달력 아이콘 */
function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6C7389"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
      className="size-3.5 shrink-0"
    >
      <path d="M8 2v4M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

/**
 * 이슈 상세. 목록 응답에는 `content` 가 없어 열릴 때 상세를 따로 조회한다. (명세 57번)
 *
 * ⚠️ 상태는 **보여주기만** 한다. 변경은 보드에서 드래그로만 한다.
 */
export default function IssueDetailModal({
  issueId,
  canEdit,
  onClose,
  onEdit,
  onDelete,
}: {
  issueId: number;
  /** 스텝 `EDITOR` 인지 — 아니면 수정 · 삭제 버튼을 감춘다 */
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  /**
   * 어느 이슈의 응답인지 함께 담는다 — `issueId` 가 바뀌면 즉시 무효가 되어
   * 새 이슈를 불러오는 동안 **이전 이슈의 제목 · 버튼이 남지 않는다.**
   */
  const [loaded, setLoaded] = useState<{
    issueId: number;
    issue: IssueDetail;
  } | null>(null);
  /** 실패는 로딩과 구분한다 — null 로 두면 스켈레톤이 영원히 돈다 */
  const [failed, setFailed] = useState<{
    issueId: number;
    message: string;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getIssue(issueId, controller.signal)
      .then((issue) => {
        setLoaded({ issueId, issue });
        setFailed((prev) => (prev?.issueId === issueId ? null : prev));
      })
      .catch((caught) => {
        if (isAbortError(caught)) return;
        setFailed({
          issueId,
          message: messageOf(caught, '이슈를 불러오지 못했습니다.'),
        });
      });

    return () => controller.abort();
  }, [issueId, retryCount]);

  const issue = loaded?.issueId === issueId ? loaded.issue : null;
  const failure = failed?.issueId === issueId ? failed.message : null;

  const overdue = issue ? overdueDays(issue) : 0;
  // 완료 시각은 'YYYY-MM-DDTHH:mm:ss' 로 온다 — 종료일은 날짜만 쓴다
  const finishedOn = issue?.completedAt
    ? formatDate(issue.completedAt.slice(0, 10))
    : '';

  return (
    <Modal
      title="이슈 상세"
      onClose={onClose}
      className="flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
      header={
        <div className="flex shrink-0 items-start gap-3 border-b border-border-default px-6 py-4">
          <div className="min-w-0 flex-1">
            {issue ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-caption text-text-secondary">
                    #{issue.issueId}
                  </span>
                  <IssueStatusBadge status={issue.status} />
                  <IssuePriorityBadge priority={issue.priority} withPrefix />
                  <OverdueBadge days={overdue} />
                </div>
                <h2 className="pt-1 text-body-l leading-snug font-semibold text-text-primary">
                  {issue.title}
                </h2>
              </>
            ) : failure ? (
              <h2 className="text-body-l font-semibold text-text-primary">
                이슈 상세
              </h2>
            ) : (
              // 헤더는 본문 스피너가 이미 로딩을 알린다 — 제목만 그대로 둔다
              <h2 className="text-body-l font-semibold text-text-primary">
                이슈 상세
              </h2>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {canEdit && issue && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="cursor-pointer rounded-lg border border-border-default px-3 py-1.5 text-detail font-medium text-text-primary hover:bg-bg-hover"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="cursor-pointer rounded-lg border border-red-border px-3 py-1.5 text-detail font-medium text-text-danger hover:bg-red-bg-soft"
                >
                  삭제
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="ml-1 flex size-7 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:bg-bg-hover"
            >
              ✕
            </button>
          </div>
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {failure ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12">
            <p role="alert" className="text-label text-text-danger">
              {failure}
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
        ) : !issue ? (
          <LoadingSpinner label="이슈 상세를 불러오는 중" className="py-20" />
        ) : (
          <div className="grid grid-cols-[1fr_220px]">
            <div className="flex flex-col gap-5 border-r border-border-default p-6">
              <div>
                <SectionLabel>이슈 설명</SectionLabel>
                {issue.content ? (
                  <p className="pt-2 text-detail leading-relaxed whitespace-pre-wrap text-text-primary">
                    {issue.content}
                  </p>
                ) : (
                  <p className="pt-2 text-label text-text-muted italic">
                    설명 없음
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <SectionLabel>마감일</SectionLabel>
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <CalendarIcon />
                    <span className="text-detail font-medium text-text-primary">
                      {formatDate(issue.dueDate) || '-'}
                    </span>
                  </div>
                </div>
                <div>
                  <SectionLabel>종료일</SectionLabel>
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <CalendarIcon />
                    <span className="text-detail font-medium text-text-primary">
                      {finishedOn || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <SectionLabel>현재 상태</SectionLabel>
                {/* 표시 전용이다 — 상태 변경은 보드 드래그로만 한다 */}
                <div className="flex gap-2 pt-2">
                  {ISSUE_STATUS_ORDER.map((status) => {
                    const isCurrent = issue.status === status;

                    return (
                      <span
                        key={status}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`flex-1 rounded-lg border py-1.5 text-center text-detail font-medium ${
                          isCurrent
                            ? ISSUE_STATUS_STYLES[status].badge
                            : 'border-border-default text-text-secondary'
                        }`}
                      >
                        {ISSUE_STATUS_LABELS[status]}
                      </span>
                    );
                  })}
                </div>
                <p className="pt-1.5 text-caption text-text-secondary">
                  상태는 보드에서 카드를 끌어 옮겨 변경합니다.
                </p>
              </div>

              <div>
                <SectionLabel>연결된 블록</SectionLabel>
                {issue.relatedBlocks.length === 0 ? (
                  <p className="pt-2 text-label text-text-secondary">
                    연결된 블록 없음
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 pt-2">
                    {issue.relatedBlocks.map((block) => (
                      <div
                        key={block.blockId}
                        className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface p-2"
                      >
                        <IssueBlockIcon type={block.type} />
                        <span className="flex-1 truncate text-detail font-medium text-text-primary">
                          {block.title || '제목 없음'}
                        </span>
                        <span className="text-micro text-text-secondary">
                          {block.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-5 bg-bg-surface p-5">
              <div>
                <SectionLabel>담당자</SectionLabel>
                {issue.assignees.length === 0 ? (
                  <p className="pt-2 text-detail text-text-secondary">
                    지정 전
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 pt-2">
                    {issue.assignees.map((assignee) => (
                      <div
                        key={assignee.userId}
                        className="flex items-center gap-2"
                      >
                        <MemberAvatar
                          userId={assignee.userId}
                          name={assignee.name}
                          decorative
                          resigned={assignee.resignedAt !== null}
                        />
                        {/* 퇴사자여도 항목을 빼지 않는다 — 이름 뒤에 문구만 붙인다 */}
                        <span className="flex items-center gap-0.5">
                          <span className="text-label font-medium text-text-primary">
                            {assignee.name}
                          </span>
                          {assignee.resignedAt && <PersonNote />}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <SectionLabel>우선순위</SectionLabel>
                <div className="pt-2">
                  <IssuePriorityBadge priority={issue.priority} />
                </div>
              </div>

              <div>
                <SectionLabel>연결 블록</SectionLabel>
                <p className="pt-2 text-label font-medium text-text-primary">
                  {issue.relatedBlocks.length}개
                </p>
              </div>

              <div>
                <SectionLabel>이슈 ID</SectionLabel>
                <p className="pt-2 text-label font-medium text-text-primary">
                  #{issue.issueId}
                </p>
              </div>

              {overdue > 0 && <OverduePill days={overdue} />}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
