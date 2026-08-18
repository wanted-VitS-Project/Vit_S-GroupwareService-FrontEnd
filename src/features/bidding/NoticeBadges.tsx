import {
  DEADLINE_TONE_CLASS,
  NOTICE_STATUS_CLASS,
  NOTICE_STATUS_LABELS,
  toDeadlineBadge,
} from './display';
import type { NoticeStatus } from './types';

/** 모양은 globals.css 의 공용 .badge, 색만 display.ts 에서 고른다 */
const BADGE_BASE = 'badge shrink-0';

/** 공고 검토 상태. 전환 여부와 다른 축이라 따로 그린다 */
export function NoticeStatusBadge({ status }: { status: NoticeStatus }) {
  return (
    <span className={`${BADGE_BASE} ${NOTICE_STATUS_CLASS[status]}`}>
      {NOTICE_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * 투찰 마감 배지. dDay 가 없는 공고는 아무것도 그리지 않는다.
 * - 를 배지 모양으로 그리면 상태가 있는 것처럼 읽힌다.
 */
export function DeadlineBadge({ dDay }: { dDay: number | null }) {
  const badge = toDeadlineBadge(dDay);
  if (badge.tone === 'none') return null;

  return (
    <span className={`${BADGE_BASE} ${DEADLINE_TONE_CLASS[badge.tone]}`}>
      {badge.label}
    </span>
  );
}

/**
 * 프로젝트 전환 여부. 대부분이 미전환이라 미전환은 배지를 만들지 않는다.
 */
export function ConvertedBadge({ projectId }: { projectId: number | null }) {
  if (projectId === null) return null;

  return <span className={`${BADGE_BASE} badge-green`}>전환됨</span>;
}
