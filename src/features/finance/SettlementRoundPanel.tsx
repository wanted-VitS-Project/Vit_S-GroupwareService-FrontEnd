'use client';

import { useEffect, useState } from 'react';

import LoadingSpinner from '@/components/Spinner';
import {
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_TYPE_LABELS,
} from '@/features/settlement/types';
import type { SettlementStatus } from '@/features/settlement/types';
import { messageOf } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';

import { getProjectSettlements } from './api';
import { formatAmount } from './display';
import type { SettlementRound } from './types';

/**
 * 고른 프로젝트의 **정산 회차** 표.
 *
 * 누른 행 **바로 아래**에 펼쳐진다 — 화면을 옮기지 않아 프로젝트를 연달아 훑을 수 있다.
 * 회차는 페이징이 없어 한 번에 온다.
 *
 * ℹ️ 닫는 단추를 두지 않는다 — **행을 다시 누르면 접힌다.** 여는 자리와 닫는 자리가 같아야
 *    한 번 배우면 잊지 않는다.
 *
 * ⚠️ 값 대부분이 비어 있을 수 있다 — 정산 블록을 만들어 두고 아직 안 쓴 회차가 있다.
 * ⚠️ 계좌 정보(은행 · 번호 · 예금주)는 **열로 두지 않는다.** 출금 회차에만 있는 값이라
 *    열로 세우면 대부분의 줄이 비어 표만 넓어진다 — 눌러서 펼치게 한다.
 * 🔒 **계좌번호는 마스킹 없이 원본으로 온다** (2026-08-17 백엔드 PR #422). 이 API 는
 *    `FINANCE` 권한자(재무팀)만 부를 수 있어 원본이 허용된 자리다. 다만 화면 공유 ·
 *    어깨너머로 새기 쉬운 값이라 **기본은 접어 두고 눌렀을 때만** 편다.
 */
