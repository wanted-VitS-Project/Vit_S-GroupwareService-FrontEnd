'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

/** 서버에는 레이아웃이 없다 — 경고를 피하려고 클라이언트에서만 layout effect 를 쓴다 */
const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** 자리를 옮기는 데 걸리는 시간. 보드가 "정착 대기" 길이를 맞추는 데 쓴다 */
export const SLIDE_DURATION_MS = 180;

/** 빠르게 출발해 부드럽게 멈춘다 — 따라오는 느낌보다 자리를 잡는 느낌이 낫다 */
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';

/**
 * 순서가 바뀐 요소를 **원래 있던 자리에서 새 자리로 미끄러뜨린다** (FLIP).
 *
 * 그리기 전에 이전 위치를 기억해 뒀다가, 그린 직후 그 차이만큼 되돌려 놓고
 * 0 까지 애니메이션한다. 레이아웃은 이미 끝난 상태라 위치 계산이 어긋나지 않는다.
 *
 * ⚠️ 위치는 `getBoundingClientRect()` 가 아니라 **`offsetLeft`/`offsetTop`** 으로 잰다.
 *    rect 는 `transform` 이 반영된 값이라, 이동이 겹치면 "가짜 위치" 를 기준으로 삼게 되고
 *    오차가 누적돼 블록이 엉뚱한 곳에서 날아온다. offset 은 변형의 영향을 받지 않아
 *    **진행 중인 이동을 끊지 않고도** 진짜 자리를 알 수 있다.
 *
 * ⚠️ 자리가 그대로면 **아무것도 건드리지 않는다.** 이 훅은 매 렌더 도는데,
 *    무조건 취소했다가 다시 걸면 드래그 중 렌더마다 이동이 끊겨 블록이 툭툭 끊겨 보이고,
 *    애니메이션 객체도 초당 수백 개씩 만들어졌다 버려진다.
 *
 * 반환한 `register` 를 각 요소의 `ref` 로 넘긴다.
 */

/** 변형이 섞이지 않은 자리 (offsetParent 기준) */
interface Spot {
  left: number;
  top: number;
}

export function useSlideOnReorder(skipKey?: number | null) {
  const nodes = useRef(new Map<number, HTMLElement>());
  const previousSpots = useRef(new Map<number, Spot>());
  /** key 마다 같은 함수를 돌려준다 — 매번 새로 만들면 렌더마다 ref 가 붙었다 떨어진다 */
  const callbacks = useRef(
    new Map<number, (node: HTMLElement | null) => void>(),
  );

  function register(key: number) {
    const cached = callbacks.current.get(key);
    if (cached) return cached;

    const callback = (node: HTMLElement | null) => {
      if (node) nodes.current.set(key, node);
      else nodes.current.delete(key);
    };
    callbacks.current.set(key, callback);

    return callback;
  }

  /**
   * 의존성을 두지 않고 **매 렌더 잰다.**
   * 순서가 그대로여도 빈 칸 안내가 생기고 사라지며 위치가 바뀐다 —
   * 그때 갱신하지 않으면 다음 이동이 낡은 기준으로 계산된다.
   * 위치가 그대로면 애니메이션 없이 넘어가므로 비용은 측정뿐이다.
   */
  useBrowserLayoutEffect(() => {
    const previous = previousSpots.current;
    const current = new Map<number, Spot>();
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    for (const [key, node] of nodes.current) {
      const spot = { left: node.offsetLeft, top: node.offsetTop };
      current.set(key, spot);

      // 끌고 있는 블록은 커서를 따라다니므로 미끄러뜨리면 두 번 움직이는 것처럼 보인다
      if (reduceMotion || key === skipKey) continue;

      const before = previous.get(key);
      if (!before) continue;

      const dx = before.left - spot.left;
      const dy = before.top - spot.top;
      // 자리가 그대로 — 가던 중이라면 그대로 두고 넘어간다
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      // 가던 중이었다면 지금까지 온 만큼을 얹어 이어 간다 — 끊고 다시 가면 튄다
      const running = node.getAnimations();
      let carryX = 0;
      let carryY = 0;

      if (running.length > 0) {
        const { transform } = getComputedStyle(node);
        if (transform && transform !== 'none') {
          const matrix = new DOMMatrixReadOnly(transform);
          carryX = matrix.m41;
          carryY = matrix.m42;
        }
        for (const animation of running) animation.cancel();
      }

      node.animate(
        [
          { transform: `translate(${dx + carryX}px, ${dy + carryY}px)` },
          { transform: 'none' },
        ],
        { duration: SLIDE_DURATION_MS, easing: EASING },
      );
    }

    previousSpots.current = current;
  });

  return register;
}
