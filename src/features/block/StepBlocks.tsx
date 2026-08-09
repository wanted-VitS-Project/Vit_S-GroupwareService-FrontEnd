'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { getProjectSteps } from '@/features/project/api';

import AddBlockButton from './AddBlockButton';
import { getStepBlocks } from './api';
import BlockBoard from './BlockBoard';
import { BlockBoardSkeleton } from './BlockSkeletons';
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
  /** 생성 직후 입력창을 띄울 블록 */
  const [autoEditBlockId, setAutoEditBlockId] = useState<number | null>(null);
  /**
   * 생성 직전의 블록 ID 목록 스냅샷.
   * 블록 생성 응답에 ID 가 없어(스키마 미확정) 재조회 결과와 비교해 새 블록을 찾는다.
   *
   * ⚠️ 어느 스텝의 목록인지 함께 담는다. `stepId` 없이 비교하면
   *    스텝을 옮긴 뒤 도착한 응답에서 남의 블록을 신규로 오판할 수 있다.
   */
  const snapshotBeforeCreate = useRef<{
    stepId: string;
    ids: number[];
  } | null>(null);
  /**
   * 보드가 넘겨준 "대기 중인 배치를 지금 보내기" 손잡이.
   *
   * 블록 생성 직전에 부른다. 미뤄둔 배치 저장이 생성 **뒤에** 나가면
   * 새 블록이 빠진 목록을 스텝 전체 배치로 보내게 된다.
   */
  const flushLayout = useRef<(() => void) | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getStepBlocks(stepId, signal)
      .then((blocks) => {
        setLoaded({ stepId, blocks });
        // 같은 스텝에서 재조회가 성공하면 이전 실패를 지운다
        setFailedStepId((failed) => (failed === stepId ? null : failed));

        const before = snapshotBeforeCreate.current;
        snapshotBeforeCreate.current = null;
        // 다른 스텝에서 찍은 스냅샷이면 비교 자체가 무의미하다
        if (!before || before.stepId !== stepId) return;

        // 만들자마자 내용을 채워야 하는 유형만 자동으로 띄운다
        // (TEXT — 본문 편집기 · IMAGE — 이미지 등록 모달)
        const created = blocks.find(
          (block) =>
            (block.type === 'TEXT' || block.type === 'IMAGE') &&
            !before.ids.includes(block.blockId),
        );
        if (created) setAutoEditBlockId(created.blockId);
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setFailedStepId(stepId);
      });

    return () => controller.abort();
  }, [stepId, reloadCount]);

  useEffect(() => {
    const reload = () => setReloadCount((count) => count + 1);
    window.addEventListener('block:changed', reload);
    return () => window.removeEventListener('block:changed', reload);
  }, []);

  /**
   * 다른 사람이 바꾼 배치를 받아오는 지점.
   *
   * 서버가 변경을 밀어주는 통로(WebSocket · SSE)가 없어 **실시간 반영은 불가능**하다.
   * 대신 화면으로 **돌아오는 순간** 다시 읽는다 — 자리를 비운 사이의 변경이 가장 크고,
   * 보고 있지 않은 동안 주기적으로 찔러 보는 것보다 요청도 적다.
   *
   * 나가기 직전에는 미뤄둔 배치를 먼저 보낸다. 그러지 않으면 탭을 옮기는 순간
   * 마지막 이동이 대기 상태로 남고, 돌아와 재조회하면 그대로 사라진다.
   */
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        flushLayout.current?.();
        return;
      }
      setReloadCount((count) => count + 1);
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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
        <h2 className="min-w-0 truncate text-sm font-semibold text-text-primary">
          {stepName || '스텝'}
        </h2>
        <AddBlockButton
          stepName={stepName || '스텝'}
          blocks={blocks}
          onBeforeCreate={() => flushLayout.current?.()}
          onCreated={() => {
            // blocks 가 null 이면 기준이 빈 배열이 되어 기존 블록까지 신규로 잡힌다.
            // 그럴 때는 스냅샷을 남기지 않고 자동 편집을 건너뛴다
            snapshotBeforeCreate.current = blocks
              ? { stepId, ids: blocks.map((block) => block.blockId) }
              : null;
            setAutoEditBlockId(null);
            setReloadCount((count) => count + 1);
          }}
        />
      </div>

      {hasFailed ? (
        <p className="rounded-lg border border-dashed border-border-default px-4 py-10 text-center text-xs text-text-secondary">
          블록을 불러오지 못했습니다.
        </p>
      ) : !blocks ? (
        <BlockBoardSkeleton />
      ) : (
        <BlockBoard
          stepId={stepId}
          blocks={blocks}
          autoEditBlockId={autoEditBlockId}
          flushLayoutRef={flushLayout}
          // 바뀐 순서를 목록에도 반영한다 — 다음 `Block 추가` 가 옛 좌표로 자리를 잡지 않게
          onOrderChanged={(next) => setLoaded({ stepId, blocks: next })}
        />
      )}
    </div>
  );
}
