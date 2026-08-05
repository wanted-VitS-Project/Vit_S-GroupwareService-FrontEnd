'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getProjectSteps } from '@/features/project/api';

import AddBlockButton from './AddBlockButton';
import { getStepBlocks } from './api';
import BlockBoard from './BlockBoard';
import type { StepBlock } from './types';

/**
 * 스텝 화면의 블록 영역 — 목록 조회 · 재조회 · 헤더를 함께 관리한다.
 * 블록을 추가하면 목록을 다시 불러온다.
 */
export default function StepBlocks() {
  const params = useParams<{ id: string; stepId: string }>();
  const projectId = params.id;
  const stepId = params.stepId;

  /** 어느 스텝의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    stepId: string;
    blocks: StepBlock[];
  } | null>(null);
  const [failedStepId, setFailedStepId] = useState<string | null>(null);
  /** 값이 바뀌면 목록을 다시 불러온다 */
  const [reloadCount, setReloadCount] = useState(0);
  const [named, setNamed] = useState<{ stepId: string; name: string } | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getStepBlocks(stepId, signal)
      .then((blocks) => {
        setLoaded({ stepId, blocks });
        // 같은 스텝에서 재조회가 성공하면 이전 실패를 지운다
        setFailedStepId((failed) => (failed === stepId ? null : failed));
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setFailedStepId(stepId);
      });

    return () => controller.abort();
  }, [stepId, reloadCount]);

  // 스텝 상세 조회 API 가 없어 프로젝트 스텝 목록에서 이름을 찾는다
  useEffect(() => {
    const controller = new AbortController();

    getProjectSteps(projectId, controller.signal)
      .then((steps) => {
        const step = steps.find((current) => String(current.stepId) === stepId);
        if (step) setNamed({ stepId, name: step.name });
      })
      // 이름은 보조 정보라 실패해도 블록 화면을 막지 않는다
      .catch(() => undefined);

    return () => controller.abort();
  }, [projectId, stepId]);

  const blocks = loaded?.stepId === stepId ? loaded.blocks : null;
  const hasFailed = failedStepId === stepId;
  const stepName = named?.stepId === stepId ? named.name : '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="min-w-0 truncate text-sm font-semibold text-[#1C1F2A]">
          {stepName || '스텝'}
        </h2>
        <AddBlockButton
          stepName={stepName || '스텝'}
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
