'use client';

import { useEffect, useState } from 'react';

import {
  type ProjectFileVersionsState,
  readProjectFileVersions,
  subscribeProjectFileVersions,
} from './projectFileVersionsStore';
import { hasIndexingDocument } from './types';

interface FileVersionsState extends ProjectFileVersionsState {
  /** 아직 AI 가 읽는 중인 문서가 남아 있는지 — 안내 문구에 쓴다 */
  isIndexing: boolean;
}

/**
 * 분석·표시에 쓰는 프로젝트 파일 버전 목록.
 *
 * `indexStatus` 는 **업로드 뒤 백그라운드에서 바뀌는 값**이라 한 번만 받아 두면
 * 인덱싱이 끝나도 화면은 계속 "AI가 아직 읽는 중" 으로 남는다. 그래서 읽는 중인
 * 문서가 있는 동안만 목록을 다시 받는다.
 *
 * 실제 조회·타이머는 `projectFileVersionsStore` 가 **프로젝트당 하나만** 돌린다 —
 * 이 훅을 여러 컴포넌트에서 불러도 요청이 늘지 않는다.
 */
export function useProjectFileVersions(projectId: string): FileVersionsState {
  const [state, setState] = useState<ProjectFileVersionsState>(() =>
    readProjectFileVersions(projectId),
  );

  /**
   * 프로젝트가 바뀌면 **렌더 중에** 값을 갈아 끼운다.
   * effect 로 미루면 한 프레임 동안 이전 프로젝트의 문서 목록이 남는다.
   */
  const [trackedId, setTrackedId] = useState(projectId);
  if (trackedId !== projectId) {
    setTrackedId(projectId);
    setState(readProjectFileVersions(projectId));
  }

  useEffect(
    () => subscribeProjectFileVersions(projectId, setState),
    [projectId],
  );

  return {
    ...state,
    isIndexing: state.versions !== null && hasIndexingDocument(state.versions),
  };
}
