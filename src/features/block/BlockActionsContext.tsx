'use client';

import { createContext, useContext } from 'react';

import type { UpdateBlockResponse } from './types';

/**
 * 보드가 내려주는 "이 블록만 갈아끼우기" 손잡이.
 *
 * 블록 본문 컴포넌트(`ChecklistBlock` · `TextBlock` · …)를 거치지 않고
 * `BlockBoard` → `BlockCard` 로 바로 흘리려고 컨텍스트를 쓴다 (드래그 배선과 같은 방식).
 * 보드 밖에서 쓰인 카드는 `null` 을 받아 전역 이벤트로 되돌아간다.
 */
export interface BlockActions {
  /**
   * 수정 응답을 화면에 곧바로 반영한다 — **재조회하지 않는다.**
   *
   * 목록을 다시 불러오면 ① 왕복이 끝날 때까지 옛 이름 · 담당자가 남아 있고
   * ② 새 배열로 통째로 갈리면서 서버 좌표로 다시 정렬돼 배치가 흔들린다.
   * `rowIndex` · `sortOrder` · `colSpan` · `detail` 은 건드리지 않아 자리도 본문도 그대로다.
   */
  patch: (updated: UpdateBlockResponse) => void;
  /**
   * 지운 블록을 목록에서 빼낸다 — 역시 **재조회하지 않는다.**
   *
   * 남은 블록의 서버 좌표는 그대로지만, 보드가 평면 순서를 3칸씩 다시 패킹하므로
   * 화면 결과는 재조회했을 때와 같다. 빈자리는 `useSlideOnReorder` 가 메우며 닫힌다.
   */
  remove: (blockId: number) => void;
}

const BlockActionsContext = createContext<BlockActions | null>(null);

export const BlockActionsProvider = BlockActionsContext.Provider;

export function useBlockActions() {
  return useContext(BlockActionsContext);
}
