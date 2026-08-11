'use client';

import { useEffect, useState } from 'react';

import { getStepBlocks } from '@/features/block/api';
import { readImageBlockDetail } from '@/features/block/types';
import { getProjectSteps } from '@/features/project/api';

import { sharedRequest } from './sharedRequest';

/**
 * `imgBlockId → 블록 이름` 표.
 *
 * 프로젝트 이미지 응답(107번)은 `imgBlockId` 만 준다 — 블록 제목이 없어 화면이
 * `블록 #3` 처럼 ID 로 부를 수밖에 없다. 제목은 스텝 블록 목록(10번)에만 있으므로
 * **스텝 수만큼 요청을 더 보내** 표를 만든다.
 *
 * ⚠️ 비싸다 (스텝 N개 → 요청 N+1회). 그래서 네 가지를 지킨다.
 *    1. `enabled` 가 참일 때만 — 블록 이름을 실제로 보여주는 순간에만 부른다
 *    2. `sharedRequest` 로 합친다 — `블록별로 보기` 를 껐다 켜도, 크게 보기를 여닫아도 한 번이다
 *    3. **동시 요청을 4개로 묶는다** — 한꺼번에 띄우면 화면에 필요한 요청까지 밀린다
 *    4. 실패해도 조용히 넘긴다 — 이름을 못 얻으면 화면이 `블록 #3` 으로 되돌아갈 뿐이다
 *
 * ❗ **근본 해결은 백엔드다.** 107번 응답에 `blockTitle` 을 싣거나 `imgBlockId` 목록을 받는
 *    일괄 조회를 열어 주면 이 훅은 통째로 지운다. 위 넷은 그때까지의 임시 방편이다.
 *
 * ⚠️ 키는 `blockId` 가 아니라 **`imgBlockId`** 다 — 이미지 블록은
 *    `블록(blockId) > 블록의 내용(imgBlockId)` 구조라 두 값이 다르다.
 */
export interface ImageBlockName {
  title: string | null;
  stepId: number;
  stepName: string;
}

/** 이만큼은 다시 읽지 않는다. 블록 제목은 자주 바뀌지 않고 조회가 비싸다 */
const NAME_CACHE_MS = 5 * 60_000;

/**
 * 한 번에 나가는 블록 목록 요청 수.
 *
 * `Promise.all` 로 전부 한꺼번에 띄우면 스텝이 스무 개인 프로젝트에서 화면을 여는 순간
 * 요청 스무 개가 동시에 나간다 — 브라우저 연결 한도에 걸려 **화면에 필요한 다른 요청까지 밀린다.**
 * 이름은 늦게 붙어도 되는 보조 정보라 조금씩 나눠 받는다.
 */
const NAME_FETCH_CONCURRENCY = 4;

/** 앞에서부터 `limit` 개씩만 동시에 돌린다. 순서는 입력 그대로 돌려준다 */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await run(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );

  return results;
}

function loadImageBlockNames(projectId: string) {
  return sharedRequest(`imageBlocks:${projectId}`, NAME_CACHE_MS, async () => {
    const steps = await getProjectSteps(projectId);
    const perStep = await mapWithLimit(steps, NAME_FETCH_CONCURRENCY, (step) =>
      getStepBlocks(step.stepId)
        .then((blocks) => ({ step, blocks }))
        // 스텝 하나를 못 읽어도 나머지 이름은 살린다
        .catch(() => ({ step, blocks: [] })),
    );

    const names = new Map<number, ImageBlockName>();
    for (const { step, blocks } of perStep) {
      for (const block of blocks) {
        if (block.type !== 'IMAGE') continue;

        const imgBlockId = readImageBlockDetail(block.detail)?.imgBlockId;
        if (imgBlockId === undefined) continue;

        names.set(imgBlockId, {
          title: block.title,
          stepId: step.stepId,
          stepName: step.name,
        });
      }
    }

    return names;
  });
}

export function useImageBlockNames(projectId: string, enabled: boolean) {
  const [loaded, setLoaded] = useState<{
    projectId: string;
    names: Map<number, ImageBlockName>;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // 요청을 여럿이 나눠 쓰므로 끊지 않고 결과만 버린다 (`sharedRequest` 참고)
    let isStale = false;

    loadImageBlockNames(projectId)
      .then((names) => {
        if (!isStale) setLoaded({ projectId, names });
      })
      // 이름을 못 얻으면 `블록 #3` 으로 되돌아갈 뿐이다
      .catch(() => undefined);

    return () => {
      isStale = true;
    };
  }, [projectId, enabled]);

  return loaded?.projectId === projectId ? loaded.names : null;
}

/** 화면에 적을 블록 이름. 못 찾으면 ID 로 떨어진다 */
export function imageBlockLabel(
  imgBlockId: number,
  names: Map<number, ImageBlockName> | null,
) {
  const found = names?.get(imgBlockId);
  return found?.title?.trim() || `블록 #${imgBlockId}`;
}
