'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

/** 서버에는 레이아웃이 없다 — 경고를 피하려고 클라이언트에서만 layout effect 를 쓴다 */
const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** 자리를 옮기는 데 걸리는 시간. 보드의 정착 대기 길이와 공유한다 */
export const SLIDE_DURATION_MS = 180;

const EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const MAX_ANIMATED_BLOCKS = 100;

interface Spot {
  left: number;
  top: number;
}

/**
 * 블록 순서가 실제로 바뀌는 순간에만 동작하는 FLIP 애니메이션.
 *
 * `capture()` 가 현재 화면 위치를 기록하고, 다음 렌더 직후 새 위치와의 차이를
 * `transform` 으로 이어 붙인다. 매 렌더 전체 블록을 측정하지 않으며 화면 밖 블록과
 * 끌고 있는 블록은 제외하고, 한 번에 처리할 카드 수도 제한한다.
 */
export function useSlideOnReorder(skipKey?: number | null) {
  const nodes = useRef(new Map<number, HTMLElement>());
  const callbacks = useRef(
    new Map<number, (node: HTMLElement | null) => void>(),
  );
  const visibleKeys = useRef(new Set<number>());
  const observer = useRef<IntersectionObserver | null>(null);
  const beforeMove = useRef<Map<number, Spot> | null>(null);
  const skipKeyRef = useRef(skipKey);

  useBrowserLayoutEffect(() => {
    skipKeyRef.current = skipKey;
  }, [skipKey]);

  const getObserver = useCallback(() => {
    if (observer.current) return observer.current;

    observer.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const key = Number((entry.target as HTMLElement).dataset.slideKey);
        if (!Number.isFinite(key)) continue;

        if (entry.isIntersecting) visibleKeys.current.add(key);
        else visibleKeys.current.delete(key);
      }
    });
    return observer.current;
  }, []);

  useEffect(
    () => () => {
      observer.current?.disconnect();
      observer.current = null;
      visibleKeys.current.clear();
    },
    [],
  );

  const register = useCallback(
    (key: number) => {
      const cached = callbacks.current.get(key);
      if (cached) return cached;

      const callback = (node: HTMLElement | null) => {
        if (node) {
          node.dataset.slideKey = String(key);
          nodes.current.set(key, node);
          getObserver().observe(node);
        } else {
          const previous = nodes.current.get(key);
          if (previous) observer.current?.unobserve(previous);
          nodes.current.delete(key);
          visibleKeys.current.delete(key);
          callbacks.current.delete(key);
        }
      };
      callbacks.current.set(key, callback);
      return callback;
    },
    [getObserver],
  );

  const capture = useCallback(() => {
    if (
      document.visibilityState !== 'visible' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      beforeMove.current = null;
      return;
    }

    const spots = new Map<number, Spot>();
    for (const key of visibleKeys.current) {
      if (spots.size >= MAX_ANIMATED_BLOCKS) break;
      if (key === skipKeyRef.current) continue;

      const node = nodes.current.get(key);
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      spots.set(key, { left: rect.left, top: rect.top });
    }

    beforeMove.current = spots;
  }, []);

  useBrowserLayoutEffect(() => {
    const previous = beforeMove.current;
    if (!previous) return;
    beforeMove.current = null;

    for (const [key, before] of previous) {
      const node = nodes.current.get(key);
      if (!node) continue;

      // capture 는 진행 중 transform 이 반영된 화면 위치다. 기존 효과를 제거한 뒤
      // 새 레이아웃 위치를 재면 연속 이동·롤백도 보이던 자리에서 다시 출발한다.
      for (const animation of node.getAnimations()) animation.cancel();
      const after = node.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      node.style.willChange = 'transform';
      const animation = node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: SLIDE_DURATION_MS, easing: EASING },
      );
      animation.finished
        .catch(() => undefined)
        .finally(() => {
          if (node.getAnimations().length === 0) node.style.willChange = '';
        });
    }
  });

  return useMemo(() => ({ capture, register }), [capture, register]);
}
