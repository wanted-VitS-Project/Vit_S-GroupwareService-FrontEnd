'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getProjectSteps } from './api';

/**
 * 스텝 목록은 좀처럼 바뀌지 않는다 — 블록(30초)보다 훨씬 길게 잡는다.
 *
 * 길어도 낡은 값이 남지 않는 이유는 **바뀌는 순간을 전부 잡고 있어서**다 —
 * 스텝 편집(`ProjectSidebar.reload`) · 이슈 변경(진척률) · 블록 새로고침 버튼이
 * 모두 `useRefreshProjectSteps()` 로 무효화한다.
 */
const PROJECT_STEPS_STALE_MS = 5 * 60_000;

/** 프로젝트 스텝 목록 캐시 키 */
export function projectStepsKey(projectId: number | string) {
  return ['project-steps', String(projectId)] as const;
}

/**
 * 프로젝트 스텝 목록 전체 — 사이드바가 쓴다.
 *
 * `useStepName` 과 **같은 캐시**를 본다. 스텝 화면에서는 사이드바와 블록 헤더가
 * 나란히 떠 있는데, 둘이 각자 조회하면 같은 목록을 두 번 받는다.
 */
export function useProjectSteps(projectId: string) {
  return useQuery({
    queryKey: projectStepsKey(projectId),
    queryFn: ({ signal }) => getProjectSteps(projectId, signal),
    staleTime: PROJECT_STEPS_STALE_MS,
    enabled: Boolean(projectId),
  });
}

/**
 * 스텝 이름 하나.
 *
 * 스텝 상세 조회 API 가 없어 **프로젝트 스텝 목록에서 찾아 쓴다.** 목록 자체는 캐시에
 * 한 벌만 담기고, `select` 가 거기서 이름 한 줄만 꺼낸다 — 목록의 다른 스텝이 바뀌어도
 * 이 문자열이 그대로면 부르는 쪽은 **다시 그리지 않는다.**
 *
 * 이름은 보조 정보라 실패해도 빈 문자열로 끝낸다. 블록 화면을 막지 않는다.
 */
export function useStepName(projectId: string, stepId: string) {
  const { data } = useQuery({
    queryKey: projectStepsKey(projectId),
    queryFn: ({ signal }) => getProjectSteps(projectId, signal),
    select: (steps) =>
      steps.find((step) => String(step.stepId) === stepId)?.name ?? '',
    staleTime: PROJECT_STEPS_STALE_MS,
    enabled: Boolean(projectId && stepId),
  });

  return data ?? '';
}

/**
 * 스텝 목록 캐시를 버리고 다시 읽는다.
 *
 * 스텝을 만들거나 이름 · 순서 · 상태를 고친 직후(`ProjectSidebar.reload`)와
 * 블록 새로고침 버튼이 부른다.
 */
export function useRefreshProjectSteps(projectId: string) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: projectStepsKey(projectId) }),
    [queryClient, projectId],
  );
}
