'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { BLOCK_CHANGED_EVENT } from './events';
import { STEP_BLOCKS_KEY_ROOT } from './useStepBlocks';

// 블록 변경 알림을 앱 어디서 쏘든 블록 목록 캐시를 낡은 것으로 표시한다.
// StepBlocks 도 같은 이벤트를 듣지만 그 화면이 떠 있을 때만이라, 재무 화면에서
// 연결하면 아무도 듣지 않고 staleTime 안에 돌아온 보드가 옛 값을 그대로 그렸다.
export default function BlockCacheSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleChanged() {
      void queryClient.invalidateQueries({ queryKey: STEP_BLOCKS_KEY_ROOT });
    }

    window.addEventListener(BLOCK_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(BLOCK_CHANGED_EVENT, handleChanged);
  }, [queryClient]);

  return null;
}
