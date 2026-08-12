'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { getProjectMembers } from '@/features/project/api';

import type { BlockOwner } from './types';

/**
 * 블록 담당자의 **퇴사 여부**를 카드까지 흘리는 배선.
 *
 * 블록 일괄 조회(10번) 응답의 `owner` 에는 `deleted`(사원 데이터 삭제 · D-6) 만 있고
 * **`resignedAt` 이 없다.** `deleted` 만 보면 **퇴사했지만 사원 데이터가 남은 담당자를 놓친다** —
 * 그래서 퇴사 여부를 아는 유일한 곳인 참여자 목록(45번)을 보드가 **한 번만** 받아
 * 사번 집합으로 만들어 내려준다.
 *
 * 카드마다 부르면 블록 수만큼 같은 요청이 나가고, `BlockCard` 는 유형별 본문
 * 컴포넌트가 각자 그리므로 prop 으로 꿰면 전 유형을 건드려야 한다 —
 * `BlockActionsContext` · `BlockDragContext` 와 같은 이유로 컨텍스트를 쓴다.
 *
 * 보드 밖에서 쓰인 카드는 `null` 을 받아 **`deleted` 만** 본다.
 *
 * 📌 블록 응답에 `owner.resignedAt` 이 실리면 이 파일은 통째로 지운다 (`.ai/API.md` 10번).
 */
const ResignedOwnersContext = createContext<ReadonlySet<string> | null>(null);

export const ResignedOwnersProvider = ResignedOwnersContext.Provider;

/**
 * 참여자 목록에서 **퇴사자 사번 집합**을 만든다.
 *
 * 실패해도 조용히 빈 집합으로 둔다 — 문구가 안 붙을 뿐 보드는 그대로 쓸 수 있다.
 */
export function useResignedOwners(projectId: string) {
  const [resigned, setResigned] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    getProjectMembers(projectId, controller.signal)
      .then((members) =>
        setResigned(
          new Set(
            members
              .filter((member) => member.resigned)
              .map((member) => member.userId),
          ),
        ),
      )
      .catch(() => undefined);

    return () => controller.abort();
  }, [projectId]);

  return resigned;
}

/**
 * 이 담당자에게 `(퇴사자)` 를 붙일지.
 *
 * 근거가 둘이다 — 블록 응답의 `deleted`(사원 데이터 삭제) · 참여자 목록의 `resigned`(퇴사).
 * 사용자에게는 "재직 중이 아니다" 하나로 읽히면 되므로 **둘 중 하나만 참이어도** 붙인다.
 */
export function useOwnerResigned(owner: BlockOwner | null) {
  const resigned = useContext(ResignedOwnersContext);

  if (!owner) return false;
  return owner.deleted || resigned?.has(owner.userId) === true;
}
