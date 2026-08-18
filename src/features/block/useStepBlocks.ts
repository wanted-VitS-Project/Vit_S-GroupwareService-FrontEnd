'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getStepBlocksResponse } from './api';
import type { StepBlock } from './types';

/** 스텝 하나의 블록 목록 캐시 키. 스텝마다 따로 담긴다 */
export function stepBlocksKey(stepId: number | string) {
  return ['step-blocks', String(stepId)] as const;
}

// 스텝 블록 목록 — 조회·캐시·재조회를 한 곳에서 맡는다.
// 캐시에는 응답 원본({ blocks })이 들어가고 select 가 배열만 꺼내 준다.
// select 는 캐시 데이터를 가공할 뿐 네트워크를 나누지 않는다 —
// 서버에 "바뀐 블록만" 주는 파라미터가 없어 요청은 언제나 스텝 전체다.
// select 에서 정렬하지 않는다. 드래그로 바뀐 순서를 캐시에 꽂는 경로가 있어
// (useSetStepBlocks) 여기서 다시 세우면 배치가 한 박자 흔들린다.
// 꽂는 쪽은 좌표까지 화면 기준으로 새겨 넣는다 (blockLayout.renumber) —
// 저장 전이라도 목록의 순서와 좌표가 서로 어긋나지 않는다.
// 정렬은 화면을 그리는 BlockBoard 가 toFlatOrder() 로 맡는다.
export function useStepBlocks(stepId: string) {
  return useQuery({
    queryKey: stepBlocksKey(stepId),
    queryFn: ({ signal }) => getStepBlocksResponse(stepId, signal),
    select: (data) => data.blocks,
    // 경로에 스텝이 없는 순간(라우팅 전환 중)에는 부르지 않는다
    enabled: Boolean(stepId),
  });
}

// 캐시의 블록 목록을 직접 갈아끼운다 — 서버에 다녀오지 않는다.
// 드래그로 바뀐 순서처럼 화면이 이미 정답을 아는 변화에만 쓴다.
// 이걸 건너뛰면 다음 블록 추가 가 옛 순서로 자리를 잡는다.
export function useSetStepBlocks(stepId: string) {
  const queryClient = useQueryClient();

  return useCallback(
    (blocks: StepBlock[]) => {
      const key = stepBlocksKey(stepId);
      queryClient.setQueryData(key, { blocks });
      // 캐시에 실제로 들어간 배열을 돌려준다.
      // react-query 는 setQueryData 에도 구조 공유(replaceEqualDeep)를 적용해,
      // 원소가 같아도 순서만 바뀌면 새 참조를 물려준다. 올려보낸 배열로 비교하면
      // 보드가 자기 메아리를 남의 재조회로 오인해 방금 옮긴 순서를 되돌린다.
      return (
        queryClient.getQueryData<{ blocks: StepBlock[] }>(key)?.blocks ?? blocks
      );
    },
    [queryClient, stepId],
  );
}

// 이 스텝의 블록 캐시를 버리고 다시 읽는다.
// 새로고침 버튼·블록 생성/삭제 알림이 부른다. 무효화 대상이 이 키 하나라
// 블록 영역만 다시 그려지고 나머지 화면은 건드리지 않는다.
export function useRefreshStepBlocks(stepId: string) {
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: stepBlocksKey(stepId) }),
    [queryClient, stepId],
  );
}
