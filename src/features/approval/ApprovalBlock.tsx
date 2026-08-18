'use client';

import { useEffect, useState } from 'react';

import BlockCard from '@/features/block/BlockCard';
import LoadingSpinner from '@/components/Spinner';
import { notifyBlockChanged } from '@/features/block/events';
import type { StepBlock } from '@/features/block/types';
import { ApiError, messageOf } from '@/lib/api';

import { createRevision, getRevision, submitRevision } from './api';
import ApprovalDocumentModal from './ApprovalDocumentModal';
import ApprovalDraftForm from './ApprovalDraftForm';
import ApprovalProgress from './ApprovalProgress';
import ApproverReplaceModal from './ApproverReplaceModal';
import { APPROVAL_CODES } from './errorCodes';
import ErrorText from './ErrorText';
import { formatDateTime } from './format';
import { findSubmitBlocker, submitBlockerLabel } from './submitCheck';
import { needsActingDrafter } from './unavailable';
import {
  type ApprovalBlockDetail,
  type ApprovalDocument,
  type ApprovalRevision,
  readApprovalBlockDetail,
} from './types';

/**
 * 결재 블록. 상태에 따라 초안 폼 · 진행 현황 · 반려 안내로 갈린다.
 * 참여 불가로 결재가 멈추면 배너를 덧붙인다.
 */
export default function ApprovalBlock({ block }: { block: StepBlock }) {
  const detail = readApprovalBlockDetail(block.detail);

  // 어느 결재의 어느 회차인지 모르면 아무것도 부를 수 없다
  if (!detail) {
    return (
      <BlockCard block={block}>
        <p className="text-caption break-keep text-text-secondary">
          결재 정보를 불러올 수 없습니다. 블록을 다시 만들어주세요.
        </p>
      </BlockCard>
    );
  }

  return <Loaded block={block} detail={detail} />;
}

