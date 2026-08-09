'use client';

import { useEffect, useRef, useState } from 'react';

import { getAnalysis } from './api';
import {
  type Analysis,
  isRunning,
  POLL_DELAY_MS,
  POLL_INTERVAL_MS,
  POLL_MAX_BACKOFF_MS,
  POLL_SLOW_AFTER_MS,
} from './types';

interface PollingState {
  analysis: Analysis | null;
  /** 조회 자체가 실패했을 때만 값이 있다 (분석 실패는 `analysis.errorMessage`) */
  loadError: string;
  /** 2분을 넘겨 "예상보다 지연" 문구로 바꿔야 하는지 */
  isSlow: boolean;
}

/** 서버 시각 문자열 → epoch ms. 못 읽으면 NaN */
function parseServerTime(value: string | undefined) {
  if (!value) return Number.NaN;
  // `2026-08-04 14:05:00` · `2026-08-04T14:05:00` 두 모양이 모두 온다
  return Date.parse(value.replace(' ', 'T'));
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
   * 재실행 직후 옛 결과가 잠깐 깜빡이게 된다.
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
    // 좁힌 값을 상수로 둔다 — 아래에서 논널 단언을 쓰지 않기 위해
    const id = analysisId;

    const controller = new AbortController();
    const { signal } = controller;
    /** 서버가 준 요청 시각을 못 읽을 때 쓰는 대비값 */
    const openedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    /**
     * 조회가 도는 중인지.
     *
     * 응답을 기다리는 동안에는 대기 타이머가 없어서, 그때 탭을 껐다 켜면
     * `resume` 의 `clearTimeout` 이 아무것도 못 지우고 **두 번째 루프**가 함께 돈다.
     * 탭 전환을 반복할수록 요청이 배로 늘어난다.
     */
    let isPolling = false;
    /** 연속 실패 횟수 — 서버가 죽어 있을 때 3초마다 두드리지 않도록 */
    let failureCount = 0;

    /**
     * 지연 판정에 쓸 경과 시간.
     *
     * 화면을 연 시각이 아니라 **분석을 요청한 시각**이 기준이어야 한다. 이미 돌던
     * 분석을 나중에 열면 화면 기준으로는 방금 시작한 것처럼 보인다.
     * 서버·클라이언트 시계가 어긋나 값이 터무니없으면 화면 기준으로 되돌린다.
     */
    function elapsedOf(createdAt: string | undefined) {
      const requestedAt = parseServerTime(createdAt);
      const elapsed = Date.now() - requestedAt;
      const isTrustworthy =
        !Number.isNaN(requestedAt) && elapsed >= 0 && elapsed < 60 * 60_000;

      return isTrustworthy ? elapsed : Date.now() - openedAt;
    }

    function nextDelay() {
      if (failureCount === 0) return POLL_INTERVAL_MS;
      return Math.min(
        POLL_INTERVAL_MS * 2 ** failureCount,
        POLL_MAX_BACKOFF_MS,
      );
    }

    async function poll() {
      if (shouldStop.current || signal.aborted || isPolling) return;
      isPolling = true;

      try {
        const data = await getAnalysis(id, signal);
        if (signal.aborted) return;

        failureCount = 0;
        setAnalysis(data);
        setLoadError('');

        if (!isRunning(data.analysisStatus)) {
          shouldStop.current = true;
          return;
        }

        setIsSlow(elapsedOf(data.createdAt) > POLL_SLOW_AFTER_MS);
      } catch {
        // 취소는 실패가 아니다
        if (signal.aborted) return;

        /*
         * 한 번 실패했다고 폴링을 접지 않는다 — 일시적인 끊김이면 다음 회차에 붙는다.
         * 이미 받아둔 결과가 있으면 그건 그대로 두고 안내만 띄운다.
         */
        failureCount += 1;
        setLoadError('분석 상태를 불러오지 못했습니다. 다시 시도 중입니다.');
      } finally {
        isPolling = false;
      }

      if (shouldStop.current || signal.aborted) return;
      // 안 보는 탭에서 3초마다 찔러 봐야 쓸모가 없다 — 돌아올 때 따라잡는다
      if (document.hidden) return;

      timer = setTimeout(poll, nextDelay());
    }

    /** 탭이 다시 보이면 밀린 조회를 즉시 따라잡는다 */
    function resume() {
      if (document.hidden || shouldStop.current || signal.aborted) return;
      // 이미 도는 중이면 그 회차가 끝나고 알아서 다음을 건다
      if (isPolling) return;

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
