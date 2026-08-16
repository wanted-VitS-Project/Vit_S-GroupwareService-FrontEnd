/**
 * 수집 조건 · 수집 실행 표기 규칙 단일 소스.
 * 조건 목록 · 실행 결과 패널이 같은 문구와 색을 쓰도록 여기에 모은다.
 */

import type { CollectionRunStatus } from './types';

/**
 * 실행 상태 문구.
 *
 * ⚠️ 요구사항 문서의 `RUNNING` · `SUCCESS` 가 아니라 **백엔드 실제 값 4개**를 쓴다
 *    (`PENDING` · `PROCESSING` · `COMPLETED` · `FAILED`).
 */
export const RUN_STATUS_LABELS: Record<CollectionRunStatus, string> = {
  PENDING: '대기 중',
  PROCESSING: '수집 중',
  COMPLETED: '완료',
  FAILED: '실패',
};

/** 색은 `globals.css` 의 공용 `.badge-*` 팔레트를 그대로 쓴다 */
export const RUN_STATUS_CLASS: Record<CollectionRunStatus, string> = {
  PENDING: 'badge-gray',
  PROCESSING: 'badge-yellow',
  COMPLETED: 'badge-green',
  FAILED: 'badge-red',
};

/** 아직 끝나지 않은 상태 — 이 동안만 폴링한다 */
export function isRunning(status: CollectionRunStatus) {
  return status === 'PENDING' || status === 'PROCESSING';
}

/**
 * 자동 수집 주기 문구.
 * 실측된 두 값만 문구를 두고, 모르는 값은 코드를 그대로 보여준다 (조용히 비우지 않는다).
 */
const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  DAILY: '매일',
  WEEKDAYS: '평일',
};

export function formatSchedule(
  scheduleType: string | null,
  scheduledTime: string | null,
) {
  if (!scheduleType) return '수동';

  const label = SCHEDULE_TYPE_LABELS[scheduleType] ?? scheduleType;
  // 응답은 `09:00:00` 이라 초를 떼고 보여준다
  const time = scheduledTime?.slice(0, 5);

  return time ? `${label} ${time}` : label;
}

/**
 * 수집 결과 한 줄 요약.
 *
 * ⚠️ `COMPLETED` + 0건은 **실패가 아니다** — 조건에 맞는 공고가 없었다는 뜻이라
 *    실패 문구와 섞이지 않게 따로 말한다.
 */
export function summarizeRun(collectedCount: number, insertedCount: number) {
  if (collectedCount === 0) return '조건에 맞는 공고가 없습니다.';
  return `${collectedCount}건을 수집해 ${insertedCount}건을 새로 저장했습니다.`;
}
