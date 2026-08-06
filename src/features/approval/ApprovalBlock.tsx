'use client';

import { useEffect, useState } from 'react';

import BlockCard from '@/features/block/BlockCard';
import type { StepBlock } from '@/features/block/types';
import { messageOf } from '@/lib/api';

import { createRevision, getRevision, submitRevision } from './api';
import ApprovalDraftForm from './ApprovalDraftForm';
import ApprovalProgress from './ApprovalProgress';
import ErrorText from './ErrorText';
import {
  type ApprovalBlockDetail,
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
 */
export default function ApprovalBlock({ block }: { block: StepBlock }) {
  const detail = readApprovalBlockDetail(block.detail);

  // 어느 결재의 어느 회차인지 모르면 아무것도 부를 수 없다
  if (!detail) {
    return (
      <BlockCard block={block}>
        <p className="text-[10px] break-keep text-[#6C7389]">
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
  const [revision, setRevision] = useState<ApprovalRevision | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

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
  }, [detail.approvalId, revisionId]);

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
      setRevisionId(created.revisionId);
      setIsEditing(true);
    } catch (caught) {
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
      const result = await submitRevision(detail.approvalId, revisionId);
      // 상신 직후 상태만 갈아끼운다. 결재선 진행 상태는 다음 조회에서 채워진다
      patchRevision({
        status: result.status,
        submittedAt: result.submittedAt,
      });
      setIsEditing(false);
    } catch (caught) {
      setError(messageOf(caught, '상신하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  if (hasFailed) {
    return (
      <BlockCard block={block}>
        <p className="text-[10px] break-keep text-[#6C7389]">
          결재를 불러오지 못했습니다.
        </p>
      </BlockCard>
    );
  }

  if (!revision) {
    return (
      <BlockCard block={block}>
        <p className="text-[10px] text-[#6C7389]">불러오는 중…</p>
      </BlockCard>
    );
  }

  const isDraft = revision.status === 'DRAFT';
  const isRejected = revision.status === 'REJECTED';

  return (
    <BlockCard
      block={block}
      headerExtra={
        // 재상신된 결재만 회차를 붙인다. 판단은 블록 `detail` 이 아니라 방금 받은 회차로 한다
        revision.revisionNo > 1 ? (
          <span className="shrink-0 rounded bg-[#ECEEF4] px-1.5 py-0.5 text-[9px] text-[#6C7389]">
            {revision.revisionNo}회차
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {isRejected && (
          <div className="rounded-lg border border-[#E7000B]/20 bg-[#E7000B]/5 px-2.5 py-2">
            <p className="text-[10px] font-semibold text-[#E7000B]">ⓘ 반려됨</p>
            <p className="mt-0.5 text-[10px] leading-relaxed break-keep text-[#E7000B]">
              {rejectionComment(revision) ??
                '반려 사유가 등록되지 않았습니다. 결재 상세에서 확인해주세요.'}
            </p>
          </div>
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
              <p className="text-[10px] font-semibold text-[#1C1F2A]">
                결재 제목
              </p>
              <p className="mt-0.5 text-[10px] break-keep text-[#6C7389]">
                {revision.title || detail.title || '제목 없음'}
              </p>
              <p className="mt-1 line-clamp-3 text-[10px] break-keep text-[#6C7389]">
                {revision.content || detail.content || '내용 없음'}
              </p>
            </div>

            <div className="flex gap-1.5">
              {/* 결재 상세 화면은 아직 없다 — 만들어지면 링크로 바꾼다 */}
              <span
                title="결재 관리 페이지는 준비 중입니다"
                className="flex flex-1 cursor-not-allowed items-center justify-center rounded-lg border border-[#1C1F2A]/10 py-1.5 text-[10px] font-medium text-[#C7CCD9]"
              >
                결재 상세 보기
              </span>
              {isRejected && (
                <button
                  type="button"
                  onClick={startRevise}
                  disabled={isBusy}
                  className="shrink-0 cursor-pointer rounded-lg border border-[#1C1F2A]/10 px-3 py-1.5 text-[10px] font-semibold text-[#1C1F2A] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
                >
                  {isBusy ? '준비 중…' : '수정'}
                </button>
              )}
            </div>
          </>
        )}

        {/* 상신은 DRAFT 회차에서만 된다. 반려 상태면 `수정` 으로 새 회차를 먼저 만든다 */}
        {isDraft && !isEditing && (
          <button
            type="button"
            onClick={submit}
            disabled={isBusy}
            className="w-full cursor-pointer rounded-lg bg-[#4F39F6] py-2 text-[11px] font-semibold text-white hover:bg-[#4430d6] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
          >
            {isBusy ? '상신 중…' : '상신'}
          </button>
        )}

        <ErrorText message={error} />
      </div>
    </BlockCard>
  );
}

/**
 * 반려 사유. 반려한 결재자의 의견을 쓴다.
 * ❗ `lines[].comment` 가 아직 명세에 없어 값이 오지 않으면 안내 문구로 대체한다.
 */
function rejectionComment(revision: ApprovalRevision) {
  const rejected = revision.lines.find((line) => line.status === 'REJECTED');
  return rejected?.comment || null;
}