function Loaded({
  block,
  detail,
}: {
  block: StepBlock;
  detail: ApprovalBlockDetail;
}) {
  /** 보고 있는 회차. 재상신하면 새 회차로 갈아탄다 */
  const [revisionId, setRevisionId] = useState(detail.revisionId);
  /** 회차를 다시 받아야 할 때 올린다. 재상신해도 ID 가 그대로일 수 있다 */
  const [reloadKey, setReloadKey] = useState(0);
  const [revision, setRevision] = useState<ApprovalRevision | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  /** 재상신 회차로 갈아탄 뒤에도 보여줄 직전 반려 사유 */
  const [rejectionNote, setRejectionNote] = useState<RejectionNote | null>(
    null,
  );
  /** 참여 불가 결재자 교체 · 제외 모달 */
  const [isReplacingApprover, setIsReplacingApprover] = useState(false);
  /** 열어 본 첨부 문서. 뷰어는 문서 하나만 받는다 */
  const [viewingDocument, setViewingDocument] =
    useState<ApprovalDocument | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getRevision(detail.approvalId, revisionId, signal)
      .then((data) => {
        setRevision(data);
        setHasFailed(false);
        // 아직 아무것도 안 쓴 초안이면 곧바로 작성 화면을 연다
        if (data.status === 'DRAFT' && !data.title && !data.content) {
          setIsEditing(true);
        }
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, [detail.approvalId, revisionId, reloadKey]);

  /** 회차를 통째로 다시 받지 않고 바뀐 부분만 갈아끼운다 */
  function patchRevision(next: Partial<ApprovalRevision>) {
    setRevision((prev) => (prev ? { ...prev, ...next } : prev));
  }

  /** 반려된 결재를 다시 손보려면 새 DRAFT 회차가 필요하다 */
  async function startRevise() {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      // 이미 DRAFT 회차가 있으면 그것을 그대로 돌려준다
      const created = await createRevision(detail.approvalId);

      // 회차를 갈아타면 사라지므로 반려 사유를 따로 들고 있는다
      setRejectionNote(rejectionNoteOf(revision));

      // 옛 회차의 문서 · 결재선이 섞이지 않도록 비우고 다시 받는다
      setRevision(null);
      setHasFailed(false);
      setRevisionId(created.revisionId);
      setReloadKey((key) => key + 1);
      setIsEditing(true);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 대행 기안자는 먼저 성공한 사람이 가져간다. 사정을 알리고 회차를 다시 받는다
      if (code === APPROVAL_CODES.notDrafter) {
        setError('다른 분이 먼저 재상신해 대행 기안자가 되었습니다.');
        setReloadKey((key) => key + 1);
        return;
      }

      setError(messageOf(caught, '수정을 시작하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  async function submit() {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      await submitRevision(detail.approvalId, revisionId);
      // 진행 현황이 비어 보이지 않도록 상신 후 회차를 다시 받는다
      setRevision(null);
      setReloadKey((key) => key + 1);
      setIsEditing(false);
      // 상신이 끝나면 반려 안내를 지운다
      setRejectionNote(null);
    } catch (caught) {
      // 검증 400 은 사전 차단과 같은 문구로 통일한다
      const code = caught instanceof ApiError ? caught.code : undefined;
      setError(
        submitBlockerLabel(code) ?? messageOf(caught, '상신하지 못했습니다.'),
      );
    } finally {
      setIsBusy(false);
    }
  }

  if (hasFailed) {
    return (
      <BlockCard block={block}>
        <p className="text-caption break-keep text-text-secondary">
          결재를 불러오지 못했습니다.
        </p>
      </BlockCard>
    );
  }

  if (!revision) {
    return (
      <BlockCard block={block}>
        <LoadingSpinner
          label="결재를 불러오는 중"
          className="py-8"
          spinnerClassName="size-5"
        />
      </BlockCard>
    );
  }

  const isDraft = revision.status === 'DRAFT';
  const isRejected = revision.status === 'REJECTED';
  const isCompleted = revision.status === 'COMPLETED';
  /** 상신을 막는 사유. 없으면 상신할 수 있다 */
  const blocker = isDraft ? findSubmitBlocker(revision) : null;

  return (
    <BlockCard
      block={block}
      headerExtra={
        // 재상신된 결재만 회차를 붙인다. 방금 받은 회차 기준으로 판단한다
        revision.revisionNo > 1 ? (
          <span className="shrink-0 rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-micro text-text-secondary">
            {revision.revisionNo}회차
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {/* 반려 사유는 재상신 회차를 만든 뒤에도 남긴다 */}
        {(isRejected || rejectionNote) && (
          <RejectionBanner
            note={rejectionNote ?? rejectionNoteOf(revision)}
            showRetryGuide={!isRejected}
          />
        )}

        {/* 기안자가 참여 불가인 경우. 재상신이 유일한 수단이라 반려 회차에서만 띄운다 */}
        {isRejected && revision.drafterUnavailable && (
          <DrafterUnavailableBanner
            actingDrafterName={revision.actingDrafterName ?? null}
            canRevise={needsActingDrafter(revision)}
            isBusy={isBusy}
            onRevise={startRevise}
          />
        )}

        {/* 결재자가 참여 불가인 경우. 실제 대상 결재선은 회차 상세에서 고른다 */}
        {detail.requiresApproverReplacement && (
          <div className="rounded-lg border border-yellow-border bg-yellow-bg-soft px-2.5 py-2">
            <p className="text-caption font-semibold break-keep text-yellow-text">
              ⚠ 결재할 수 없는 결재자가 있어 결재가 멈췄습니다.
            </p>
            <button
              type="button"
              onClick={() => setIsReplacingApprover(true)}
              className="mt-2 cursor-pointer rounded-lg bg-yellow-text px-3 py-1.5 text-caption font-semibold text-text-white hover:opacity-90"
            >
              결재자 처리
            </button>
          </div>
        )}

        {isCompleted && (
          <p className="rounded-lg border border-green-text/20 bg-green-text/5 px-2.5 py-2 text-caption font-semibold text-green-text">
            최종 승인 완료
          </p>
        )}

        {isEditing ? (
          <ApprovalDraftForm
            approvalId={detail.approvalId}
            revisionId={revisionId}
            blockId={block.blockId}
            revision={revision}
            onClose={() => setIsEditing(false)}
            onChanged={patchRevision}
          />
        ) : (
          <>
            <ApprovalProgress lines={revision.lines} />

            <div>
              <p className="text-caption font-semibold text-text-primary">
                결재 제목
              </p>
              <p className="mt-0.5 text-caption break-keep text-text-secondary">
                {revision.title || detail.title || '제목 없음'}
              </p>
            </div>

            {/* 내용은 줄이지 않는다. 잘라 두면 무엇을 결재하는지 블록에서 알 수 없다 */}
            <div>
              <p className="text-caption font-semibold text-text-primary">
                결재 내용
              </p>
              <p className="mt-0.5 text-caption break-keep whitespace-pre-line text-text-secondary">
                {revision.content || detail.content || '내용 없음'}
              </p>
            </div>

            {/* 첨부 문서는 블록에서 바로 연다. 파일명이 없으면 버전 번호로 적는다 */}
            {revision.documents.length > 0 && (
              <div>
                <p className="text-caption font-semibold text-text-primary">
                  첨부 문서
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {revision.documents.map((document) => (
                    <li key={document.documentId}>
                      <button
                        type="button"
                        onClick={() => setViewingDocument(document)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border-default px-2 py-1.5 text-left hover:bg-bg-hover"
                      >
                        <DocumentIcon />
                        <span className="min-w-0 flex-1 truncate text-caption text-text-primary">
                          {document.fileName ??
                            `파일 버전 #${document.fileVersionId}`}
                        </span>
                        <span className="shrink-0 text-caption font-semibold text-text-primary-blue">
                          보기
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 기안자가 참여 불가인 반려 회차는 배너로만 진행한다 (버튼은 403 이 된다) */}
            {(isDraft || (isRejected && !revision.drafterUnavailable)) && (
              <button
                type="button"
                onClick={isRejected ? startRevise : () => setIsEditing(true)}
                disabled={isBusy}
                className="w-full cursor-pointer rounded-lg border border-border-default py-1.5 text-caption font-semibold text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
              >
                {isBusy ? '준비 중…' : '수정'}
              </button>
            )}
          </>
        )}

        {/* 상신은 DRAFT 회차에서만 된다 */}
        {isDraft && !isEditing && (
          <div>
            <button
              type="button"
              onClick={submit}
              disabled={isBusy || blocker !== null}
              className="btn btn-md btn-primary w-full"
            >
              {isBusy ? '상신 중…' : '상신'}
            </button>

            {/* 왜 눌리지 않는지 버튼 옆에서 알려준다 */}
            {blocker && (
              <p className="mt-1 text-center text-caption break-keep text-text-secondary">
                {submitBlockerLabel(blocker)}
              </p>
            )}
          </div>
        )}

        <ErrorText message={error} />
      </div>

      {viewingDocument && (
        <ApprovalDocumentModal
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}

      {isReplacingApprover && (
        <ApproverReplaceModal
          approvalId={detail.approvalId}
          revisionId={revisionId}
          lines={revision.lines}
          onClose={() => setIsReplacingApprover(false)}
          /* 배너 값은 블록 목록이 내려주므로 회차와 블록 목록을 둘 다 다시 받는다 */
          onChanged={() => {
            setReloadKey((key) => key + 1);
            notifyBlockChanged();
          }}
        />
      )}
    </BlockCard>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3.5 shrink-0 text-text-secondary"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

/**
 * 기안자가 참여 불가일 때의 안내.
 * 대행자가 없을 때만 버튼을 열고, 정해진 뒤에는 누구인지 이름으로 알린다.
 */
function DrafterUnavailableBanner({
  actingDrafterName,
  canRevise,
  isBusy,
  onRevise,
}: {
  actingDrafterName: string | null;
  canRevise: boolean;
  isBusy: boolean;
  onRevise: () => void;
}) {
  return (
    <div className="rounded-lg border border-yellow-border bg-yellow-bg-soft px-2.5 py-2">
      <p className="text-caption font-semibold break-keep text-yellow-text">
        ⚠ 기안자가 참여할 수 없어 결재가 멈췄습니다.
      </p>

      {canRevise ? (
        <>
          <p className="mt-0.5 text-caption break-keep text-yellow-text">
            재상신하면 대행 기안자가 되어 이 결재를 이어서 진행합니다.
          </p>
          <button
            type="button"
            onClick={onRevise}
            disabled={isBusy}
            className="mt-2 cursor-pointer rounded-lg bg-yellow-text px-3 py-1.5 text-caption font-semibold text-text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
          >
            {isBusy ? '준비 중…' : '재상신'}
          </button>
        </>
      ) : (
        <p className="mt-0.5 text-caption break-keep text-yellow-text">
          <strong>{actingDrafterName ?? '다른 담당자'}</strong> 님이 대행
          기안자로 이어받았습니다.
        </p>
      )}
    </div>
  );
}

/** 반려한 결재자와 사유. 회차를 갈아탄 뒤에도 보여주려고 따로 뽑아 둔다 */
interface RejectionNote {
  approverName: string;
  approverPosition: string | null;
  opinion: string | null;
  processedAt: string | null;
}

function rejectionNoteOf(
  revision: ApprovalRevision | null,
): RejectionNote | null {
  const rejected = revision?.lines.find((line) => line.status === 'REJECTED');
  if (!rejected) return null;

  return {
    approverName: rejected.approverName,
    approverPosition: rejected.approverPosition,
    opinion: rejected.opinion,
    processedAt: rejected.processedAt,
  };
}

/** 반려 안내. 의견은 선택이라 없으면 상세로 안내한다 */
function RejectionBanner({
  note,
  showRetryGuide,
}: {
  note: RejectionNote | null;
  /** 재상신 회차를 만든 뒤에는 다음에 할 일을 함께 알려준다 */
  showRetryGuide: boolean;
}) {
  return (
    <div className="rounded-lg border border-border-danger/20 bg-red-bg-soft px-2.5 py-2">
      <p className="text-caption font-semibold text-text-danger">
        ⓘ 반려됨
        {note && ` · ${note.approverName}`}
        {note?.approverPosition && ` ${note.approverPosition}`}
      </p>

      <p className="mt-0.5 text-caption leading-relaxed break-keep text-text-danger">
        {note?.opinion ||
          '반려 사유가 등록되지 않았습니다. 결재 상세에서 확인해주세요.'}
      </p>

      {/* 형식이 어긋나면 빈 값이라 줄이 접힌다 */}
      <p className="mt-1 text-micro text-text-danger/70 empty:hidden">
        {note?.processedAt ? formatDateTime(note.processedAt, '') : ''}
      </p>

      {showRetryGuide && (
        <p className="mt-1.5 border-t border-border-danger/15 pt-1.5 text-caption break-keep text-text-danger">
          내용을 수정한 뒤 다시 상신해주세요.
        </p>
      )}
    </div>
  );
}
