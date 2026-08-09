import { APPROVAL_ROUTES } from '@/features/approval/routes';

import type { NotificationTarget, NotificationType } from './types';

/**
 * 유형 필터 칩. `category` 는 `notificationType` 의 **접두어**를 그대로 받는다.
 *
 * ❗ 확인된 값은 `APPROVAL` 뿐이다 — 나머지 셋은 시안의 칩 이름에서 추론했다.
 * 값이 틀리면 그 칩만 빈 목록이 되고, 여기 한 줄만 고치면 된다.
 */
export const NOTIFICATION_CATEGORIES = [
  { label: '전체', value: undefined },
  { label: '결재', value: 'APPROVAL' },
  { label: '이슈', value: 'ISSUE' },
  { label: '댓글', value: 'COMMENT' },
  { label: '시스템', value: 'SYSTEM' },
] as const;

/** 알림 아이콘 한 개 — 기호와 색을 함께 정한다 */
interface NotificationIcon {
  symbol: string;
  /** 동그라미 배경 · 글자색 */
  className: string;
}

/**
 * 종류별 아이콘. **전체 목록을 받지 못했으므로** 모르는 값은 아래 기본값으로 떨어진다 —
 * 새 알림 종류가 생겨도 화면이 비거나 깨지지 않는다.
 */
const ICONS: Record<string, NotificationIcon> = {
  APPROVAL_REQUESTED: {
    symbol: '📄',
    className: 'bg-[#EEF2FF] text-[#3B5BDB]',
  },
  APPROVAL_REJECTED: { symbol: '⊗', className: 'bg-[#FEF2F2] text-[#E7000B]' },
  APPROVAL_COMPLETED: { symbol: '✓', className: 'bg-[#ECFDF5] text-[#12B76A]' },
  ISSUE_ASSIGNED: { symbol: '⚠', className: 'bg-[#FFFBEB] text-[#BB4D00]' },
  COMMENT_CREATED: { symbol: '💬', className: 'bg-[#ECEEF4] text-[#6C7389]' },
};

const DEFAULT_ICON: NotificationIcon = {
  symbol: '•',
  className: 'bg-[#ECEEF4] text-[#6C7389]',
};

export function iconOf(notificationType: NotificationType) {
  return ICONS[notificationType] ?? DEFAULT_ICON;
}

/**
 * 이동 대상을 화면 경로로 바꾼다. 갈 곳이 없으면 `null`.
 *
 * 서버는 도메인을 가리지 않는 `type` · `targetId` 만 주므로 **경로 조립은 프론트 몫**이다.
 * `NONE` 도, 아직 화면이 없는 종류도 여기서 `null` 이 되고 — 그때는 이동하지 않고
 * 읽음 처리만 남는다 (이동 대상 조회가 읽음을 겸한다).
 */
export function routeOf(target: NotificationTarget) {
  if (target.targetId === null) return null;

  switch (target.type) {
    case 'APPROVAL':
      return APPROVAL_ROUTES.detail(target.targetId);
    default:
      return null;
  }
}
