'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getProjectSteps } from './api';

// 스텝 목록은 좀처럼 바뀌지 않는다 — 블록(30초)보다 훨씬 길게 잡는다.
// 길어도 낡은 값이 남지 않는 이유는 바뀌는 순간을 전부 잡고 있어서다 —
// 스텝 편집(ProjectSidebar.reload)·이슈 변경(진척률)·블록 새로고침 버튼이
// 모두 useRefreshProjectSteps() 로 무효화한다.
const PROJECT_STEPS_STALE_MS = 5 * 60_000;

/** 프로젝트 스텝 목록 캐시 키 */
export function projectStepsKey(projectId: number | string) {
  return ['project-steps', String(projectId)] as const;
}

// 프로젝트 스텝 목록 전체 — 사이드바가 쓴다.
// useStepName 과 같은 캐시를 본다. 스텝 화면에서는 사이드바와 블록 헤더가
// 나란히 떠 있는데, 둘이 각자 조회하면 같은 목록을 두 번 받는다.
export function useProjectSteps(projectId: string) {
  return useQuery({
    queryKey: projectStepsKey(projectId),
    queryFn: ({ signal }) => getProjectSteps(projectId, signal),
    staleTime: PROJECT_STEPS_STALE_MS,
    enabled: Boolean(projectId),
  });
}

// 스텝 이름 하나.
// 스텝 상세 조회 API 가 없어 프로젝트 스텝 목록에서 찾아 쓴다. 목록 자체는 캐시에
// 한 벌만 담기고, select 가 거기서 이름 한 줄만 꺼낸다 — 목록의 다른 스텝이 바뀌어도
// 이 문자열이 그대로면 부르는 쪽은 다시 그리지 않는다.
// 이름은 보조 정보라 실패해도 빈 문자열로 끝낸다. 블록 화면을 막지 않는다.
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

// 이 스텝을 고칠 수 있는지 — 블록 추가·배치 편집·블록 수정의 단일 판정.
// 이름과 같은 캐시(projectStepsKey)를 보고 myPermission 한 줄만 꺼낸다 —
// 조회가 따로 나가지 않는다. 스텝 권한은 프로젝트 권한과 다를 수 있어
// (스텝별 오버라이드, STP-011) 프로젝트 쪽 값으로 대신 판정하면 안 된다.
// 아직 모를 때(undefined)는 false 로 떨어진다 — 권한이 없는 사람에게
// 버튼이 잠깐 보였다 사라지는 것보다, 있는 사람에게 늦게 나타나는 편이 안전하다.
// (눌러 놓고 403 을 받는 일이 없다)
export function useStepCanEdit(projectId: string, stepId: string) {
  const { data } = useQuery({
    queryKey: projectStepsKey(projectId),
    queryFn: ({ signal }) => getProjectSteps(projectId, signal),
    select: (steps) =>
      steps.find((step) => String(step.stepId) === stepId)?.myPermission,
    staleTime: PROJECT_STEPS_STALE_MS,
    enabled: Boolean(projectId && stepId),
  });

  return data === 'EDITOR';
}

// 스텝 목록 캐시를 버리고 다시 읽는다.
// 스텝을 만들거나 이름·순서·상태를 고친 직후(ProjectSidebar.reload)와
// 블록 새로고침 버튼이 부른다.
export function useRefreshProjectSteps(projectId: string) {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: projectStepsKey(projectId) }),
    [queryClient, projectId],
  );
}
