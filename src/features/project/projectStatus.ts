import type { ProjectStatus } from './types';

/**
 * 상태별 뱃지 색. 값은 디자인 시안 기준이다.
 *
 * ⚠️ 진척 바는 여기서 빠져 있다 — **상태와 무관하게 한 색**이고,
 * 채운 길이로만 진행도를 읽힌다.
 */
export const PROJECT_STATUS_STYLE: Record<ProjectStatus, { badge: string }> = {
  NOT_STARTED: { badge: 'bg-[#F3F4F6] text-[#6B7280]' },
  IN_PROGRESS: { badge: 'bg-[#EDF4FF] text-[#3B6FF6]' },
  SETTLEMENT: { badge: 'bg-[#FFF7E6] text-[#D97706]' },
  COMPLETED: { badge: 'bg-[#ECFDF3] text-[#16A34A]' },
  CLOSED: { badge: 'bg-[#F5F3FF] text-[#7C3AED]' },
};

/**
 * 통계 카드에 세우는 상태.
 * `전체` 카드는 **이 네 값의 합**이라 종결(`CLOSED`)은 전체에서 빠진다 —
 * 카드로 세우지 않는 상태를 합계에만 넣으면 카드끼리 수가 맞지 않는다.
 */
export const PROJECT_SUMMARY_STATUSES: ProjectStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SETTLEMENT',
  'COMPLETED',
];

/** 상태 필터 탭. 통계 카드와 달리 종결(`CLOSED`) 건도 다시 볼 수 있어야 한다 (PRJ-015) */
export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SETTLEMENT',
  'COMPLETED',
  'CLOSED',
];
