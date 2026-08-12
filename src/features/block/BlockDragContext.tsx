'use client';

import { createContext, useContext } from 'react';

/**
 * 보드가 내려주는 드래그 배선.
 *
 * 블록 본문 컴포넌트(`ChecklistBlock` · `TextBlock` · …)를 거치지 않고
 * `BlockBoard` → `BlockCard` 로 바로 흘리려고 컨텍스트를 쓴다.
 * 보드 밖에서 쓰인 카드는 `null` 을 받아 드래그 없이 그려진다.
 */
export interface BlockDragValue {
  /** 지금 끌고 있는 블록 — 반투명 처리에 쓴다 */
  draggingId: number | null;
  /** 드래그 시작 (핸들에서만 호출된다) */
  start: (blockId: number, label: string) => void;
  /**
   * 이 블록 위를 지나는 중 — 미리보기 순서를 갱신한다.
   *
   * `swap` 은 대상과 자리를 맞바꾼다 (끌어온 방향으로 앞뒤가 정해진다).
   * `after` 는 대상 바로 뒤로 못박는다 — 빈 칸 안내처럼 자리가 정해진 경우에만 쓴다.
   */
  hover: (blockId: number, mode: 'swap' | 'after') => void;
  /** 놓기 · 취소 모두 여기서 정리한다 */
  finish: () => void;
  /**
   * 평면 순서에서 한 칸 앞/뒤로 옮긴다 — **키보드 경로**다.
   *
   * 드래그는 포인터가 있어야만 쓸 수 있어, 핸들에 화살표 키를 붙여 같은 이동을 연다.
   * 드래그와 마찬가지로 **저장하지 않는다** — `배치 완료` 때 한 번만 보낸다.
   * 양 끝에서는 아무 일도 일어나지 않는다 (드래그로 화면 밖에 놓은 것과 같다).
   */
  moveBy: (blockId: number, delta: -1 | 1) => void;
}

const BlockDragContext = createContext<BlockDragValue | null>(null);

export const BlockDragProvider = BlockDragContext.Provider;

export function useBlockDrag() {
  return useContext(BlockDragContext);
}

/**
 * 커서를 따라다니는 제목 알약.
 * 기본 드래그 이미지는 카드 전체를 통째로 떠서 화면을 가린다.
 */
export function setPillDragImage(event: React.DragEvent, label: string) {
  event.dataTransfer.effectAllowed = 'move';
  // Firefox 는 데이터가 실리지 않은 드래그를 그냥 취소한다 — 값 자체는 쓰지 않는다
  event.dataTransfer.setData('text/plain', label);

  const pill = document.createElement('div');
  pill.textContent = label;
  pill.style.cssText =
    'position:fixed;top:-999px;left:0;background:#3B5BDB;color:#fff;' +
    'padding:5px 10px;border-radius:6px;font-size:var(--text-detail);font-weight:600;' +
    'white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis';

  document.body.appendChild(pill);
  event.dataTransfer.setDragImage(pill, 60, 14);
  // 스냅샷을 뜬 뒤라 바로 지워도 드래그 이미지는 남는다
  setTimeout(() => pill.remove(), 0);
}
