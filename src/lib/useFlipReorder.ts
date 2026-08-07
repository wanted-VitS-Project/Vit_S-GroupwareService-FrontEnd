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

const DEFAULT_DURATION_MS = 200;
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';
/**
 * 한 번에 애니메이션할 최대 개수.
 * 목록이 아무리 길어도 측정 · 애니메이션 생성 비용을 여기서 끊는다.
 */
const MAX_ANIMATED_NODES = 100;

interface Spot {
  left: number;
  top: number;
}

/**
 * 순서가 바뀌는 순간에만 도는 FLIP 애니메이션 (공용).
 *
 * 쓰는 쪽은 두 가지만 하면 된다 —
 * 1. 목록의 각 행에 `ref={register(key)}`
 * 2. 순서를 바꾸는 **직전에** `capture()`
 *
 * `capture()` 가 현재 화면 위치를 기록하고, 다음 렌더 직후 새 위치와의 차이를
 * `transform` 으로 이어 붙인다. 매 렌더마다 전체를 측정하지 않는 것이 핵심이다 —
 * 드래그 중에는 `dragover` 로 렌더가 잦아서, 그때마다 재면 목록이 길수록 화면이 멎는다.
 *
 * 그 외 안전장치:
 * - 탭이 숨겨져 있거나 `prefers-reduced-motion` 이면 아예 건너뛴다
 * - 화면 밖 행은 제외한다 (모달 안에서 스크롤로 밀려난 행)
 * - 한 번에 `MAX_ANIMATED_NODES` 개까지만 처리한다
 * - 이전 애니메이션을 취소하고 다시 출발해 연속 이동에도 쌓이지 않는다
 * - `will-change` 는 도는 동안만 남긴다
 */
export function useFlipReorder<Key extends string | number>(
  durationMs = DEFAULT_DURATION_MS,
) {
  const nodes = useRef(new Map<Key, HTMLElement>());
  const callbacks = useRef(new Map<Key, (node: HTMLElement | null) => void>());
  const beforeMove = useRef<Map<Key, Spot> | null>(null);

  /** 같은 key 에는 같은 콜백을 준다 — 매 렌더 새 함수를 넘기면 ref 가 계속 붙었다 떨어진다 */
  const register = useCallback((key: Key) => {
    const cached = callbacks.current.get(key);
    if (cached) return cached;

    const callback = (node: HTMLElement | null) => {
      if (node) {
        nodes.current.set(key, node);
      } else {
        nodes.current.delete(key);
        callbacks.current.delete(key);
      }
    };
    callbacks.current.set(key, callback);
    return callback;
  }, []);

  const capture = useCallback(() => {
    if (
      document.visibilityState !== 'visible' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      beforeMove.current = null;
      return;
    }

    const spots = new Map<Key, Spot>();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    for (const [key, node] of nodes.current) {
      if (spots.size >= MAX_ANIMATED_NODES) break;

      const rect = node.getBoundingClientRect();
      const isVisible =
        rect.bottom >= 0 &&
        rect.top <= viewportHeight &&
        rect.right >= 0 &&
        rect.left <= viewportWidth;
      if (isVisible) spots.set(key, { left: rect.left, top: rect.top });
    }

    beforeMove.current = spots;
  }, []);

  useBrowserLayoutEffect(() => {
    const previous = beforeMove.current;
    // capture() 를 부른 렌더에서만 일한다. 그 외 렌더는 여기서 바로 빠진다
    if (!previous) return;
    beforeMove.current = null;

    for (const [key, before] of previous) {
      const node = nodes.current.get(key);
      if (!node) continue;

      // capture 는 진행 중 transform 이 반영된 화면 위치다. 기존 효과를 제거한 뒤
      // 새 레이아웃 위치를 재면 연속 이동도 보이던 자리에서 다시 출발한다.
      for (const animation of node.getAnimations()) animation.cancel();
      const after = node.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      // 1px 미만은 눈에 띄지 않는다 — 애니메이션을 만들 이유가 없다
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      node.style.willChange = 'transform';
      const animation = node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: durationMs, easing: EASING },
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
