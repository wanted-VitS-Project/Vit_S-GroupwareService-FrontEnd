import { APPROVAL_ROUTES } from '@/features/approval/routes';
import { PROJECT_ROUTES } from '@/features/project/routes';

import type { NotificationTarget, NotificationType } from './types';

/**
 * 시스템 칩 값. 서버가 받는 접두어가 아니라 결재 · 이슈가 아닌 나머지라는 뜻이다.
 * 프로젝트 · 댓글 알림이 여기로 모인다.
 */
export const SYSTEM_CATEGORY = 'SYSTEM';

/** 자기 칩을 가진 접두어. 이 둘만 서버 category 로 걸러 받는다 */
const OWN_CHIP_PREFIXES = ['APPROVAL', 'ISSUE'];

/** 유형 필터 칩. 결재 · 이슈만 서버가 거르고 시스템은 화면이 나눈다 */
export const NOTIFICATION_CATEGORIES = [
  { label: '전체', value: undefined },
  { label: '결재', value: 'APPROVAL' },
  { label: '이슈', value: 'ISSUE' },
  { label: '시스템', value: SYSTEM_CATEGORY },
] as const;

/** 시스템 칩에 넣을 알림인지. 결재 · 이슈가 아니면 모두 시스템이다 */
export function isSystemNotification(notificationType: NotificationType) {
  return !OWN_CHIP_PREFIXES.some((prefix) =>
    notificationType.startsWith(prefix),
  );
}

/** 알림 아이콘 한 개. 기호와 색을 함께 정한다 */
interface NotificationIcon {
  symbol: string;
  /** 동그라미 배경 · 글자색 */
  className: string;
}

/** 종류별 아이콘. 모르는 값은 기본 아이콘으로 떨어진다 */
const ICONS: Record<string, NotificationIcon> = {
  APPROVAL_REQUESTED: {
    symbol: '📄',
    className: 'bg-blue-bg-soft text-text-primary-blue',
  },
  APPROVAL_REJECTED: {
    symbol: '⊗',
    className: 'bg-red-bg-soft text-text-danger',
  },
  APPROVAL_COMPLETED: { symbol: '✓', className: 'bg-green-bg text-green-text' },
  ISSUE_ASSIGNED: {
    symbol: '⚠',
    className: 'bg-yellow-bg-soft text-yellow-text',
  },
  COMMENT_CREATED: {
    symbol: '💬',
    className: 'bg-bg-hover text-text-secondary',
  },
};

const DEFAULT_ICON: NotificationIcon = {
  symbol: '•',
  className: 'bg-bg-hover text-text-secondary',
};

export function iconOf(notificationType: NotificationType) {
  return ICONS[notificationType] ?? DEFAULT_ICON;
}

/**
 * 이동 대상을 화면 경로로 바꾼다. 갈 곳이 없으면 null 이다.
 * 서버는 type · targetId 만 주므로 경로 조립은 프론트가 한다.
 */
export function routeOf(target: NotificationTarget) {
  switch (target.type) {
    case 'APPROVAL':
      return target.targetId === null
        ? null
        : APPROVAL_ROUTES.detail(target.targetId);

    /**
     * 이슈 알림. 이슈 단독 화면이 없어 extra 의 projectId · stepId 를 함께 본다.
     * targetId 는 쿼리로 넘겨 상세 모달이 열린 채로 도착하게 한다.
     */
    case 'ISSUE': {
      const projectId = pickId(target.extra, 'projectId');
      if (projectId === null) return null;

      const stepId = pickId(target.extra, 'stepId');

      // 스텝을 모르면 프로젝트까지만 이동한다
      if (stepId === null) return PROJECT_ROUTES.detail(projectId);

      // 이슈 ID 를 신뢰할 수 없으면 보드까지만 이동한다
      const issueId = toPositiveId(target.targetId);

      return PROJECT_ROUTES.stepIssues(projectId, stepId, issueId ?? undefined);
    }

    default:
      return null;
  }
}

/**
 * extra 에서 ID 를 꺼낸다. 실제 응답은 문자열 · 숫자가 섞여 와 둘 다 받는다.
 * 잘못된 경로로 가지 않도록 양의 정수만 통과시킨다.
 */
function pickId(
  extra: NotificationTarget['extra'],
  key: string,
): string | null {
  return toPositiveId(extra?.[key]);
}

/**
 * 경로에 넣어도 되는 ID 인지 확인하고 문자열로 정규화한다. 아니면 null.
 * Number() 가 엉뚱한 값을 통과시키므로 10진수 형태만 받는다.
 */
function toPositiveId(value: unknown): string | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return String(parsed);
}
