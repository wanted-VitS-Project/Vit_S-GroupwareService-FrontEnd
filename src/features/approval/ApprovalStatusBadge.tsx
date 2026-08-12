import { APPROVAL_STATUS_LABELS } from '@/constants/status';

import type { ApprovalStatus } from './types';

/** 상태별 색. 진행 중만 강조하고 나머지는 결과(초록·빨강)와 중립으로 나눈다 */
const STATUS_CLASS: Record<ApprovalStatus, string> = {
  DRAFT: 'bg-bg-hover text-text-secondary',
  IN_PROGRESS: 'bg-blue-bg-soft text-text-primary-blue',
  REJECTED: 'bg-red-bg-soft text-text-danger',
  COMPLETED: 'bg-green-bg text-[#12B76A]',
};

export default function ApprovalStatusBadge({
  status,
}: {
  status: ApprovalStatus;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-detail font-semibold ${STATUS_CLASS[status]}`}
    >
      {APPROVAL_STATUS_LABELS[status]}
    </span>
  );
}