export default function SettlementRoundPanel({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName: string;
}) {
  /**
   * 어느 프로젝트의 결과인지 함께 담는다 — 프로젝트를 바꾸면 키가 어긋나
   * 자동으로 로딩이 된다 (효과에서 상태를 비우지 않는다).
   */
  const [result, setResult] = useState<{
    key: string;
    rounds?: SettlementRound[];
    errorMessage?: string;
  } | null>(null);
  /** 계좌 정보를 펼친 회차 */
  const [openAccountId, setOpenAccountId] = useState<number | null>(null);
  /** 실패했을 때 다시 부르는 값 — 같은 프로젝트라 키만으로는 효과가 다시 돌지 않는다 */
  const [reloadCount, setReloadCount] = useState(0);

  const requestKey = `${projectId} ${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectSettlements(projectId, signal)
      .then((list) => setResult({ key: requestKey, rounds: list }))
      .catch((caught) => {
        if (signal.aborted) return;

        setResult({
          key: requestKey,
          errorMessage: messageOf(caught, '회차를 불러오지 못했습니다.'),
        });
      });

    return () => controller.abort();
  }, [requestKey, projectId]);

  const current = result?.key === requestKey ? result : null;
  const rounds = current?.rounds ?? null;
  const errorMessage = current?.errorMessage ?? '';

  return (
    <section
      aria-label={`${projectName} 정산 회차`}
      /*
        표 안에 끼어드는 줄이라 **어느 행에 딸린 것인지**가 먼저 보여야 한다.
        왼쪽 굵은 선 + 들여쓰기로 목록보다 한 단 안쪽임을 표시하고,
        바탕은 목록(흰색)과 다른 회색으로 둔다.
      */
      className="border-l-4 border-border-primary bg-bg-surface py-4 pr-5 pl-8"
    >
      {errorMessage ? (
        <p role="alert" className="text-caption text-text-danger">
          {errorMessage}{' '}
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            className="cursor-pointer font-semibold underline"
          >
            다시 시도
          </button>
        </p>
      ) : rounds === null ? (
        <LoadingSpinner label="정산 회차 불러오는 중" className="py-8" />
      ) : rounds.length === 0 ? (
        <p className="rounded-lg border border-border-default bg-bg-card px-4 py-6 text-center text-caption text-text-secondary">
          등록된 정산 회차가 없습니다.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-default bg-bg-card">
          <table className="w-full text-left align-top text-caption">
            <caption className="sr-only">
              {projectName} 회차별 정산 내역
            </caption>
            <thead className="bg-bg-hover text-text-secondary">
              <tr>
                <Th className="w-12">회차</Th>
                <Th>회차명</Th>
                <Th>입출금 기한</Th>
                {/* 왼쪽 정렬 열을 금액 앞으로 모은다 — 금액 3열이 붙어야 자릿수가 줄을 맞춘다 */}
                <Th>매칭 처리자</Th>
                <Th align="right">예정 금액</Th>
                <Th align="right">계산서</Th>
                <Th align="right">입출금</Th>
                <Th>상태</Th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => (
                <RoundRows
                  key={round.settleId}
                  round={round}
                  isAccountOpen={openAccountId === round.settleId}
                  onToggleAccount={() =>
                    setOpenAccountId((open) =>
                      open === round.settleId ? null : round.settleId,
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** 회차 한 줄 + (펼쳤을 때) 계좌 정보 줄 */
function RoundRows({
  round,
  isAccountOpen,
  onToggleAccount,
}: {
  round: SettlementRound;
  isAccountOpen: boolean;
  onToggleAccount: () => void;
}) {
  const hasAccount =
    round.bankName !== null ||
    round.accountNumber !== null ||
    round.accountHolder !== null;

  return (
    <>
      <tr className="border-t border-border-default">
        <Td className="text-text-secondary">{round.roundNo ?? '—'}</Td>
        <Td className="font-medium text-text-primary">
          {/* 입금 회차와 출금 회차가 한 표에 섞여 있어 구분을 이름 옆에 붙인다 */}
          <PaidTypeBadge paidType={round.paidType} />
          {round.roundName ?? '이름 없음'}
        </Td>
        <Td className="whitespace-nowrap text-text-secondary">
          {round.plannedDate ? formatDate(round.plannedDate) : '—'}
        </Td>
        <Td>
          <LinkedBy
            label="계산서"
            name={round.taxLinkedByName}
            at={round.taxLinkedAt}
          />
          <LinkedBy
            label="입출금"
            name={round.cashFlowLinkedByName}
            at={round.cashFlowLinkedAt}
          />
        </Td>

        <Td align="right" className="whitespace-nowrap text-text-primary">
          {formatAmount(round.plannedAmount)}
          {round.plannedTaxAmount !== null && round.plannedTaxAmount > 0 && (
            <span className="block text-text-secondary">
              세금 {formatAmount(round.plannedTaxAmount)}
            </span>
          )}
        </Td>

        <AmountWithDate
          amount={round.taxInvoiceAmount}
          date={round.taxInvoiceDate}
        />

        <Td align="right" className="whitespace-nowrap">
          <span className="block text-text-primary">
            {formatAmount(round.paidAmount)}
          </span>
          {round.paidDate && (
            <span className="block text-text-secondary">
              {formatDate(round.paidDate)}
            </span>
          )}
          {/* 계좌는 출금 회차에만 있다 — 값이 있을 때만 여는 단추를 둔다 (원본 번호라 기본은 접음) */}
          {hasAccount && (
            <button
              type="button"
              onClick={onToggleAccount}
              aria-expanded={isAccountOpen}
              className="mt-0.5 cursor-pointer rounded-button-sm px-1 py-0.5 font-medium text-text-primary-blue hover:bg-blue-bg-soft"
            >
              계좌 {isAccountOpen ? '접기' : '보기'}
            </button>
          )}
        </Td>

        <Td>
          <StatusBadge status={round.status} />
        </Td>
      </tr>

      {isAccountOpen && (
        <tr className="border-t border-border-default bg-bg-surface">
          <td colSpan={8} className="px-3 py-2 text-text-secondary">
            <span className="font-medium text-text-primary">
              {round.bankName ?? '은행 미입력'}
            </span>{' '}
            {round.accountNumber ?? '계좌번호 미입력'} ·{' '}
            {round.accountHolder ?? '예금주 미입력'}
          </td>
        </tr>
      )}
    </>
  );
}

/** 회차의 입출금 구분. 작성 전이면 타입이 정해지지 않아 그리지 않는다 */
function PaidTypeBadge({ paidType }: { paidType: string | null }) {
  if (paidType !== 'INCOME' && paidType !== 'OUTCOME') return null;

  return (
    <span
      className={`badge mr-1.5 ${paidType === 'INCOME' ? 'badge-blue' : 'badge-red'}`}
    >
      {SETTLEMENT_TYPE_LABELS[paidType]}
    </span>
  );
}

/** 금액 아래 발행일을 붙이는 칸 */
function AmountWithDate({
  amount,
  date,
}: {
  amount: number | null;
  date: string | null;
}) {
  return (
    <Td align="right" className="whitespace-nowrap">
      <span className="block text-text-primary">{formatAmount(amount)}</span>
      {date && (
        <span className="block text-text-secondary">{formatDate(date)}</span>
      )}
    </Td>
  );
}

/**
 * 누가 언제 연결했는지. 재무팀이 처리 내역을 되짚을 때 쓴다.
 * 아직 연결 전이면 자리만 비운다 — 줄 높이가 들쭉날쭉하지 않게.
 */
function LinkedBy({
  label,
  name,
  at,
}: {
  label: string;
  name: string | null;
  at: string | null;
}) {
  if (!name) {
    return <span className="block text-text-muted">{label} —</span>;
  }

  return (
    <span className="block text-text-secondary">
      {label} <span className="font-medium text-text-primary">{name}</span>
      {at && <span className="ml-1">{formatDateTime(at)}</span>}
    </span>
  );
}

function Th({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 font-medium ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2.5 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </td>
  );
}

/** 모르는 값이 오면 라벨 대신 원문을 적는다 — 화면에서 바로 드러나게 둔다 */
function StatusBadge({ status }: { status: string }) {
  const label = SETTLEMENT_STATUS_LABELS[status as SettlementStatus] ?? status;

  const tone =
    status === 'COMPLETED'
      ? 'bg-green-bg text-green-text'
      : status === 'PARTIAL'
        ? 'bg-yellow-bg-soft text-yellow-text'
        : status === 'WAITING'
          ? 'bg-blue-bg-soft text-text-primary-blue'
          : 'bg-bg-hover text-text-secondary';

  return (
    <span
      className={`inline-block rounded-button-sm px-1.5 py-0.5 whitespace-nowrap ${tone}`}
    >
      {label}
    </span>
  );
}
