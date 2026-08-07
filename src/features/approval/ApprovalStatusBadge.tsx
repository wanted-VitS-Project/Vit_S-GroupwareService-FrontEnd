import { APPROVAL_STATUS_LABELS } from '@/constants/status';

import type { ApprovalStatus } from './types';

/** 상태별 색. 진행 중만 강조하고 나머지는 결과(초록·빨강)와 중립으로 나눈다 */
const STATUS_CLASS: Record<ApprovalStatus, string> = {
  DRAFT: 'bg-[#ECEEF4] text-[#6C7389]',
  IN_PROGRESS: 'bg-[#EEF2FF] text-[#3B5BDB]',
  REJECTED: 'bg-[#FEF2F2] text-[#E7000B]',
  COMPLETED: 'bg-[#ECFDF3] text-[#12B76A]',
};

export default function ApprovalStatusBadge({
  status,
}: {
  status: ApprovalStatus;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[status]}`}
    >
      {APPROVAL_STATUS_LABELS[status]}
    </span>
  );
}
