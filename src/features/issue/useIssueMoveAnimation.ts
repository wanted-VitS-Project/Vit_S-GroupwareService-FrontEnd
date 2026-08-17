'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const DURATION_MS = 200;
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const MAX_ANIMATED_CARDS = 100;

interface Spot {
  left: number;
  top: number;
}

// 이슈 보드 전용 FLIP — 상태 변경 직전/직후의 위치 차이만 transform 으로 이어 붙인다.
// 매 렌더 위치를 재지 않고 capture() 를 호출한 상태 변경에서만 동작하며,
// 화면 밖 카드는 제외하고 처리 수도 제한해 큰 보드에서 드롭 한 번이 과도한 측정을 부르지 않게 한다.
export function useIssueMoveAnimation() {
  const nodes = useRef(new Map<number, HTMLElement>());
  const callbacks = useRef(
    new Map<number, (node: HTMLElement | null) => void>(),
  );
  const beforeMove = useRef<Map<number, Spot> | null>(null);

  function register(key: number) {
    const cached = callbacks.current.get(key);
    if (cached) return cached;

    const callback = (node: HTMLElement | null) => {
      if (node) nodes.current.set(key, node);
      else {
        nodes.current.delete(key);
        callbacks.current.delete(key);
      }
    };
    callbacks.current.set(key, callback);
    return callback;
  }

  function capture() {
    if (
      document.visibilityState !== 'visible' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      beforeMove.current = null;
      return;
    }

    const spots = new Map<number, Spot>();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    for (const [key, node] of nodes.current) {
      if (spots.size >= MAX_ANIMATED_CARDS) break;

      const rect = node.getBoundingClientRect();
      const isVisible =
        rect.bottom >= 0 &&
        rect.top <= viewportHeight &&
        rect.right >= 0 &&
        rect.left <= viewportWidth;
      if (isVisible) spots.set(key, { left: rect.left, top: rect.top });
    }

    beforeMove.current = spots;
  }

  useBrowserLayoutEffect(() => {
    const previous = beforeMove.current;
    if (!previous) return;
    beforeMove.current = null;

    for (const [key, before] of previous) {
      const node = nodes.current.get(key);
      if (!node) continue;

      // capture 는 진행 중 transform 이 반영된 현재 화면 위치를 저장했다.
      // 새 레이아웃의 실제 위치를 재기 전에 기존 애니메이션만 제거하면,
      // 중간에 롤백돼도 보이던 자리에서 자연스럽게 다시 출발한다.
      for (const animation of node.getAnimations()) animation.cancel();
      const after = node.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      node.style.willChange = 'transform';
      const animation = node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: DURATION_MS, easing: EASING },
      );
      animation.finished
        .catch(() => undefined)
        .finally(() => {
          if (node.getAnimations().length === 0) node.style.willChange = '';
        });
    }
  });

  return { capture, register };
}
