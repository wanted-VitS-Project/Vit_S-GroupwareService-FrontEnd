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
 * 결재 블록. (AP-001~034 · 046 · 053~066)
 *
 * 상태에 따라 화면이 셋으로 갈린다.
 * - `DRAFT` — 초안 편집 폼. 상신 전까지 자유롭게 고친다
 * - `IN_PROGRESS` · `COMPLETED` — 진행 현황 요약. **수정할 수 없다**
 * - `REJECTED` — 반려 안내 + `수정`(재상신 회차 생성) 진입점
 *
 * 여기에 더해 **참여 불가로 결재가 멈춘 경우** 배너가 붙는다 (`unavailable.ts`) —
 * 기안자 쪽은 재상신으로, 결재자 쪽은 교체 · 제외 모달로 푼다.
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
  /**
   * 보고 있는 회차. 재상신하면 새 회차로 갈아탄다 —
   * 블록 `detail` 의 값은 그때부터 낡은 것이 된다.
   */
  const [revisionId, setRevisionId] = useState(detail.revisionId);
  /** 회차를 다시 받아야 할 때 올린다 — 재상신은 멱등이라 ID 가 그대로일 수 있다 */
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
  /** 열어 본 첨부 문서 — 뷰어는 문서 하나만 받는다 */
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

  /** 문서 · 결재선이 바뀌면 회차를 통째로 다시 받지 않고 그 부분만 갈아끼운다 */
  function patchRevision(next: Partial<ApprovalRevision>) {
    setRevision((prev) => (prev ? { ...prev, ...next } : prev));
  }

  /** 반려된 결재를 다시 손보려면 새 DRAFT 회차가 필요하다 (AP-062) */
  async function startRevise() {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      // 멱등이다 — 이미 DRAFT 가 있으면 그것을 그대로 돌려준다
      const created = await createRevision(detail.approvalId);

      /**
       * 반려 사유를 따로 들고 있는다. 새 회차의 결재선은 아직 아무도 처리하지 않아
       * 회차를 갈아타는 순간 사유가 사라지는데, **무엇을 고쳐야 하는지가 그 문구에 있다** (AP-059·060).
       */
      setRejectionNote(rejectionNoteOf(revision));

      /**
       * ⚠️ 회차를 비우고 다시 받는다. 반려 회차의 값을 그대로 두면
       * 새 회차 화면에 옛 문서 · 결재선이 보이고, 그때 문서를 제거하면
       * **다른 회차의 `documentId`** 로 삭제 요청이 나간다.
       */
      setRevision(null);
      setHasFailed(false);
      setRevisionId(created.revisionId);
      setReloadKey((key) => key + 1);
      setIsEditing(true);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      /**
       * 대행 기안자는 **먼저 성공한 사람이 가져간다** — 거의 동시에 누르면 진 쪽이 이 코드다.
       * 서버 문구("기안자 아님")로는 왜 막혔는지 알 수 없어 사정을 알리고, 회차를 다시 받아
       * **대행자 이름이 붙은 화면**으로 바꿔 준다.
       */
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
      /**
       * 상태만 갈아끼우면 결재선이 상신 전(전부 대기) 그대로라 진행 현황이 비어 보인다.
       * 1번 결재선이 `ACTIVE` 로 바뀐 회차를 다시 받는다 (AP-031·046).
       */
      setRevision(null);
      setReloadKey((key) => key + 1);
      setIsEditing(false);
      /**
       * 반려 안내를 여기서 지운다. 상신이 끝나면 고칠 일이 없는데,
       * 남겨두면 진행 중인 결재에 계속 `반려됨` 이 붙어 있게 된다.
       */
      setRejectionNote(null);
    } catch (caught) {
      /**
       * 검증 400 은 사전 차단과 같은 문구로 통일한다 —
       * 프론트가 못 보는 항목(member · MASTER)은 서버만 알아서 여기로만 온다.
       */
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
  /** 상신을 막는 사유. 없으면 상신할 수 있다 (AP-022~024) */
  const blocker = isDraft ? findSubmitBlocker(revision) : null;

  return (
    <BlockCard
      block={block}
      headerExtra={
        // 재상신된 결재만 회차를 붙인다. 판단은 블록 `detail` 이 아니라 방금 받은 회차로 한다
        revision.revisionNo > 1 ? (
          <span className="shrink-0 rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-micro text-text-secondary">
            {revision.revisionNo}회차
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {/**
         * 반려 사유는 **재상신 회차를 만든 뒤에도 남긴다** — 무엇을 고쳐야 하는지가 그 문구에 있다.
         * 현재 회차가 반려 상태면 거기서, 이미 새 회차로 넘어왔으면 들고 있던 값에서 그린다.
         */}
        {(isRejected || rejectionNote) && (
          <RejectionBanner
            note={rejectionNote ?? rejectionNoteOf(revision)}
            showRetryGuide={!isRejected}
          />
        )}

        {/**
         * 기안자가 참여 불가라 결재가 멈춘 경우. 반려 회차에서만 의미가 있다 —
         * 재상신이 유일한 진행 수단이기 때문이다.
         */}
        {isRejected && revision.drafterUnavailable && (
          <DrafterUnavailableBanner
            actingDrafterName={revision.actingDrafterName ?? null}
            canRevise={needsActingDrafter(revision)}
            isBusy={isBusy}
            onRevise={startRevise}
          />
        )}

        {/**
         * 결재자가 참여 불가라 진행이 멈춘 경우. 배너 노출은 블록 목록이 내려준
         * `requiresApproverReplacement` 로 판단하고, 실제 대상은 회차 상세에서 고른다.
         */}
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
              <p className="mt-1 line-clamp-3 text-caption break-keep text-text-secondary">
                {revision.content || detail.content || '내용 없음'}
              </p>
            </div>

            {/**
             * 첨부 문서는 블록에서 바로 연다 — 무엇을 결재하는지가 핵심이라 파일을 보려고
             * 다른 화면으로 나갔다 오게 하지 않는다.
             * ⚠️ 회차 상세에는 `fileName` 이 없어(AP-013) 버전 번호로 대신 적는다.
             */}
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

            {/**
             * 상신 전에는 언제든 다시 고칠 수 있어야 한다 (AP-006).
             * 반려된 결재는 새 회차를 먼저 만들어야 해서 `startRevise` 로 간다 (AP-062).
             *
             * ⛔ 기안자가 참여 불가인 반려 회차에서는 **배너가 유일한 경로**다.
             *    여기 버튼도 `startRevise` 를 부르는데, 대행자가 이미 정해졌다면
             *    그 사람이 아닌 모두가 403 을 받는다 — 눌리지 않을 버튼을 두지 않는다.
             */}
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

            {/*
              완료는 **표시**다 — 누를 일이 없어 버튼으로 두지 않는다.
              `aria-disabled` 만 붙인 버튼은 키보드 초점이 그대로 잡혀,
              눌러 보고서야 동작이 없다는 것을 알게 된다.
            */}
            {isCompleted && (
              <p className="btn btn-md btn-primary w-full cursor-default">
                결재 승인 확인
              </p>
            )}
          </>
        )}

        {/* 상신은 DRAFT 회차에서만 된다. 반려 상태면 `수정` 으로 새 회차를 먼저 만든다 */}
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

            {/* 왜 눌리지 않는지 바로 옆에서 알려준다 — 눌러보고 알게 하지 않는다 */}
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
          /*
            회차(진행 현황 · 차수)와 블록 목록을 **둘 다** 다시 받아야 한다 —
            배너를 켜는 `requiresApproverReplacement` 는 블록 목록이 내려주는 값이라
            회차만 갱신하면 처리를 끝냈는데도 경고가 그대로 남는다.
          */
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
 *
 * **대행자 지정 절차가 따로 없다** — 스텝 `EDITOR` 중 가장 먼저 재상신에 성공한 사람이
 * 대행 기안자가 된다. 그래서 아직 아무도 없을 때만 버튼을 열고, 정해진 뒤에는
 * 누구인지 이름으로 알린다 (다른 사람이 눌러도 403 이라 눌리게 두지 않는다).
 *
 * ℹ️ 버튼은 `EDITOR` 가 아닌 사람에게도 보인다 — 스텝 권한을 블록이 알지 못한다.
 *    권한이 없으면 서버가 403 으로 막고 그 문구를 그대로 띄운다.
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

/** 반려한 결재자와 사유. 회차를 갈아탄 뒤에도 보여주려고 값만 따로 뽑아 둔다 */
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

/**
 * 반려 안내. 누가 · 언제 · 왜 반려했는지 보여준다 (AP-059).
 * 의견은 선택이라 없을 수 있고, 그때는 상세로 안내한다.
 */
function RejectionBanner({
  note,
  showRetryGuide,
}: {
  note: RejectionNote | null;
  /** 재상신 회차를 만든 뒤에는 다음에 할 일을 함께 알려준다 (AP-060·062) */
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

      {/* 형식이 어긋나면 빈 값이라 `empty:hidden` 으로 줄이 접힌다 */}
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
