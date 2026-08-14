'use client';

import { PROJECT_STATUS_LABELS } from '@/constants/status';

import { PROJECT_SUMMARY_STATUSES } from './projectStatus';
import { useProjectCounts } from './useProjectCounts';

/**
 * 상태별 프로젝트 요약 카드 5장.
 *
 * 대시보드와 `내 프로젝트` 가 **같은 카드**를 각자 그리고 있었다 (아이콘 5종까지 통째로 두 벌).
 * 같은 수를 다른 색 · 다른 자리로 보이면 다른 지표로 읽히므로 한 곳에서만 그린다.
 * 건수는 `useProjectCounts` 가 캐시 한 칸에 모아 두어 화면을 옮겨도 다시 부르지 않는다.
 */
const ICON_STYLE = {
  ALL: 'bg-purple-bg-soft text-purple-text',
  NOT_STARTED: 'bg-gray-bg-soft text-text-secondary',
  IN_PROGRESS: 'bg-yellow-bg-soft text-yellow-text',
  SETTLEMENT: 'bg-blue-bg-soft text-blue-text',
  COMPLETED: 'bg-green-bg text-green-text',
  CLOSED: 'bg-purple-bg-soft text-purple-text-deep',
} as const;

export default function ProjectSummaryCards({
  /** 화면마다 부르는 이름이 조금 다르다 (`프로젝트 요약` · `프로젝트 상태 요약`) */
  label,
  /** 넓은 화면의 카드 사이 간격만 화면별로 다르다 */
  wideGapClassName = 'xl:gap-6',
}: {
  label: string;
  wideGapClassName?: string;
}) {
  const { data, isError, refetch } = useProjectCounts();

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
  const values = data ? [data.total, ...data.byStatus] : null;

  /** 통계는 보조 정보다 — 실패해도 목록까지 실패 화면으로 만들지 않는다 */
  if (isError) {
    return (
      <section
        aria-label={label}
        className="flex items-center gap-3 rounded-base border border-border-default bg-bg-card px-5 py-4"
      >
        <p role="alert" className="text-[13px] text-text-secondary">
          상태별 건수를 불러오지 못했어요.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
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
      aria-label={label}
      className={`grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 ${wideGapClassName}`}
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
