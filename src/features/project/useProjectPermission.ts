'use client';

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { ProjectPermission } from './types';

/**
 * **이 프로젝트에서 내 권한**을 화면끼리 나눠 쓰는 자리.
 *
 * 권한 배지는 사이드바 안에만 있었는데, 좁은 화면(1024px 미만)에서는 사이드바가
 * 자리에서 빠지고 데스크톱에서도 접으면 사라져 **정작 확인이 필요한 상황에서 안 보였다**
 * (2026-08-16). 탭바에도 세우려면 값이 사이드바 밖으로 나와야 한다.
 *
 * ⚠️ **조회를 새로 하지 않는다.** `ProjectSidebar` 가 이미 받아 둔 값을 캐시에 얹고
 *    (`usePublishProjectPermission`), 탭바는 그 칸을 읽기만 한다(`useProjectPermission`).
 *    탭바가 자기 `queryFn` 을 들면 화면마다 `GET /projects/{id}` 가 한 번 더 나간다 —
 *    사이드바는 프로젝트 하위 전 화면에 항상 떠 있으므로 값은 곧 도착한다.
 *    아직 없으면 `null` 이고, 배지는 `null` 이면 아무것도 그리지 않는다.
 */

/** 권한 한 칸 캐시 키 — 프로젝트 상세 캐시와 섞이지 않게 따로 둔다 */
export function projectPermissionKey(projectId: string) {
  return ['project-permission', projectId] as const;
}

/**
 * 캐시에 담긴 내 권한을 읽는다. **요청은 나가지 않는다** (`enabled: false`).
 * 아직 사이드바가 못 받았으면 `null`.
 */
export function useProjectPermission(projectId: string) {
  const { data } = useQuery<ProjectPermission>({
    queryKey: projectPermissionKey(projectId),
    /*
      이 훅은 캐시를 **읽기만** 한다 — 채우는 쪽은 아래 `usePublishProjectPermission` 이다.
      ⚠️ `enabled: false` 만으로는 부족하다. `queryFn` 이 없으면 react-query 가
         "queryFn 이 없다" 며 콘솔에 오류를 남긴다 — 조회하지 않겠다는 뜻은
         `skipToken` 으로 밝힌다.
    */
    queryFn: skipToken,
  });

  return data ?? null;
}

/**
 * 받아 둔 권한을 캐시에 얹는다 — `ProjectSidebar` 가 부른다.
 *
 * 값이 **달라질 때만** 쓴다 (`useEffect` 의 의존성). 렌더마다 `setQueryData` 를 부르면
 * 같은 값이어도 구독자가 매번 다시 그려진다.
 */
export function usePublishProjectPermission(
  projectId: string,
  permission: ProjectPermission | null | undefined,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!permission) return;
    queryClient.setQueryData(projectPermissionKey(projectId), permission);
  }, [queryClient, projectId, permission]);
}
