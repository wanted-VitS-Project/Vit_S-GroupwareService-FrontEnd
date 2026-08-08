'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { isAbortError, messageOf } from '@/lib/api';

import { getStepActivityLogs } from './api';
import type { ActivityLog } from './types';

/** 커서 페이지네이션 상태. 어느 조회 조건의 결과인지 함께 들고 있는다 */
interface LoadedLogs {
  key: string;
  /** 같은 스텝 안에서 조건만 바뀐 것인지 가리는 데 쓴다 */
  stepId: string;
  /** 이 목록이 어느 블록의 결과인지. 전체 조회면 `undefined` */
  blockId: number | undefined;
  logs: ActivityLog[];
  nextCursor: number | null;
  hasNext: boolean;
}

/**
 * 활동 기록 목록 + 커서 이어 읽기. 스텝 화면과 블록 팝업이 같은 규칙을 쓴다. (.ai/API.md 72번)
 *
 * `blockId` 를 주면 그 블록의 기록만 본다 — **블록 전용 API 는 없다.**
 *
 * 조건이 바뀌어도 목록을 지우지 않는다. 지우고 스켈레톤을 다시 띄우면 화면이 통째로
 * 깜빡여서, 직전 목록을 띄운 채 새 조건을 부르고 도착하면 갈아끼운다.
 */
export function useActivityLogFeed(
  stepId: string,
  blockId?: number,
  options?: {
    /**
     * 감시 지점을 재는 스크롤 영역. 팝업처럼 **자체 스크롤**을 가진 곳에서 넘긴다.
     * 없으면 화면(viewport) 기준.
     */
    root?: Element | null;
  },
) {
  const [loaded, setLoaded] = useState<LoadedLogs | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  /** 값이 바뀌면 첫 페이지부터 다시 불러온다 */
  const [reloadCount, setReloadCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  /** 이어 읽기 실패처럼 화면을 막지 않는 오류 */
  const [errorMessage, setErrorMessage] = useState('');

  /** 조회 조건 — 스텝이나 블록이 바뀌면 이전 응답은 통째로 버린다 */
  const requestKey = `${stepId}:${blockId ?? 'all'}`;

  useEffect(() => {
    const controller = new AbortController();

    getStepActivityLogs(stepId, { blockId, signal: controller.signal })
      .then((page) => {
        setLoaded({
          key: requestKey,
          stepId,
          blockId,
          logs: page.activities,
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
        });
        setFailedKey((failed) => (failed === requestKey ? null : failed));
        setErrorMessage('');
      })
      .catch((caught) => {
        // 취소는 실패가 아니다
        if (!isAbortError(caught)) setFailedKey(requestKey);
      });

    return () => controller.abort();
    // stepId · blockId 는 requestKey 에서 파생된 값이라 의존성에 따로 넣지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, reloadCount]);

  // 다른 조건의 응답은 쓰지 않는다 — 조회 · 이어 읽기는 항상 이 값만 본다
  const current = loaded?.key === requestKey ? loaded : null;
  const hasFailed = failedKey === requestKey;

  /**
   * 같은 스텝에서 조건만 바꾼 경우의 **직전 목록**. 그리기에만 쓴다.
   * (사이드바 진척률 갱신에서 정한 규칙과 같다 — `loaded` 를 비우지 않는다)
   * 스텝이 바뀐 경우는 아예 다른 화면이라 그대로 스켈레톤을 보여준다.
   */
  const previous =
    loaded && loaded.key !== requestKey && loaded.stepId === stepId
      ? loaded
      : null;

  const visible = current ?? previous;
  /** 이전 목록을 띄운 채 새 조건을 불러오는 중 */
  const isSwitching = current === null && previous !== null;

  /**
   * 이어 읽기가 나가 있는지. 감시 지점은 스크롤 중 여러 번 걸려
   * state 로만 막으면 같은 커서를 두 번 부른다.
   */
  const loadingMoreRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!current?.hasNext || current.nextCursor === null) return;

    const key = current.key;
    const cursor = current.nextCursor;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setErrorMessage('');

    try {
      const page = await getStepActivityLogs(stepId, { blockId, cursor });

      setLoaded((prev) => {
        // 기다리는 사이 조건이 바뀌었으면 지금 결과는 버린다
        if (prev === null || prev.key !== key) return prev;

        // 조회 중 새 기록이 쌓여도 같은 항목이 두 번 그려지지 않게 걸러낸다
        const seen = new Set(prev.logs.map((log) => log.activityLogId));
        const added = page.activities.filter(
          (log) => !seen.has(log.activityLogId),
        );

        return {
          ...prev,
          logs: [...prev.logs, ...added],
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
        };
      });
    } catch (caught) {
      if (!isAbortError(caught)) {
        setErrorMessage(
          messageOf(caught, '활동 기록을 더 불러오지 못했습니다.'),
        );
      }
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [current, stepId, blockId]);

  /** 목록 맨 아래 감시 지점. 붙였다 뗐다 해야 해서 콜백 ref 로 받는다 */
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  const root = options?.root ?? null;

  useEffect(() => {
    if (!sentinel || !current?.hasNext) return;
    // 이어 읽기가 실패한 상태에서는 자동으로 다시 부르지 않는다 — 무한 재시도가 된다
    if (errorMessage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      // 바닥에 닿기 전에 미리 부른다
      { root, rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, current?.hasNext, errorMessage, loadMore, root]);

  const retry = useCallback(() => {
    setFailedKey(null);
    setReloadCount((count) => count + 1);
  }, []);

  return {
    /** 지금 그릴 목록. 첫 조회 전이면 `null` */
    visible,
    /** 이전 목록을 띄운 채 새 조건을 부르는 중 */
    isSwitching,
    /** 첫 조회 실패 — 목록을 못 그린다 */
    hasFailed,
    isLoadingMore,
    /** 이어 읽기 실패 문구 — 목록은 그대로 둔다 */
    errorMessage,
    loadMore,
    retry,
    setSentinel,
  };
}
