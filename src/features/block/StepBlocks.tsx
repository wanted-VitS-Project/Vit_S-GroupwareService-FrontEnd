'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import AddBlockButton from './AddBlockButton';
import { getStepBlocks } from './api';
import BlockBoard from './BlockBoard';
import type { StepBlock } from './types';

/**
 * 스텝 화면의 블록 영역 — 목록 조회 · 헤더 · 보드를 함께 관리한다.
 * 블록을 추가하면 목록을 다시 불러온다.
 */
export default function StepBlocks({ stepName }: { stepName: string }) {
  const params = useParams<{ stepId: string }>();
  const stepId = params.stepId;

  /** 어느 스텝의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    stepId: string;
    blocks: StepBlock[];
  } | null>(null);
  const [failedStepId, setFailedStepId] = useState<string | null>(null);
  /** 값이 바뀌면 목록을 다시 불러온다 */
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getStepBlocks(stepId, signal)
      .then((blocks) => setLoaded({ stepId, blocks }))
      .catch(() => {
        if (!signal.aborted) setFailedStepId(stepId);
      });

    return () => controller.abort();
  }, [stepId, reloadCount]);

  const blocks = loaded?.stepId === stepId ? loaded.blocks : null;
  const hasFailed = failedStepId === stepId;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="min-w-0 truncate text-sm font-semibold text-[#1C1F2A]">
          {stepName}
        </h2>
        <AddBlockButton
          stepName={stepName}
          onCreated={() => setReloadCount((count) => count + 1)}
        />
      </div>

      {hasFailed ? (
        <p className="rounded-lg border border-dashed border-[#1C1F2A]/10 px-4 py-10 text-center text-xs text-[#6C7389]">
          블록을 불러오지 못했습니다.
        </p>
      ) : !blocks ? (
        <p className="px-1 text-xs text-[#6C7389]">불러오는 중…</p>
      ) : (
        <BlockBoard blocks={blocks} />
      )}
    </div>
  );
}
