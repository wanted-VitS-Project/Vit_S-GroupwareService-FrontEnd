'use client';

import { useEffect, useState } from 'react';

import { getProjectStages, getProjectSteps } from '@/features/project/api';
import type { ProjectStage } from '@/features/project/types';

import { sharedRequest } from './sharedRequest';

/**
 * 스텝을 **스테이지로 묶기 위한** 부가 조회. (명세 7 · 8번)
 *
 * 프로젝트 이슈(108) · 문서함(105) 응답에는 `stageId` 가 없다 — 스텝까지만 알려 준다.
 * 그래서 스테이지 목록과 스텝 목록을 따로 받아 `stepId → stageId` 를 잇는다.
 * (사이드바가 이미 같은 두 API 를 쓰지만 컴포넌트가 달라 값을 넘겨받을 길이 없다)
 *
 * `전체 이슈` 과 `문서함` 이 둘 다 이 훅을 쓰므로 조회를 `sharedRequest` 로 합친다 —
 * 탭을 오갈 때마다 같은 두 요청이 다시 나가던 것을 한 번으로 줄인다.
 *
 * ⚠️ **보조 정보다.** 실패해도 본 목록을 막지 않는다 —
 *    묶지 못하면 스텝을 하나의 묶음으로 그대로 늘어놓는다.
 */

/** `stageId` 가 없는 스텝을 모을 가상 스테이지. `ProjectSidebar` 와 같은 값이다 */
export const UNASSIGNED_STAGE_ID = -1;

/**
 * 이만큼은 다시 읽지 않는다.
 *
 * 스테이지 · 스텝 구성은 자주 바뀌지 않는다. 짧게 잡으면 탭을 오갈 때마다
 * 다시 받게 되고, 길게 잡으면 사이드바에서 스텝을 고친 뒤가 어긋난다.
 */
const STAGE_CACHE_MS = 60_000;

export interface StageIndex {
  /** 순서대로 그릴 스테이지 (서버가 `sortOrder` 로 정렬해 준다) */
  stages: ProjectStage[];
  /** 스텝이 어느 스테이지에 속하는지 */
  stageIdOf: Map<number, number>;
}

function loadStageIndex(projectId: string) {
  return sharedRequest(`stages:${projectId}`, STAGE_CACHE_MS, async () => {
    const [stages, steps] = await Promise.all([
      getProjectStages(projectId),
      getProjectSteps(projectId),
    ]);

    const stageIdOf = new Map<number, number>();
    for (const step of steps) {
      stageIdOf.set(step.stepId, step.stageId ?? UNASSIGNED_STAGE_ID);
    }

    return { stages, stageIdOf } satisfies StageIndex;
  });
}

/**
 * 스테이지 색인과 **판정이 끝났는지**를 함께 돌려준다.
 *
 * ⚠️ `index` 만으로는 `아직 오는 중`과 `실패해서 영영 안 옴`을 구분할 수 없다.
 *    이 훅은 실패를 조용히 삼키므로 실패해도 `index` 는 계속 `null` 이다.
 *    부르는 쪽이 둘을 구분하지 못하면 **먼저 묶지 않은 채 그렸다가**
 *    색인이 뒤늦게 도착하는 순간 목록이 스테이지별로 다시 묶이면서
 *    제목이 끼어들고 높이가 바뀐다 — 화면이 한 번 들썩인다.
 *    `isSettled` 가 참이 될 때까지 첫 그림을 미루면 묶인 모습으로 한 번에 나온다.
 */
export function useProjectStages(projectId: string) {
  const [loaded, setLoaded] = useState<{
    projectId: string;
    index: StageIndex | null;
  } | null>(null);

  useEffect(() => {
    /*
     * 요청을 여럿이 나눠 쓰므로 끊지 않고 **결과만 버린다** (`sharedRequest` 참고).
     * 경로를 옮긴 뒤 도착한 이전 프로젝트의 값이 화면에 들어가지 않게 한다.
     */
    let isStale = false;

    loadStageIndex(projectId)
      .then((index) => {
        if (!isStale) setLoaded({ projectId, index });
      })
      /*
       * 묶기에 실패해도 목록은 보여야 한다 — 색인을 `null` 로 두고 **판정은 끝났다고**
       * 기록한다. 기록하지 않으면 부르는 쪽이 영영 오지 않을 값을 기다리며
       * 로딩 껍데기에 갇힌다.
       */
      .catch(() => {
        if (!isStale) setLoaded({ projectId, index: null });
      });

    return () => {
      isStale = true;
    };
  }, [projectId]);

  // 다른 프로젝트의 값은 쓰지 않는다 — 경로가 바뀌면 다시 기다리는 상태로 돌아간다
  const current = loaded?.projectId === projectId ? loaded : null;

  return { index: current?.index ?? null, isSettled: current !== null };
}

export interface StageGroup<T> {
  stageId: number;
  name: string;
  items: T[];
}

/**
 * 스텝 단위 목록을 스테이지로 묶는다.
 *
 * - 스테이지 순서는 `index.stages` 를 따른다 (서버 `sortOrder`)
 * - 비어 있는 스테이지는 **그리지 않는다** — 이슈도 문서도 없는 칸이 늘어서면 훑기가 어렵다
 * - `index` 가 아직 없거나 실패했으면 **묶지 않은 한 덩어리**로 돌려준다
 *
 * ⚠️ 매 렌더 새 배열을 만든다 — 부르는 쪽에서 `useMemo` 로 감싼다.
 */
export function groupByStage<T>(
  items: T[],
  stepIdOf: (item: T) => number,
  index: StageIndex | null,
): StageGroup<T>[] {
  if (!index || items.length === 0) {
    return [{ stageId: UNASSIGNED_STAGE_ID, name: '', items }];
  }

  const buckets = new Map<number, T[]>();
  for (const item of items) {
    const stageId = index.stageIdOf.get(stepIdOf(item)) ?? UNASSIGNED_STAGE_ID;
    const bucket = buckets.get(stageId);
    if (bucket) bucket.push(item);
    else buckets.set(stageId, [item]);
  }

  const groups: StageGroup<T>[] = [];
  for (const stage of index.stages) {
    const bucket = buckets.get(stage.stageId);
    if (bucket)
      groups.push({ stageId: stage.stageId, name: stage.name, items: bucket });
  }

  // 스테이지가 없는 스텝은 맨 뒤에 모은다 (사이드바의 `미분류` 와 같은 규칙)
  const unassigned = buckets.get(UNASSIGNED_STAGE_ID);
  if (unassigned) {
    groups.push({
      stageId: UNASSIGNED_STAGE_ID,
      name: '미분류',
      items: unassigned,
    });
  }

  return groups;
}
