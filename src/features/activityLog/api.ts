import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import { ACTIVITY_LOG_PAGE_SIZE, type ActivityLogPage } from './types';

// 스텝 활동 기록. 최신순(activityLogId 내림차순)으로 온다.
// blockId 를 넘기면 그 블록의 활동만 온다 — 블록 전용 API 는 없다.
// cursor 는 이전 응답의 nextCursor 를 그대로 넣는다.
export function getStepActivityLogs(
  stepId: number | string,
  options?: {
    blockId?: number;
    cursor?: number | null;
    size?: number;
    signal?: AbortSignal;
  },
) {
  const query = new URLSearchParams();

  if (options?.blockId !== undefined) {
    query.set('blockId', String(options.blockId));
  }
  // 첫 조회에는 커서를 붙이지 않는다 — null 을 문자열로 보내면 400 이다.
  if (options?.cursor !== undefined && options.cursor !== null) {
    query.set('cursor', String(options.cursor));
  }
  query.set('size', String(options?.size ?? ACTIVITY_LOG_PAGE_SIZE));

  return api.get<ActivityLogPage>(
    `${ENDPOINTS.steps.activityLogs(stepId)}?${query}`,
    options?.signal,
  );
}
