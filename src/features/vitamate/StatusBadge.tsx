import type { AnalysisStatus } from './types';

/**
 * 분석 상태 배지.
 * 진행 중 두 상태(`PENDING`·`PROCESSING`)는 사용자에게 구분할 이유가 없어
 * 색은 같이 두고 문구만 다르게 한다 — 대기 중인지 도는 중인지는 알려 주는 게 낫다.
 */
const STYLE: Record<AnalysisStatus, { label: string; className: string }> = {
  PENDING: {
    label: '대기 중',
    className: 'border-yellow-border bg-yellow-bg-soft text-yellow-text',
  },
  PROCESSING: {
    label: '분석 중',
    className: 'border-yellow-border bg-yellow-bg-soft text-yellow-text',
  },
  COMPLETED: {
    label: '완료',
    className: 'border-green-border bg-green-bg text-green-text',
  },
  FAILED: {
    label: '실패',
    className: 'border-red-border bg-red-bg-soft text-text-danger',
  },
};

export default function StatusBadge({ status }: { status: AnalysisStatus }) {
  const { label, className } = STYLE[status];

  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-px text-[9px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
