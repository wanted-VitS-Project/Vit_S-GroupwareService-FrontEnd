'use client';

import { useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/Spinner';
import { notifyBlockChanged } from '@/features/block/events';
import { messageOf } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';

import { getCashFlowMatchCandidates, matchCashFlow } from './api';
import {
  CASH_FLOW_AMOUNT_COLOR,
  CASH_FLOW_TYPE_BADGE,
  formatAmount,
} from './display';
import {
  CASH_FLOW_TYPE_LABELS,
  type CashFlowItem,
  type MatchCandidate,
} from './types';

/**
 * 입출금 내역을 정산 블록에 연결하는 모달. (#14)
 *
 * ⚠️ 연결 대상은 프로젝트가 아니라 **정산 블록(회차)** 이다.
 * ⚠️ 추천은 최대 5건뿐이라 **후보에 없으면 여기서는 연결할 수 없다** —
 *    정산 블록을 먼저 만들거나 조건을 맞춰야 한다. 그 사실을 빈 상태에서 알린다.
 */
export default function CashFlowMatchModal({
  cashFlow,
  onClose,
  onMatched,
}: {
  cashFlow: CashFlowItem;
  onClose: () => void;
  onMatched: () => void;
}) {
  const [candidates, setCandidates] = useState<MatchCandidate[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCashFlowMatchCandidates(cashFlow.cashFlowId, signal)
      .then((data) => setCandidates(data.candidates))
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;

        setCandidates([]);
        setError(messageOf(caught, '추천 후보를 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [cashFlow.cashFlowId]);

  async function submit() {
    if (isSubmitting || selectedId === null) return;

    setIsSubmitting(true);
    setError('');

    try {
      await matchCashFlow(cashFlow.cashFlowId, selectedId);
      // 연결되면 그 정산 블록은 수정이 막힌다 — 열려 있는 보드도 다시 읽는다
      notifyBlockChanged();
      onMatched();
    } catch (caught) {
      /**
       * 400 이 세 갈래(이미 매칭된 입출금 · 구분 불일치 · 이미 매칭된 블록)인데
       * 셋 다 서버 문구가 가장 정확하다. 화면이 다시 풀어 쓰지 않는다.
       */
      setError(messageOf(caught, '연결하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="정산 블록에 연결"
      onClose={onClose}
      // 목록을 훑다 바깥을 잘못 눌러 닫히면 처음부터 다시 골라야 한다
      dismissOnBackdrop={false}
      className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-base p-8 shadow-lg"
    >
      <CashFlowSummary cashFlow={cashFlow} />

      <p
        id="matchCandidateLabel"
        className="mt-5 mb-2 text-caption font-semibold text-text-primary"
      >
        추천 정산 블록
      </p>

      {/**
       * ⚠️ 패널이 아니라 **이 목록만** 스크롤한다 —
       *    패널째 흐르면 위의 거래 정보가 화면 밖으로 밀려 무엇을 연결하는지 잊는다.
       */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CandidateList
          candidates={candidates}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {error && (
        <p className="mt-4 text-caption text-red-text" role="alert">
          {error}
        </p>
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

/** 무엇을 연결하는지 — 고르는 내내 보여야 해서 스크롤 밖에 둔다 */
function CashFlowSummary({ cashFlow }: { cashFlow: CashFlowItem }) {
  return (
    <div className="mt-6 rounded-lg border border-border-default bg-bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={CASH_FLOW_TYPE_BADGE[cashFlow.type]}>
          {CASH_FLOW_TYPE_LABELS[cashFlow.type]}
        </span>
        <span
          className={`text-body-m font-bold ${CASH_FLOW_AMOUNT_COLOR[cashFlow.type]}`}
        >
          {formatAmount(cashFlow.amount)}원
        </span>
      </div>

      <p className="mt-1.5 text-caption text-text-secondary">
        {formatDateTime(cashFlow.tradedAt) || '-'} · {cashFlow.depositorName}
        {cashFlow.bankMemo && ` · ${cashFlow.bankMemo}`}
      </p>
    </div>
  );
}

function CandidateList({
  candidates,
  selectedId,
  onSelect,
}: {
  candidates: MatchCandidate[] | null;
  selectedId: number | null;
  onSelect: (settleId: number) => void;
}) {
  if (candidates === null) {
    return (
      <LoadingSpinner label="추천 후보 불러오는 중" />
    );
  }

  if (candidates.length === 0) {
    return (
      <p className="py-12 text-center text-caption break-keep text-text-secondary">
        연결할 만한 정산 블록이 없습니다.
        <br />
        정산 블록이 먼저 작성돼 있어야 연결할 수 있어요.
      </p>
    );
  }

  return (
    // 그룹 이름을 라디오들과 연결한다 — 이름 없이 읽히면 무엇을 고르는지 알 수 없다
    <ul
      role="radiogroup"
      aria-labelledby="matchCandidateLabel"
      className="flex flex-col gap-2"
    >
      {candidates.map((candidate) => (
        <li key={candidate.settleId}>
          <CandidateOption
            candidate={candidate}
            isSelected={candidate.settleId === selectedId}
            onSelect={() => onSelect(candidate.settleId)}
          />
        </li>
      ))}
    </ul>
  );
}

/** 라디오를 감춘 카드. 라벨 전체가 선택 영역이라 어디를 눌러도 골라진다 */
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
        name="matchCandidate"
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

          {/* 추천 이유 — 왜 이 블록이 위에 있는지 알려주는 유일한 단서다 */}
          {candidate.matchTags.map((tag) => (
            <span key={tag} className="badge badge-blue">
              {tag}
            </span>
          ))}
        </span>
      </span>
    </label>
  );
}
