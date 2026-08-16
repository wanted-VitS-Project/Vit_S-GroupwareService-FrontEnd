'use client';

import { createContext, useContext } from 'react';

/**
 * **이 스텝의 블록을 고칠 수 있는지**를 보드에서 카드까지 흘린다.
 *
 * 카드는 유형별 본문(`ChecklistBlock` · `TextBlock` · …)을 한 겹 거쳐 그려져서,
 * prop 으로 나르면 본문 컴포넌트 전부가 자기와 상관없는 값을 받아 넘기게 된다 —
 * 드래그 배선(`BlockDragContext`) · 담당자(`BlockMembersContext`)와 같은 이유로 컨텍스트다.
 *
 * ⚠️ 기본값은 **`true`** 다. 보드 밖에서 쓰이는 카드(연결 이슈 패널 등)까지
 *    조용히 잠기면, 권한이 있는데도 아무것도 못 하는 화면이 생긴다.
 *    잠그는 쪽이 **명시적으로** 감싼다 (`StepBlocks` → `BlockBoard`).
 */
const BlockCanEditContext = createContext(true);

export const BlockCanEditProvider = BlockCanEditContext.Provider;

export function useBlockCanEdit() {
  return useContext(BlockCanEditContext);
}
