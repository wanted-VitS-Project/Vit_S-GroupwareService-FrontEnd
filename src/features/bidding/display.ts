/**
 * 입찰 공고 표기 규칙 단일 소스.
 * 목록 · 상세가 같은 문구와 색을 쓰도록 여기에 모은다.
 */

import type { NoticeStatus } from './types';

/** 공고 검토 상태. 전환 여부(projectId)와 다른 축이다 */
export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  COLLECTED: '수집됨',
  DISMISSED: '제외',
};

/**
 * 제외만 눈에 띄게 한다. 수집됨이 대부분이라 강조할 이유가 없다.
 * 색은 globals.css 의 공용 .badge-* 팔레트를 쓴다.
 */
export const NOTICE_STATUS_CLASS: Record<NoticeStatus, string> = {
  COLLECTED: 'badge-blue',
  DISMISSED: 'badge-gray',
};

/** D-day 표기 종류. 색을 고르는 쪽에서도 쓴다 */
export type DeadlineTone = 'urgent' | 'soon' | 'normal' | 'closed' | 'none';

export interface DeadlineBadge {
  label: string;
  tone: DeadlineTone;
}

/**
 * 마감 배지. dDay 는 서버가 계산한 값이라 그대로 읽는다 (0 이면 D-Day, 음수면 마감).
 * 마감일이 없는 공고는 none 이라 배지를 그리지 않는다.
 */
export function toDeadlineBadge(dDay: number | null): DeadlineBadge {
  if (dDay === null) return { label: '', tone: 'none' };
  if (dDay < 0) return { label: '마감', tone: 'closed' };
  if (dDay === 0) return { label: 'D-Day', tone: 'urgent' };

  // 3일 이내는 준비 시간이 없어 색을 달리한다
  return {
    label: `D-${dDay}`,
    tone: dDay <= 3 ? 'urgent' : dDay <= 7 ? 'soon' : 'normal',
  };
}

export const DEADLINE_TONE_CLASS: Record<DeadlineTone, string> = {
  urgent: 'badge-red',
  soon: 'badge-yellow',
  normal: 'badge-gray',
  closed: 'badge-gray',
  none: '',
};

/**
 * 금액 표기. 340000000 → 340,000,000원
 * 값이 없으면 - 다. 0원 으로 그리면 금액이 0인 공고와 구분되지 않는다.
 */
export function formatAmount(value: number | null) {
  return value === null || value === undefined
    ? '-'
    : `${value.toLocaleString('ko-KR')}원`;
}

/**
 * 큰 금액을 한눈에 읽히게 줄인다. 340000000 → 3.4억
 * 폭이 좁은 목록 표에서만 쓰고 상세에서는 formatAmount 를 쓴다.
 */
export function formatAmountShort(value: number | null) {
  if (value === null || value === undefined) return '-';

  const HUNDRED_MILLION = 100_000_000;
  const TEN_THOUSAND = 10_000;

  if (Math.abs(value) >= HUNDRED_MILLION) {
    // 소수점이 .0 으로 떨어지면 붙이지 않는다 (3억 이 3.0억 보다 읽기 쉽다)
    const 억 = value / HUNDRED_MILLION;
    return `${Number(억.toFixed(1)).toLocaleString('ko-KR')}억`;
  }
  if (Math.abs(value) >= TEN_THOUSAND) {
    return `${Math.round(value / TEN_THOUSAND).toLocaleString('ko-KR')}만`;
  }

  return value.toLocaleString('ko-KR');
}

/** 값이 없는 칸은 - 로 채운다. 빈칸은 로딩 중으로 읽힌다 */
export function orDash(value?: string | null) {
  return value?.trim() ? value : '-';
}
