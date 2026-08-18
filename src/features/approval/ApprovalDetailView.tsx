'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApprovalDetailSkeleton } from '@/components/approval/ApprovalSkeletons';
import LoadingSpinner, { Spinner } from '@/components/Spinner';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { formatFileSize } from '@/features/file/format';
import { ApiError, messageOf } from '@/lib/api';

import { getApproval, getRevision, getRevisions } from './api';
import ApprovalDocumentModal from './ApprovalDocumentModal';
import ApprovalProcessModal, { type ProcessKind } from './ApprovalProcessModal';
import ApprovalStatusBadge from './ApprovalStatusBadge';
import ApprovalTimeline from './ApprovalTimeline';
import { APPROVAL_CODES } from './errorCodes';
import { formatDateTime } from './format';
import { APPROVAL_ROUTES } from './routes';
import type {
  ApprovalDetail,
  ApprovalDocument,
  ApprovalRevisionSummary,
  ApproveLineResponse,
  RejectLineResponse,
} from './types';

/** 화면이 그리는 회차 하나. 현재 회차와 지난 회차를 같은 모양으로 다룬다 */
type ViewedRevision = Omit<ApprovalDetail, 'blockOrigin'>;

/** 조회 실패. 없는 결재와 그 외를 나눈다 */
type Failure = 'notFound' | 'other';

function failureOf(error: unknown): Failure {
  return error instanceof ApiError && error.code === APPROVAL_CODES.notFound
    ? 'notFound'
    : 'other';
}

/**
 * 결재 상세 화면. 처리 버튼은 내 차례일 때만 나온다.
 * 상세 API 는 항상 현재 회차를 주므로 지난 회차는 회차 상세로 따로 받는다.
 */
