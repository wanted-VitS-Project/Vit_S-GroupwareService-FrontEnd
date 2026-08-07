'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApprovalDetailSkeleton } from '@/components/approval/ApprovalSkeletons';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { formatFileSize } from '@/features/file/format';
import { ApiError, messageOf } from '@/lib/api';

import { getApproval } from './api';
import ApprovalDocumentModal from './ApprovalDocumentModal';
import ApprovalProcessModal, { type ProcessKind } from './ApprovalProcessModal';
import ApprovalStatusBadge from './ApprovalStatusBadge';
import ApprovalTimeline from './ApprovalTimeline';
import { APPROVAL_CODES } from './errorCodes';
import { APPROVAL_ROUTES } from './routes';
import type {
  ApprovalDetail,
  ApprovalDocument,
  ApproveLineResponse,
  RejectLineResponse,
} from './types';

/**
 * 조회 실패. 없는 결재와 그 외를 나눈다.
 *
 * ℹ️ 차례가 오지 않은 결재자(403)는 전용 화면을 두지 않는다 — 목록에 뜨지 않아
 * 눌러서 올 길이 없고, URL 직접 접근은 백엔드 문구가 더 정확하다.
 */
type Failure = 'notFound' | 'other';

function failureOf(error: unknown): Failure {
  return error instanceof ApiError && error.code === APPROVAL_CODES.notFound
    ? 'notFound'
    : 'other';
}

/**
 * 결재 상세 화면. (AP-035~040·077)
 *
 * 처리 버튼은 **내 차례일 때만** 나오고, 그 밖의 경우(기안자 · 완료 · 반려)는 조회만 된다.
 *
 * ⚠️ 이 API 는 **항상 현재 회차**를 준다. 이전 회차 이력은 #62 에서 붙인다.
 * ℹ️ `원본 블록 보기`(AP-079)는 쓰지 않기로 해 `blockOrigin` 을 받기만 하고 그리지 않는다.
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

  /**
   * 처리 결과를 화면에 반영한다. 응답이 다음 상태를 알려주므로 **재조회하지 않는다** —
   * `nextActiveLineId` 로 다음 차례를, `approvalCompleted` 로 완료를 알 수 있다.
   */
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
        // 반려하면 아직 처리되지 않은 이후 단계가 모두 취소된다 (AP-056)
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

  if (failure) {
    return <FailureView kind={failure} message={failureMessage} />;
  }
  if (!approval) return <ApprovalDetailSkeleton />;

  const myLine = approval.lines.find((line) => line.approverId === user.userId);
  /** 처리 버튼은 **내 차례일 때만** 나온다 — 이미 처리했으면 다시 못 한다 (AP-040) */
  const isMyTurn = myLine?.status === 'ACTIVE';
  const isDrafter = approval.drafterId === user.userId;
  const doneCount = approval.lines.filter(
    (line) => line.status === 'APPROVED',
  ).length;

  return (
    <>
      <p className="text-xs text-slate-500">
        <Link
          href={APPROVAL_ROUTES.list}
          className="hover:text-[#1C1F2A] hover:underline"
        >
          결재
        </Link>{' '}
        &gt; 결재 상세
      </p>

      <div className="mt-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ApprovalStatusBadge status={approval.status} />
            {approval.revisionNo > 1 && (
              <span className="rounded bg-[#ECEEF4] px-1.5 py-0.5 text-[11px] text-[#6C7389]">
                {approval.revisionNo}회차
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-lg font-bold break-keep">
            {approval.title || '제목 없음'}
          </h2>
          <p className="mt-1.5 text-xs text-[#6C7389]">
            {approval.drafterName}
            {approval.drafterPosition && ` ${approval.drafterPosition}`}
            {approval.drafterDepartment && ` · ${approval.drafterDepartment}`}
            {isDrafter && ' · 내가 기안'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card title="결재 내용">
            <p className="text-xs leading-relaxed break-keep whitespace-pre-wrap text-[#1C1F2A]">
              {approval.content || '내용 없음'}
            </p>
          </Card>

          <Card title="결재 문서">
            {approval.documents.length === 0 ? (
              <p className="text-xs text-[#6C7389]">첨부된 문서가 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {approval.documents.map((document) => (
                  <li key={document.documentId}>
                    <button
                      type="button"
                      onClick={() => setOpenedDocument(document)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[#1C1F2A]/10 px-3 py-2.5 text-left hover:bg-[#ECEEF4]/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-[#1C1F2A]">
                          {/* 파일명은 회차마다 확정된 버전의 것이다 (AP-013) */}
                          {document.fileName ??
                            `파일 버전 #${document.fileVersionId}`}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#6C7389]">
                          {document.fileSize !== undefined &&
                            formatFileSize(document.fileSize)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-[#3B5BDB]">
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
          <Card title={`결재선 ${doneCount} / ${approval.lines.length}`}>
            <ApprovalTimeline
              lines={approval.lines}
              currentUserId={user.userId}
            />

            {isMyTurn && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProcessKind('reject')}
                  className="flex-1 cursor-pointer rounded-lg border border-[#E7000B]/30 py-2 text-xs font-semibold text-[#E7000B] hover:bg-[#FEF2F2]"
                >
                  반려
                </button>
                <button
                  type="button"
                  onClick={() => setProcessKind('approve')}
                  className="flex-1 cursor-pointer rounded-lg bg-[#4F39F6] py-2 text-xs font-semibold text-white hover:bg-[#4430d6]"
                >
                  승인
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

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

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#1C1F2A]/10 p-4">
      <h3 className="mb-3 text-xs font-semibold text-[#1C1F2A]">{title}</h3>
      {children}
    </section>
  );
}

/** 실패 화면. 문구는 백엔드 것을 그대로 쓰고 목록으로 돌려보낸다 */
function FailureView({ kind, message }: { kind: Failure; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#1C1F2A]/10 py-20 text-center">
      <span aria-hidden className="text-2xl">
        📄
      </span>

      <p className="mt-3 text-sm font-semibold text-[#1C1F2A]">
        {kind === 'notFound'
          ? '결재를 찾을 수 없습니다'
          : '결재를 불러오지 못했습니다'}
      </p>
      <p className="mt-1.5 text-xs break-keep text-[#6C7389]">{message}</p>

      <Link
        href={APPROVAL_ROUTES.list}
        className="mt-4 rounded-lg border border-[#1C1F2A]/10 px-3 py-1.5 text-xs font-semibold text-[#1C1F2A] hover:bg-[#ECEEF4]"
      >
        결재 목록으로
      </Link>
    </div>
  );
}
