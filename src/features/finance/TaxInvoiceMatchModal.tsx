'use client';

import { useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/Spinner';
import { notifyBlockChanged } from '@/features/block/events';
import { messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';

import { getTaxInvoiceMatchCandidates, matchTaxInvoice } from './api';
import { formatAmount } from './display';
import {
  TAX_INVOICE_TYPE_BADGE,
  TAX_INVOICE_TYPE_LABELS,
  type MatchCandidate,
  type TaxInvoiceItem,
} from './types';

/**
 * 세금계산서를 정산 블록에 연결하는 모달. 입출금 연결 모달과 같은 모양을 쓴다.
 * 추천이 최대 5건이라 후보에 없으면 연결할 수 없다는 것을 빈 상태에서 알린다.
 */
export default function TaxInvoiceMatchModal({
  taxInvoice,
  onClose,
  onMatched,
}: {
  taxInvoice: TaxInvoiceItem;
  onClose: () => void;
  onMatched: () => void;
}) {
  const [candidates, setCandidates] = useState<MatchCandidate[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** 조회에 실패했을 때 다시 부르기 위한 값 */
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getTaxInvoiceMatchCandidates(taxInvoice.taxId, signal)
      .then((data) => {
        setCandidates(data.candidates);
        setError('');
      })
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;

        // 실패를 빈 목록으로 바꾸지 않는다. 후보는 모르는 상태로 둔다
        setError(messageOf(caught, '추천 후보를 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [taxInvoice.taxId, retryCount]);

  async function submit() {
    if (isSubmitting || selectedId === null) return;

    setIsSubmitting(true);
    setError('');

    try {
      await matchTaxInvoice(taxInvoice.taxId, selectedId);
      // 연결되면 정산 블록이 잠기므로 열려 있는 보드도 다시 읽는다
      notifyBlockChanged();
      onMatched();
    } catch (caught) {
      setError(messageOf(caught, '연결하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="정산 블록에 연결"
      onClose={onClose}
      // 바깥을 잘못 눌러 닫히면 처음부터 다시 골라야 한다
      dismissOnBackdrop={false}
      className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-base p-8 shadow-2xl"
    >
      <TaxInvoiceSummary taxInvoice={taxInvoice} />

      <p
        id="taxMatchCandidateLabel"
        className="mt-5 mb-2 text-caption font-semibold text-text-primary"
      >
        추천 정산 블록
      </p>

      {/* 세금계산서 정보가 밀려나지 않도록 이 목록만 스크롤한다 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CandidateList
          candidates={candidates}
          hasFailed={error !== ''}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {error && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-caption break-keep text-red-text" role="alert">
            {error}
          </p>
          {/* 후보를 못 받은 것뿐이면 창을 닫지 않고 다시 부른다 */}
          {candidates === null && (
            <button
              type="button"
              /* 다시 부르는 동안 스피너가 서도록 오류를 먼저 지운다 */
              onClick={() => {
                setError('');
                setRetryCount((count) => count + 1);
              }}
              className="btn btn-sm btn-gray-outlined"
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      <div className="mt-6 flex shrink-0 justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-md btn-gray-outlined"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={selectedId === null || isSubmitting}
          className="btn btn-md btn-primary min-w-[104px]"
        >
          {isSubmitting ? '연결 중…' : '연결'}
        </button>
      </div>
    </Modal>
  );
}

/** 무엇을 연결하는지. 고르는 내내 보여야 해서 스크롤 밖에 둔다 */
function TaxInvoiceSummary({ taxInvoice }: { taxInvoice: TaxInvoiceItem }) {
  return (
    <div className="mt-6 rounded-lg border border-border-default bg-bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={TAX_INVOICE_TYPE_BADGE[taxInvoice.type]}>
          {TAX_INVOICE_TYPE_LABELS[taxInvoice.type]}
        </span>
        <span className="text-body-m font-bold text-text-primary">
          {formatAmount(taxInvoice.totalAmount)}원
        </span>
      </div>

      <p className="mt-1.5 text-caption [overflow-wrap:anywhere] break-keep text-text-secondary">
        {formatDate(taxInvoice.issuedNo) || taxInvoice.issuedNo || '-'} ·{' '}
        {taxInvoice.buyerName}
        {taxInvoice.approvalNo && ` · ${taxInvoice.approvalNo}`}
      </p>
    </div>
  );
}

function CandidateList({
  candidates,
  hasFailed,
  selectedId,
  onSelect,
}: {
  candidates: MatchCandidate[] | null;
  /** 조회가 실패했는지. 참이면 스피너를 멈추고 오류 자리에서 안내한다 */
  hasFailed: boolean;
  selectedId: number | null;
  onSelect: (settleId: number) => void;
}) {
  if (candidates === null && hasFailed) return null;

  if (candidates === null) {
    return <LoadingSpinner label="추천 후보 불러오는 중" />;
  }

  if (candidates.length === 0) {
    return (
      <p className="py-12 text-center text-caption break-keep text-text-secondary">
        연결할 만한 정산 블록이 없습니다.
        <br />
        정산 블록이 먼저 작성돼 있어야 연결할 수 있습니다.
      </p>
    );
  }

  return (
    /* 목록 시맨틱을 덮지 않도록 fieldset + legend 로 그룹 이름만 얹는다 */
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">추천 정산 블록</legend>
      {candidates.map((candidate) => (
        <CandidateOption
          key={candidate.settleId}
          candidate={candidate}
          isSelected={candidate.settleId === selectedId}
          onSelect={() => onSelect(candidate.settleId)}
        />
      ))}
    </fieldset>
  );
}

/** 라디오를 감춘 카드. 라벨 전체가 선택 영역이다 */
function CandidateOption({
  candidate,
  isSelected,
  onSelect,
}: {
  candidate: MatchCandidate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border px-4 py-3 transition-colors ${
        isSelected
          ? 'border-border-primary bg-blue-bg-soft'
          : 'border-border-default hover:bg-bg-surface'
      }`}
    >
      <input
        type="radio"
        name="taxMatchCandidate"
        checked={isSelected}
        onChange={onSelect}
        className="mt-1 size-3.5 shrink-0 cursor-pointer accent-btn-primary"
      />

      <span className="min-w-0 flex-1">
        <span className="block text-label font-semibold [overflow-wrap:anywhere] break-keep text-text-primary">
          {candidate.projectName}
        </span>
        <span className="mt-0.5 block text-caption break-keep text-text-secondary">
          {candidate.roundName} · {candidate.traderName}
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
          <span className="font-semibold text-text-primary">
            {formatAmount(candidate.plannedAmount)}원
          </span>
          <span className="text-text-secondary">
            {formatDate(candidate.plannedDate) || '-'} 예정
          </span>
        </span>

        {/* 왜 이 블록이 위에 있는지 알려주는 단서다. 금액 · 날짜와 같은 줄에 두면
            줄바꿈 경계에 걸려 배지가 반만 보인다 */}
        {candidate.matchTags.length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {candidate.matchTags.map((tag) => (
              <span key={tag} className="badge badge-blue">
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>
    </label>
  );
}
