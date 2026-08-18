'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import PageTitle from '@/components/PageTitle';
import { Skeleton } from '@/components/Skeleton';

import { getFinanceSummary } from './api';
import { FINANCE_ROUTES } from './routes';
import type { FinanceSummary } from './types';

type FinanceIcon = 'cashFlow' | 'taxInvoice' | 'settlement';

/**
 * 화면이 그리는 두 수치.
 *
 * ⚠️ 정산 현황만 응답 필드가 `totalCount` 가 아니라 `inProgressCount` 라
 *    항목마다 `pick` 에서 이 모양으로 맞춰 준다.
 */
interface SummaryNumbers {
  unlinkedCount: number;
  totalCount: number;
}

interface FinanceItem {
  icon: FinanceIcon;
  label: string;
  description: string;
  href: string;
  /** 화면이 아직 없는 항목 — 눌러도 갈 곳이 없어 링크를 걸지 않는다 */
  isComingSoon?: boolean;
  /** 요약 응답에서 이 항목의 수치를 꺼낸다 */
  pick: (summary: FinanceSummary) => SummaryNumbers;
  /** 우측 두 번째 수치의 이름 — 정산 현황만 '전체' 가 아니라 '진행 중' 이다 */
  totalLabel: string;
}

/** 재무 허브 구성. 재무 화면을 추가하면 여기에만 항목을 넣는다 */
const ITEMS: FinanceItem[] = [
  {
    icon: 'cashFlow',
    label: '입출금 내역',
    description: '입출금을 등록·조회하고 정산 블록에 연결합니다.',
    href: FINANCE_ROUTES.cashFlows,
    pick: (summary) => summary.cashFlow,
    totalLabel: '전체',
  },
  {
    icon: 'taxInvoice',
    label: '세금계산서',
    description: 'CSV 로 수집한 세금계산서를 조회하고 정산 블록에 연결합니다.',
    href: FINANCE_ROUTES.taxInvoices,
    pick: (summary) => summary.taxInvoice,
    totalLabel: '전체',
  },
  {
    icon: 'settlement',
    label: '정산 현황',
    description: '정산이 끝나지 않은 프로젝트를 한눈에 확인합니다.',
    href: FINANCE_ROUTES.settlements,
    // 정산 현황만 두 번째 수치가 '진행 중 프로젝트' 다
    pick: (summary) => ({
      unlinkedCount: summary.settlement.unlinkedCount,
      totalCount: summary.settlement.inProgressCount,
    }),
    totalLabel: '진행 중',
  },
];

/**
 * 재무 관리 허브. 사이드바 `재무 관리` 의 진입 화면이다.
 *
 * 전사 관리 허브(`/settings`)와 같은 구조지만, 항목마다 **미연결 건수**를 함께 보여준다 —
 * 재무에서 급한 일은 언제나 "아직 연결 안 된 것" 이라 목록에 들어가기 전에 알아야 한다.
 *
 * 수치 조회가 실패해도 화면은 그대로 쓴다 — 이동만 하면 되는 허브를 통째로
 * 오류 화면으로 덮을 이유가 없다. 수치 자리만 비운다.
 */
export default function FinanceHub() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getFinanceSummary(signal)
      .then(setSummary)
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      {/* 다른 화면과 같은 자리 · 같은 간격을 쓰도록 브레드크럼 컴포넌트로 통일한다 */}
      {/*
        ⚠️ **최상위 화면이라 경로를 두지 않는다** — 위에 얹을 상위 화면이 없어
           `재무 관리` 한 마디만 남고, 제목과 같은 말이 두 줄로 반복된다.
           하위 화면(입출금 내역 · 세금계산서 · 정산 현황)은 그대로 경로를 그린다.
      */}
      <PageTitle
        variant="top"
        title="재무 관리"
        description="입출금 내역 · 세금계산서 · 정산 현황을 한 곳에서 관리합니다."
      />

      <div className="divide-y divide-border-default overflow-hidden rounded-base border border-border-default bg-bg-card">
        {ITEMS.map((item) => (
          <FinanceRow
            key={item.label}
            item={item}
            count={summary ? item.pick(summary) : null}
            hasFailed={hasFailed}
          />
        ))}
      </div>
    </>
  );
}

function FinanceRow({
  item,
  count,
  hasFailed,
}: {
  item: FinanceItem;
  count: SummaryNumbers | null;
  hasFailed: boolean;
}) {
  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bg-surface text-text-secondary">
        <FinanceIconMark icon={item.icon} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-body-m font-bold text-text-primary">
            {item.label}
          </span>
          {item.isComingSoon && (
            <span className="badge badge-gray">준비 중</span>
          )}
        </span>
        <span className="mt-0.5 block text-label break-keep text-text-secondary">
          {item.description}
        </span>
      </span>

      <SummaryCount item={item} count={count} hasFailed={hasFailed} />
    </>
  );

  /**
   * ⚠️ 화면이 없는 항목은 **링크를 걸지 않는다** — 눌러서 빈 화면을 만나는 것보다
   *    `준비 중` 을 보고 안 누르는 편이 낫다. 수치는 그대로 보여준다.
   */
  if (item.isComingSoon) {
    return (
      <div className="flex items-center gap-4 px-5 py-4 opacity-60">{body}</div>
    );
  }

  return (
    <Link
      href={item.href}
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-bg-surface"
    >
      {body}
      <ChevronIcon />
    </Link>
  );
}

/** 미연결 건수 · 전체 건수. 조회 실패 시에는 아무것도 그리지 않는다 */
function SummaryCount({
  item,
  count,
  hasFailed,
}: {
  item: FinanceItem;
  count: SummaryNumbers | null;
  hasFailed: boolean;
}) {
  if (hasFailed) return null;

  if (!count) {
    return (
      <span className="hidden shrink-0 items-center gap-3 sm:flex">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-12" />
      </span>
    );
  }

  return (
    <span className="hidden shrink-0 items-center gap-3 text-caption sm:flex">
      <span
        className={
          count.unlinkedCount > 0 ? 'text-red-text' : 'text-text-muted'
        }
      >
        <b className="text-label font-bold">{count.unlinkedCount}</b>건{' '}
        <span className="text-text-secondary">미연결</span>
      </span>
      <span className="text-text-secondary">
        <b className="text-label font-bold text-text-primary">
          {count.totalCount}
        </b>
        건 {item.totalLabel}
      </span>
    </span>
  );
}

/** 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다 (전사 관리 허브와 같은 방식) */
const ICON_PATHS: Record<FinanceIcon, React.ReactNode> = {
  cashFlow: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  taxInvoice: (
    <>
      <path d="M6 3h9l3 3v15l-3-1.5L12 21l-3-1.5L6 21Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  settlement: (
    <>
      <path d="M4 19V5" />
      <path d="m7 15 4-4 3 3 5-6" />
    </>
  ),
};

function FinanceIconMark({ icon }: { icon: FinanceIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      {ICON_PATHS[icon]}
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4 shrink-0 text-text-muted"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
