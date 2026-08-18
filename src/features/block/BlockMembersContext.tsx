'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getProjectMembers } from '@/features/project/api';
import type { ProjectMember } from '@/features/project/types';

import type { BlockOwner } from './types';

// 블록 화면이 함께 쓰는 참여자 목록 단일 소스.
// 두 가지에 쓰인다.
// 1. 담당자 퇴사 표기 — 블록 일괄 조회(10번)의 owner 에는 resignedAt 이 없다.
// deleted(사원 데이터 삭제·D-6) 만 보면 퇴사했지만 사원 데이터가 남은 담당자를 놓쳐서,
// 퇴사 여부를 아는 유일한 곳인 참여자 목록(45번)으로 보충한다.
// 2. 담당자 선택 후보 — 블록 수정 모달의 후보 버튼 목록.
// 보드가 한 번만 받아 내려준다. 카드·모달이 각자 부르면 같은 목록을 여러 번 받게 되고,
// BlockCard 는 유형별 본문 컴포넌트가 각자 그리므로 prop 으로는 못 꿴다 —
// BlockActionsContext·BlockDragContext 와 같은 이유로 컨텍스트를 쓴다.
// 보드 밖에서 쓰인 카드·모달은 null 을 받아 각자 알아서 처리한다
// (카드는 deleted 만 보고, 모달은 자기 조회를 돈다).
// 블록 응답에 owner.resignedAt 이 실리면 1번 용도는 사라진다 (.ai/API.md 10번).
export interface BlockMembers {
  members: ProjectMember[];
  isLoading: boolean;
  failed: boolean;
  /** 퇴사자 사번 집합 — members 에서 파생한다 */
  resigned: ReadonlySet<string>;
}

const BlockMembersContext = createContext<BlockMembers | null>(null);

export const BlockMembersProvider = BlockMembersContext.Provider;

// 참여자 목록을 받아 BlockMembers 를 만든다. 보드가 부르는 쪽이다.
// projectId 에 null 을 주면 조회하지 않는다 — 컨텍스트가 이미 있는 화면에서
// 같은 요청을 두 번 보내지 않기 위한 스위치다.
export function useBlockMembersSource(projectId: string | null): BlockMembers {
  // 어느 프로젝트의 응답인지 함께 담는다. 경로가 바뀌면 옛 목록이 즉시 무효가 되고,
  // 로딩 여부도 이 값으로 파생돼 effect 안에서 상태를 따로 켤 필요가 없다.
  const [loaded, setLoaded] = useState<{
    projectId: string;
    members: ProjectMember[];
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (projectId === null) return;

    const controller = new AbortController();

    getProjectMembers(projectId, controller.signal)
      .then((members) => setLoaded({ projectId, members, failed: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        // 실패해도 화면은 그대로 쓴다 — 문구가 안 붙고 후보가 비는 정도다
        setLoaded({ projectId, members: [], failed: true });
      });

    return () => controller.abort();
  }, [projectId]);

  const settled = loaded?.projectId === projectId ? loaded : null;

  return useMemo(() => {
    const members = settled?.members ?? [];

    return {
      members,
      isLoading: projectId !== null && settled === null,
      failed: settled?.failed === true,
      resigned: new Set(
        members.filter((member) => member.resigned).map((one) => one.userId),
      ),
    };
  }, [projectId, settled]);
}

/** 보드가 내려준 참여자 목록. 보드 밖이면 null */
export function useBlockMembers() {
  return useContext(BlockMembersContext);
}

// 이 담당자에게 (퇴사자) 를 붙일지.
// 근거가 둘이다 — 블록 응답의 deleted(사원 데이터 삭제)·참여자 목록의 resigned(퇴사).
// 사용자에게는 "재직 중이 아니다" 하나로 읽히면 되므로 둘 중 하나만 참이어도 붙인다.
export function useOwnerResigned(owner: BlockOwner | null) {
  const shared = useBlockMembers();

  if (!owner) return false;
  return owner.deleted || shared?.resigned.has(owner.userId) === true;
}
