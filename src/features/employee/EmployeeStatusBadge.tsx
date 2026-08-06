import {
  type EmployeeStatus,
  EMPLOYEE_STATUS_LABELS,
} from '@/constants/status';

import type { EmployeeSummary } from './types';

/**
 * 두 원본 값을 배지 하나로 합친다.
 * 퇴사 > 정지 > 재설정 필요 순으로 본다 — 퇴사자는 계정도 함께 비활성되기 때문이다.
 */
export function employeeStatusOf({
  accountStatus,
  passwordStatus,
  resignedAt,
}: EmployeeSummary): EmployeeStatus {
  if (resignedAt) return 'RESIGNED';
  if (accountStatus === 'INACTIVE') return 'INACTIVE';
  if (passwordStatus === 'RESET_REQUIRED') return 'RESET_REQUIRED';
  return 'ACTIVE';
}

const BADGE_STYLES: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-[#12B76A]/10 text-[#087443]',
  RESET_REQUIRED: 'bg-[#F59E0B]/10 text-[#92400E]',
  INACTIVE: 'bg-[#E7000B]/10 text-[#E7000B]',
  RESIGNED: 'bg-[#ECEEF4] text-[#6C7389]',
};

export default function EmployeeStatusBadge({
  status,
}: {
  status: EmployeeStatus;
}) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${BADGE_STYLES[status]}`}
    >
      {EMPLOYEE_STATUS_LABELS[status]}
    </span>
  );
}
