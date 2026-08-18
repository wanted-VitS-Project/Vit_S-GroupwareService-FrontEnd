'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getProjectCount } from './api';
import { PROJECT_SUMMARY_STATUSES } from './projectStatus';

// 상태별 프로젝트 건수 — 대시보드와 내 프로젝트가 같은 캐시 한 칸을 함께 쓴다.
// 상태별 집계 API 가 없어 상태마다 size=1 로 물어 totalElements 만 쓴다(4콜).
// 집계 엔드포인트가 생기면 아래 queryFn 한 곳만 갈아끼우면 된다.
export const PROJECT_COUNTS_KEY = ['project-counts'] as const;

export interface ProjectCounts {
  /** PROJECT_SUMMARY_STATUSES 와 같은 순서 — 카드가 자리로 맞춰 읽는다 */
  byStatus: number[];
  /** 네 상태의 합. 필터 없이 세면 종결(CLOSED)까지 들어가 카드 합과 어긋난다 */
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
    // 전역 기본값(30초)보다 길게 — 건수는 좀처럼 바뀌지 않고 한 번 읽는 값이 4콜이다.
    staleTime: 60_000,
  });
}

// 건수 캐시를 버리고 다시 읽는다. 프로젝트 생성·상태 변경 직후와 목록 재시도에서 부른다.
export function useRefreshProjectCounts() {
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: PROJECT_COUNTS_KEY }),
    [queryClient],
  );
}
