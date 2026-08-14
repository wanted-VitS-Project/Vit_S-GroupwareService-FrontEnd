'use client';

import { useEffect, useState } from 'react';

import { PROJECT_STATUS_LABELS } from '@/constants/status';
import { getProjectCount } from '@/features/project/api';
import { PROJECT_SUMMARY_STATUSES } from '@/features/project/projectStatus';

/**
 * 아이콘 배경 · 글자색. `내 프로젝트` 화면의 요약 카드와 **같은 팔레트**다 —
 * 두 화면이 같은 수를 다른 색으로 보이면 다른 지표로 읽힌다.
 */
const ICON_STYLE = {
  ALL: 'bg-purple-bg-soft text-purple-text',
  NOT_STARTED: 'bg-gray-bg-soft text-text-secondary',
  IN_PROGRESS: 'bg-yellow-bg-soft text-yellow-text',
  SETTLEMENT: 'bg-blue-bg-soft text-blue-text',
  COMPLETED: 'bg-green-bg text-green-text',
  CLOSED: 'bg-purple-bg-soft text-purple-text-deep',
} as const;

/**
 * 대시보드 상단 `프로젝트 요약`.
 *
 * ⚠️ 집계 API 가 따로 없어 상태마다 `size=1` 로 물어 `totalElements` 만 쓴다 —
 *    `내 프로젝트` 화면과 같은 방식이다 (`getProjectCount`).
 * ⭐ `전체` 는 **네 상태의 합**이다. 상태 필터 없이 세면 종결(`CLOSED`)까지 들어가는데
 *    종결은 카드로 세우지 않아 합이 맞지 않는다.
 */
export default function DashboardSummary() {
  const [counts, setCounts] = useState<number[] | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  /**
   * 몇 번째 시도가 실패했는지 들고 있는다 — `counts === null` 만으로는
   * **세는 중**과 **실패**를 구분할 수 없어 카드가 영영 `–` 로 남는다.
   */
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const hasFailed = failedAt === retryCount;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all(
      PROJECT_SUMMARY_STATUSES.map((status) => getProjectCount(status, signal)),
    )
      .then(setCounts)
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setFailedAt(retryCount);
      });

    return () => controller.abort();
  }, [retryCount]);

  const total = counts?.reduce((sum, count) => sum + count, 0) ?? null;

  const cards = [
    { label: '전체 프로젝트', iconStyle: ICON_STYLE.ALL, icon: <FolderIcon /> },
    ...PROJECT_SUMMARY_STATUSES.map((status, index) => ({
      label: `${PROJECT_STATUS_LABELS[status]} 프로젝트`,
      iconStyle: ICON_STYLE[status],
      icon: [
        <ClockIcon key="c" />,
        <PlayIcon key="p" />,
        <CoinIcon key="s" />,
        <CheckIcon key="d" />,
      ][index],
    })),
  ];

  /** 카드 순서(`전체` + 네 상태)에 맞춘 표시값 */
  const values = counts === null ? null : [total, ...counts];

  if (hasFailed) {
    return (
      <section
        aria-label="프로젝트 요약"
        className="flex items-center gap-3 rounded-base border border-border-default bg-bg-card px-5 py-4"
      >
        <p role="alert" className="text-[13px] text-text-secondary">
          상태별 건수를 불러오지 못했어요.
        </p>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="cursor-pointer rounded-lg border border-border-default px-2.5 py-1 text-label font-semibold text-text-primary hover:bg-bg-hover"
        >
          다시 시도
        </button>
      </section>
    );
  }

  return (
    /* 좁은 화면에서 5열을 유지하면 카드 폭이 좁아져 숫자가 아이콘과 겹친다 */
    <section
      aria-label="프로젝트 요약"
      className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 xl:gap-6"
    >
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="flex h-24 items-center gap-4 rounded-base border border-border-default bg-bg-card px-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <span
            aria-hidden
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${card.iconStyle}`}
          >
            {card.icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] text-text-secondary">
              {card.label}
            </p>
            <p className="mt-0.5 truncate text-logo leading-8 font-semibold text-text-primary">
              {/* 아직 세는 중이면 자리만 잡는다 — 0 을 먼저 보이면 잘못된 값을 읽힌다 */}
              {values ? (values[index] ?? 0).toLocaleString('ko-KR') : '–'}
              <span className="ml-1 text-[13px] font-medium text-text-secondary">
                개
              </span>
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

/** 아래 아이콘은 모두 시안의 벡터를 stroke 로 옮긴 것이다 */
function iconProps(size: string) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: size,
  };
}

function FolderIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.5 9.5v5l4-2.5-4-2.5Z" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}
