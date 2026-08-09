'use client';

import { useEffect, useRef, useState } from 'react';

import { getAnalysis } from './api';
import {
  type Analysis,
  isRunning,
  POLL_DELAY_MS,
  POLL_INTERVAL_MS,
  POLL_SLOW_AFTER_MS,
} from './types';

interface PollingState {
  analysis: Analysis | null;
  /** 조회 자체가 실패했을 때만 값이 있다 (분석 실패는 `analysis.errorMessage`) */
  loadError: string;
  /** 2분을 넘겨 "예상보다 지연" 문구로 바꿔야 하는지 */
  isSlow: boolean;
}

/**
 * 분석 하나를 끝날 때까지 지켜본다.
 *
 * 서버가 완료를 밀어주는 통로(WebSocket · SSE)가 없어 폴링한다. 대신
 * **요청 직후 15초는 쉬고**(그 구간은 거의 항상 `PROCESSING` 이라 왕복이 낭비다),
 * 그 뒤부터 3초 간격으로 본다. 종료 상태가 되면 스스로 멈춘다.
 *
 * `justRequested` 는 방금 이 화면에서 요청을 넣었다는 뜻이다. 이미 돌고 있던
 * 분석을 나중에 열었을 때는 15초를 기다릴 이유가 없어 곧바로 조회한다.
 */
export function useAnalysisPolling(
  analysisId: number | null,
  { justRequested = false }: { justRequested?: boolean } = {},
): PollingState {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isSlow, setIsSlow] = useState(false);

  /**
   * 폴링 루프 안에서 읽는 값이라 ref 로 둔다.
   * state 로 두면 매 조회마다 effect 가 다시 돌아 타이머가 초기화된다.
   */
  const shouldStop = useRef(false);

  /**
   * 보던 분석이 바뀌면 **렌더 중에** 값을 비운다.
   *
   * effect 에서 비우면 한 프레임 동안 이전 분석의 결과가 새 분석의 것처럼 남는다 —
   * 재실행 직후 옛 결과가 잠깐 깜빡이게 된다. React 가 권장하는 "props 가 바뀔 때
   * state 조정" 패턴이라 추가 렌더 없이 곧바로 반영된다.
   */
  const [trackedId, setTrackedId] = useState(analysisId);
  if (trackedId !== analysisId) {
    setTrackedId(analysisId);
    setAnalysis(null);
    setLoadError('');
    setIsSlow(false);
  }

  useEffect(() => {
    shouldStop.current = false;

    if (analysisId === null) return;

    const controller = new AbortController();
    const { signal } = controller;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (shouldStop.current || signal.aborted) return;

      try {
        const data = await getAnalysis(analysisId!, signal);
        if (signal.aborted) return;

        setAnalysis(data);
        setLoadError('');

        if (!isRunning(data.analysisStatus)) {
          shouldStop.current = true;
          return;
        }

        setIsSlow(Date.now() - startedAt > POLL_SLOW_AFTER_MS);
      } catch {
        // 취소는 실패가 아니다
        if (signal.aborted) return;

        /*
         * 한 번 실패했다고 폴링을 접지 않는다 — 일시적인 끊김이면 다음 회차에 붙는다.
         * 이미 받아둔 결과가 있으면 그건 그대로 두고 안내만 띄운다.
         */
        setLoadError('분석 상태를 불러오지 못했습니다. 다시 시도 중입니다.');
      }

      if (shouldStop.current || signal.aborted) return;
      // 안 보는 탭에서 3초마다 찔러 봐야 쓸모가 없다 — 돌아올 때 따라잡는다
      if (document.hidden) return;

      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    /** 탭이 다시 보이면 밀린 조회를 즉시 따라잡는다 */
    function resume() {
      if (document.hidden || shouldStop.current || signal.aborted) return;
      clearTimeout(timer);
      void poll();
    }

    document.addEventListener('visibilitychange', resume);
    timer = setTimeout(poll, justRequested ? POLL_DELAY_MS : 0);

    return () => {
      shouldStop.current = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      controller.abort();
    };
  }, [analysisId, justRequested]);

  return { analysis, loadError, isSlow };
}
