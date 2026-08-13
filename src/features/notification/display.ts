import { APPROVAL_ROUTES } from '@/features/approval/routes';
import { PROJECT_ROUTES } from '@/features/project/routes';

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
    className: 'bg-blue-bg-soft text-text-primary-blue',
  },
  APPROVAL_REJECTED: {
    symbol: '⊗',
    className: 'bg-red-bg-soft text-text-danger',
  },
  APPROVAL_COMPLETED: { symbol: '✓', className: 'bg-green-bg text-[#12B76A]' },
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
 * 이동 대상을 화면 경로로 바꾼다. 갈 곳이 없으면 `null`.
 *
 * 서버는 도메인을 가리지 않는 `type` · `targetId` 만 주므로 **경로 조립은 프론트 몫**이다.
 * `NONE` 도, 아직 화면이 없는 종류도 여기서 `null` 이 되고 — 그때는 이동하지 않고
 * 읽음 처리만 남는다 (이동 대상 조회가 읽음을 겸한다).
 */
export function routeOf(target: NotificationTarget) {
  switch (target.type) {
    case 'APPROVAL':
      return target.targetId === null
        ? null
        : APPROVAL_ROUTES.detail(target.targetId);

    /**
     * 이슈 알림. **`targetId`(이슈 ID)만으로는 갈 곳을 못 만든다** —
     * 이슈 단독 화면이 없고 `프로젝트 > 스텝 > 이슈` 안에 있어서다.
     * 그래서 `extra` 의 `projectId` · `stepId` 를 함께 본다 (2026-08-12 실측 확인).
     *
     * 보드까지만 데려가면 **어느 이슈였는지는 사용자가 다시 찾아야 한다** —
     * `targetId` 를 쿼리로 넘겨 그 이슈의 상세 모달이 열린 채로 도착하게 한다.
     */
    case 'ISSUE': {
      const projectId = pickId(target.extra, 'projectId');
      if (projectId === null) return null;

      const stepId = pickId(target.extra, 'stepId');

      // 스텝을 모르면 프로젝트까지만 데려간다 — 아무 데도 못 가는 것보다 낫다
      if (stepId === null) return PROJECT_ROUTES.detail(projectId);

      // 이슈 ID 를 못 믿으면 보드까지만 — 없는 이슈로 빈 모달을 띄우지 않는다
      const issueId = toPositiveId(target.targetId);

      return PROJECT_ROUTES.stepIssues(projectId, stepId, issueId ?? undefined);
    }

    default:
      return null;
  }
}

/**
 * `extra` 에서 ID 를 꺼낸다.
 *
 * ⚠️ 명세는 `Record<string, string>` 이지만 **실제로는 숫자가 온다.** 둘 다 받아들인다.
 * ⚠️ **양의 정수만** 통과시킨다 — 공백 · 음수 · 소수 · 지수 표기(`1e3`)가 그대로 경로에
 *    들어가면 없는 화면으로 보내게 된다. 통과한 값은 `String(숫자)` 로 정규화한다.
 */
function pickId(
  extra: NotificationTarget['extra'],
  key: string,
): string | null {
  return toPositiveId(extra?.[key]);
}

/**
 * 경로에 넣어도 되는 ID 인지 확인하고 문자열로 정규화한다.
 * 통과하지 못하면 `null` — 부르는 쪽이 한 단계 위 화면으로 떨어뜨린다.
 *
 * ⚠️ **`Number()` 에 곧바로 넘기지 않는다.** `true` · `[1]` 은 `1` 이 되고
 *    `'0x10'` 은 `16` 이 되어, 잘못된 응답이 **엉뚱한 프로젝트 · 스텝 · 이슈**를 연다.
 *    숫자이거나 **10진수 숫자만으로 된 문자열**일 때만 통과시킨다.
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
