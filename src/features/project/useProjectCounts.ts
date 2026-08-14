'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getProjectCount } from './api';
import { PROJECT_SUMMARY_STATUSES } from './projectStatus';

/**
 * 상태별 프로젝트 건수 — **대시보드와 `내 프로젝트` 가 함께 쓴다.**
 *
 * 두 화면이 같은 4콜을 각자 쏘고 있었다. 필터가 붙지 않아 응답도 늘 같은데,
 * 대시보드에서 `내 프로젝트` 로 넘어가면 **똑같은 요청 4개가 한 번 더** 나갔다.
 * 캐시 한 칸에 모아 두면 화면을 옮겨도 다시 부르지 않는다.
 *
 * ❗ **집계 API 가 없어서 4콜이다.** 상태마다 `size=1` 로 물어 `totalElements` 만 쓴다
 *    (`getProjectCount`). 백엔드에 상태별 집계 엔드포인트가 생기면
 *    **아래 `queryFn` 한 곳만** 갈아끼우면 된다 — 부르는 화면은 건드릴 것이 없다.
 */
export const PROJECT_COUNTS_KEY = ['project-counts'] as const;

export interface ProjectCounts {
  /** `PROJECT_SUMMARY_STATUSES` 와 **같은 순서**다 — 카드가 자리로 맞춰 읽는다 */
  byStatus: number[];
  /**
   * 네 상태의 합.
   *
   * ⭐ 상태 필터 없이 세지 않는다 — 그러면 종결(`CLOSED`)까지 들어가는데
   *    종결은 카드로 세우지 않아 `전체` 가 나머지 넷의 합과 어긋난다. 덤으로 콜도 하나 준다.
   */
  total: number;
}

export function useProjectCounts() {
  return useQuery({
    queryKey: PROJECT_COUNTS_KEY,
    queryFn: async ({ signal }) => {
      const byStatus = await Promise.all(
        PROJECT_SUMMARY_STATUSES.map((status) =>
          getProjectCount(status, signal),
        ),
      );

      return {
        byStatus,
        total: byStatus.reduce((sum, count) => sum + count, 0),
      } satisfies ProjectCounts;
    },
    /**
     * 전역 기본값(30초)보다 길게 잡는다 — 건수는 화면을 오가는 사이에 좀처럼 바뀌지 않고,
     * 한 번 읽는 값이 4콜이라 되도록 덜 부르는 편이 낫다.
     */
    staleTime: 60_000,
  });
}

/**
 * 건수를 다시 읽게 한다. 프로젝트를 만들거나 상태를 바꾼 뒤,
 * 그리고 목록 재시도에서 함께 부른다 (`useRefreshStepBlocks` 와 같은 방식).
 */
export function useRefreshProjectCounts() {
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: PROJECT_COUNTS_KEY }),
    [queryClient],
  );
}
