import { APPROVAL_STATUS_LABELS } from '@/constants/status';

import type { ApprovalStatus } from './types';

/** 상태별 색. 진행 중만 강조하고 나머지는 결과와 중립으로 나눈다 */
const STATUS_CLASS: Record<ApprovalStatus, string> = {
  DRAFT: 'bg-bg-hover text-text-secondary',
  IN_PROGRESS: 'bg-blue-bg-soft text-text-primary-blue',
  REJECTED: 'bg-red-bg-soft text-text-danger',
  COMPLETED: 'bg-green-bg text-green-text',
};

export default function ApprovalStatusBadge({
  status,
}: {
  status: ApprovalStatus;
}) {
  return (
    /* 라벨 길이가 달라 제목 시작 위치가 어긋나므로 폭을 고정한다 */
    <span
      className={`inline-flex w-16 shrink-0 items-center justify-center rounded-pill px-2 py-0.5 text-detail font-semibold ${STATUS_CLASS[status]}`}
    >
      {APPROVAL_STATUS_LABELS[status]}
    </span>
  );
}