export default function ApprovalDetailView({
  approvalId,
}: {
  approvalId: number;
}) {
  const user = useCurrentUser();
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [failureMessage, setFailureMessage] = useState('');
  /** 열려 있는 처리 모달. null 이면 닫힌 상태 */
  const [processKind, setProcessKind] = useState<ProcessKind | null>(null);
  /** 미리보기로 열어 둔 결재 문서 */
  const [openedDocument, setOpenedDocument] = useState<ApprovalDocument | null>(
    null,
  );
  /** 회차 목록. 1회차뿐이면 전환 UI 를 그리지 않는다 */
  const [revisions, setRevisions] = useState<ApprovalRevisionSummary[]>([]);
  /** 보고 있는 지난 회차. null 이면 현재 회차를 본다 */
  const [pastRevisionId, setPastRevisionId] = useState<number | null>(null);
  const [pastRevision, setPastRevision] = useState<ViewedRevision | null>(null);
  const [pastError, setPastError] = useState('');

  /** 처리 결과를 화면에 반영한다. 응답이 다음 상태를 알려줘 재조회하지 않는다 */
  function applyProcessed(
    kind: ProcessKind,
    result: ApproveLineResponse | RejectLineResponse,
    opinion: string,
  ) {
    setApproval((prev) => {
      if (!prev) return prev;

      const lines = prev.lines.map((line) => {
        if (line.lineId === result.lineId) {
          return {
            ...line,
            status: result.status,
            opinion: opinion || null,
            processedAt: result.processedAt,
          };
        }
        if (
          kind === 'approve' &&
          'nextActiveLineId' in result &&
          line.lineId === result.nextActiveLineId
        ) {
          return { ...line, status: 'ACTIVE' as const };
        }
        // 반려하면 아직 처리되지 않은 이후 단계가 모두 취소된다
        if (kind === 'reject' && line.status === 'WAITING') {
          return { ...line, status: 'CANCELED' as const };
        }
        return line;
      });

      const isCompleted =
        'approvalCompleted' in result && result.approvalCompleted;

      return {
        ...prev,
        lines,
        status:
          kind === 'reject'
            ? 'REJECTED'
            : isCompleted
              ? 'COMPLETED'
              : prev.status,
      };
    });

    setProcessKind(null);
  }

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getApproval(approvalId, signal)
      .then((data) => {
        setApproval(data);
        setFailure(null);
      })
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;
        setFailure(failureOf(caught));
        setFailureMessage(messageOf(caught, '결재를 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [approvalId]);

  /** 회차 목록. 실패하면 전환 UI 만 빠지고 현재 회차는 그대로 보인다 */
  useEffect(() => {
    const controller = new AbortController();

    getRevisions(approvalId, controller.signal)
      .then((data) => setRevisions(data.content))
      .catch(() => setRevisions([]));

    return () => controller.abort();
  }, [approvalId]);

  /** 회차를 고른다. 직전 회차의 내용 · 실패 문구도 여기서 비운다 */
  function selectRevision(revisionId: number | null) {
    // 보고 있는 회차를 다시 누르면 비우지 않고 그대로 둔다
    if (revisionId === pastRevisionId) return;

    setPastRevisionId(revisionId);
    setPastRevision(null);
    setPastError('');
  }

  /** 고른 지난 회차의 내용. 이력 응답에 없는 값이라 따로 받는다 */
  useEffect(() => {
    if (pastRevisionId === null) return;

    const controller = new AbortController();
    const { signal } = controller;

    getRevision(approvalId, pastRevisionId, signal)
      .then(setPastRevision)
      .catch((caught: unknown) => {
        if (signal.aborted) return;
        setPastError(messageOf(caught, '회차를 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [approvalId, pastRevisionId]);

  if (failure) {
    return <FailureView kind={failure} message={failureMessage} />;
  }
  if (!approval) return <ApprovalDetailSkeleton />;

  const isPast = pastRevisionId !== null;
  /** 지난 회차를 고르면 그 회차를, 아니면 현재 회차를 그린다 */
  const viewing: ViewedRevision | null = isPast ? pastRevision : approval;

  const myLine = approval.lines.find((line) => line.approverId === user.userId);
  /** 처리 버튼은 내 차례일 때만 나온다. 지난 회차는 처리할 수 없다 */
  const isMyTurn = !isPast && myLine?.status === 'ACTIVE';
  const isDrafter = approval.drafterId === user.userId;

  /** 지난 회차를 받는 동안 머리말을 채울 값. 이력 요약에서 가져온다 */
  const selected = revisions.find(
    (revision) => revision.revisionId === pastRevisionId,
  );
  const headerStatus = viewing?.status ?? selected?.status ?? approval.status;
  const headerRevisionNo =
    viewing?.revisionNo ?? selected?.revisionNo ?? approval.revisionNo;

  const doneCount =
    viewing?.lines.filter((line) => line.status === 'APPROVED').length ?? 0;

  return (
    <>
      <p className="text-label text-text-secondary">
        <Link
          href={APPROVAL_ROUTES.list}
          className="hover:text-text-primary hover:underline"
        >
          결재
        </Link>{' '}
        &gt; 결재 상세
      </p>

      <div className="mt-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ApprovalStatusBadge status={headerStatus} />
            {headerRevisionNo > 1 && (
              <span className="rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-detail text-text-secondary">
                {headerRevisionNo}회차
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-heading-m font-bold break-keep">
            {/* 제목은 이력 요약에 없어 회차가 도착해야 알 수 있다 */}
            {viewing ? (
              viewing.title || '제목 없음'
            ) : (
              <>
                <Spinner className="inline-block size-4 align-middle" />
                {/* 스피너는 보조기술에 읽히지 않아 대체 문구를 둔다 */}
                <span className="sr-only">제목을 불러오는 중</span>
              </>
            )}
          </h2>
          <p className="mt-1.5 text-label text-text-secondary">
            {approval.drafterName}
            {approval.drafterPosition && ` ${approval.drafterPosition}`}
            {approval.drafterDepartment && ` · ${approval.drafterDepartment}`}
            {isDrafter && ' · 내가 기안'}
          </p>
        </div>
      </div>

      {/* 재상신된 적이 없으면 고를 게 없다 */}
      {revisions.length > 1 && (
        <RevisionTabs
          revisions={revisions}
          pastRevisionId={pastRevisionId}
          onSelect={selectRevision}
        />
      )}

      {isPast && (
        <p className="mt-3 rounded-lg border border-border-primary/20 bg-blue-bg-soft px-3 py-2 text-label break-keep text-text-primary-blue">
          ⓘ 지난 회차를 보고 있습니다. 이미 끝난 이력이라 처리할 수 없습니다.
        </p>
      )}

      {/* 지난 회차는 따로 받아오므로 도착 전까지 본문을 그릴 수 없다 */}
      {!viewing ? (
        pastError === '' ? (
          <LoadingSpinner label="회차를 불러오는 중" className="mt-6 py-16" />
        ) : (
          <p className="mt-6 text-label break-keep text-text-danger">
            {pastError}
          </p>
        )
      ) : (
        <RevisionBody
          viewing={viewing}
          doneCount={doneCount}
          isMyTurn={isMyTurn}
          currentUserId={user.userId}
          onOpenDocument={setOpenedDocument}
          onProcess={setProcessKind}
        />
      )}

      {openedDocument && (
        <ApprovalDocumentModal
          document={openedDocument}
          onClose={() => setOpenedDocument(null)}
        />
      )}

      {processKind && myLine && (
        <ApprovalProcessModal
          kind={processKind}
          lineId={myLine.lineId}
          onClose={() => setProcessKind(null)}
          onProcessed={applyProcessed}
        />
      )}
    </>
  );
}

/** 회차 전환 탭. 응답이 오름차순이라 그대로 늘어놓는다 */
function RevisionTabs({
  revisions,
  pastRevisionId,
  onSelect,
}: {
  revisions: ApprovalRevisionSummary[];
  pastRevisionId: number | null;
  onSelect: (revisionId: number | null) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {revisions.map((revision) => {
        /* 현재 회차는 pastRevisionId 가 null 인 상태로 표현한다 */
        const isSelected = revision.isCurrent
          ? pastRevisionId === null
          : pastRevisionId === revision.revisionId;

        return (
          <button
            key={revision.revisionId}
            type="button"
            aria-current={isSelected}
            onClick={() =>
              onSelect(revision.isCurrent ? null : revision.revisionId)
            }
            className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-detail font-semibold ${
              isSelected
                ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
                : 'border-border-default text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {revision.revisionNo}회차
            {revision.isCurrent && ' · 현재'}
            {/* 상신 전 회차는 날짜가 없어 줄이 접힌다 */}
            <span className="ml-1 font-normal text-text-secondary empty:hidden">
              {revision.submittedAt
                ? formatDateTime(revision.submittedAt, '')
                : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 회차 본문. 현재 회차든 지난 회차든 같은 모양으로 그린다 */
function RevisionBody({
  viewing,
  doneCount,
  isMyTurn,
  currentUserId,
  onOpenDocument,
  onProcess,
}: {
  viewing: ViewedRevision;
  doneCount: number;
  isMyTurn: boolean;
  currentUserId: string;
  onOpenDocument: (document: ApprovalDocument) => void;
  onProcess: (kind: ProcessKind) => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-4 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Card title="결재 내용">
          <p className="text-label leading-relaxed break-keep whitespace-pre-wrap text-text-primary">
            {viewing.content || '내용 없음'}
          </p>
        </Card>

        <Card title="결재 문서">
          {viewing.documents.length === 0 ? (
            <p className="text-label text-text-secondary">
              첨부된 문서가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {viewing.documents.map((document) => (
                <li key={document.documentId}>
                  <button
                    type="button"
                    onClick={() => onOpenDocument(document)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border-default px-3 py-2.5 text-left hover:bg-bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label text-text-primary">
                        {/* 파일명은 회차마다 확정된 버전의 것이다 */}
                        {document.fileName ??
                          `파일 버전 #${document.fileVersionId}`}
                      </p>
                      <p className="mt-0.5 text-detail text-text-secondary">
                        {document.fileSize !== undefined &&
                          formatFileSize(document.fileSize)}
                      </p>
                    </div>
                    <span className="shrink-0 text-detail font-semibold text-text-primary-blue">
                      보기
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="w-full shrink-0 lg:w-72">
        <Card title={`결재선 ${doneCount} / ${viewing.lines.length}`}>
          <ApprovalTimeline
            lines={viewing.lines}
            currentUserId={currentUserId}
          />

          {isMyTurn && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onProcess('reject')}
                className="flex-1 cursor-pointer rounded-lg border border-border-danger/30 py-2 text-label font-semibold text-text-danger hover:bg-red-bg-soft"
              >
                반려
              </button>
              <button
                type="button"
                onClick={() => onProcess('approve')}
                className="btn btn-md btn-primary flex-1"
              >
                승인
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-base border border-border-default p-4">
      <h3 className="mb-3 text-label font-semibold text-text-primary">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** 실패 화면. 백엔드 문구를 그대로 쓰고 목록으로 돌려보낸다 */
function FailureView({ kind, message }: { kind: Failure; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-base border border-border-default py-20 text-center">
      <span aria-hidden className="text-heading-xl">
        📄
      </span>

      <p className="mt-3 text-body-m font-semibold text-text-primary">
        {kind === 'notFound'
          ? '결재를 찾을 수 없습니다'
          : '결재를 불러오지 못했습니다'}
      </p>
      <p className="mt-1.5 text-label break-keep text-text-secondary">
        {message}
      </p>

      <Link
        href={APPROVAL_ROUTES.list}
        className="mt-4 rounded-lg border border-border-default px-3 py-1.5 text-label font-semibold text-text-primary hover:bg-bg-hover"
      >
        결재 목록으로
      </Link>
    </div>
  );
}
