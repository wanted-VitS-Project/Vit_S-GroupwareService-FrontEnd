'use client';

import { useEffect, type RefObject } from 'react';

/** 이 안쪽으로 들어오면 스크롤이 따라 움직인다 */
const EDGE_PX = 96;
/** 가장자리에 완전히 붙었을 때 한 프레임에 움직일 거리 */
const MAX_STEP_PX = 20;

/**
 * 블록 보드를 **실제로 굴릴 수 있는** 조상을 찾는다. 없으면 `null` — 문서(창)가 굴러간다.
 *
 * ⚠️ `overflow-y: auto` 만 보고 고르면 안 된다. 본문 래퍼가 여러 겹이라
 *    그중 **실제로 넘치는** 것만이 굴러간다. 넘치지 않는 래퍼를 잡으면
 *    `scrollTop` 을 아무리 밀어도 화면이 따라오지 않는다.
 *    (셸이 화면 높이에 고정돼 있으므로 보통은 본문 래퍼가 잡힌다 — `AppShell` 참고)
 */
function findScrollParent(node: HTMLElement | null) {
  for (
    let parent = node?.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    const { overflowY } = getComputedStyle(parent);
    const scrollable = overflowY === 'auto' || overflowY === 'scroll';

    // 1px 여유 — 소수점 반올림 때문에 넘치지도 않는데 1px 크게 잡히는 경우가 있다
    if (scrollable && parent.scrollHeight > parent.clientHeight + 1) {
      return parent;
    }
  }
  return null;
}

/** 가장자리에 가까울수록 빠르게. 거리 0 → 최대 속도 */
function stepFor(distance: number) {
  const closeness = Math.min(Math.max(1 - distance / EDGE_PX, 0), 1);
  return Math.ceil(closeness * MAX_STEP_PX);
}

/**
 * 드래그 중 화면 위·아래 끝으로 커서를 가져가면 스크롤이 따라온다.
 *
 * HTML5 드래그 중에는 휠·키보드 스크롤이 먹지 않아, 보이는 범위 밖으로는
 * 블록을 옮길 수 없다. `dragover` 의 커서 위치를 보고 직접 굴린다.
 */
export function useDragAutoScroll(
  isDragging: boolean,
  boardRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!isDragging) return;

    let container = findScrollParent(boardRef.current);
    let step = 0;
    let frame = 0;

    function tick() {
      frame = requestAnimationFrame(tick);
      if (step === 0) return;

      if (container) container.scrollTop += step;
      else window.scrollBy(0, step);
    }

    function handleDragOver(event: DragEvent) {
      /*
       * 굴러가는 주체는 드래그 중에 바뀐다 — 드래그를 시작하면 빈 칸 · 꼬리 자리가 붙어
       * 보드가 그때부터 넘치기 시작한다. 그래서 **못 찾았을 때도** 매번 다시 본다.
       * `container` 가 null 인 채로 굳으면 문서를 굴리려 하는데,
       * 셸이 화면 높이에 고정돼 있어 문서는 움직이지 않는다 (화면이 안 따라온다).
       */
      if (!container || container.scrollHeight <= container.clientHeight + 1) {
        container = findScrollParent(boardRef.current);
      }

      const box = container
        ? container.getBoundingClientRect()
        : new DOMRect(0, 0, window.innerWidth, window.innerHeight);

      // 굴릴 영역이 따로 있을 때만, 커서가 그 좌우 안에 있어야 굴린다.
      // 문서가 굴러가는 경우는 화면 전체가 대상이라 이 제한이 의미가 없다
      if (
        container &&
        (event.clientX < box.left || event.clientX > box.right)
      ) {
        step = 0;
        return;
      }

      const fromTop = event.clientY - box.top;
      const fromBottom = box.bottom - event.clientY;

      if (fromTop < EDGE_PX) step = -stepFor(fromTop);
      else if (fromBottom < EDGE_PX) step = stepFor(fromBottom);
      else step = 0;
    }

    function stop() {
      step = 0;
    }

    // 카드가 아니라 창 전체에서 받는다 — 보드 밖으로 나가도 계속 굴러야 한다
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragend', stop);
    window.addEventListener('drop', stop);
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragend', stop);
      window.removeEventListener('drop', stop);
      cancelAnimationFrame(frame);
    };
  }, [isDragging, boardRef]);
}
