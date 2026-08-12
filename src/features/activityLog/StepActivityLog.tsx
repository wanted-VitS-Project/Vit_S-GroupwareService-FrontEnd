'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { getStepBlocks } from '@/features/block/api';
import type { StepBlock } from '@/features/block/types';
import { isAbortError } from '@/lib/api';

import ActivityLogItem from './ActivityLogItem';
import {
  ActivityLogMoreSkeleton,
  ActivityLogSkeleton,
} from './ActivityLogSkeletons';
import { groupByDate } from './time';
import { ALL_BLOCKS } from './types';
import { useActivityLogFeed } from './useActivityLogFeed';

/**
 * 스텝 활동 기록 화면. (.ai/API.md 72번)
 *
 * 서버는 **문장을 만들어 주지 않는다** — 원자 데이터만 오고 날짜 그룹 · 상대 시간 ·
 * 문장 조립은 모두 여기서 한다.
 *
 * 목록 조회 · 이어 읽기는 `useActivityLogFeed` 가 맡는다 (블록 팝업과 같은 규칙).
 */
export default function StepActivityLog() {
  const params = useParams<{ id: string; stepId: string }>();
  const stepId = params.stepId;

  /**
   * 선택한 블록 · 필터 목록. 둘 다 **어느 스텝의 값인지 함께** 담는다 —
   * 값만 들고 있으면 스텝을 옮긴 뒤에도 이전 스텝의 블록이 필터에 남는다.
   */
  const [filter, setFilter] = useState({ stepId, value: ALL_BLOCKS });
  const [loadedBlocks, setLoadedBlocks] = useState<{
    stepId: string;
    blocks: StepBlock[];
  } | null>(null);
  /** 필터 목록 조회 실패 — 목록 본문과 달리 화면을 막지는 않는다 */
  const [blocksFailedStepId, setBlocksFailedStepId] = useState<string | null>(
    null,
  );
  /** 값이 바뀌면 필터 목록을 다시 불러온다 */
  const [blocksReloadCount, setBlocksReloadCount] = useState(0);

  const blockFilter = filter.stepId === stepId ? filter.value : ALL_BLOCKS;
  const blocks =
    loadedBlocks?.stepId === stepId ? loadedBlocks.blocks : undefined;
  const hasBlocksFailed = blocksFailedStepId === stepId;

  /** 필터를 바꿨을 때 목록 맨 위로 되돌리기 위한 기준점 */
  const topRef = useRef<HTMLDivElement>(null);

  const blockId = blockFilter === ALL_BLOCKS ? undefined : Number(blockFilter);

  const {
    visible,
    isSwitching,
    hasFailed,
    isLoadingMore,
    errorMessage,
    loadMore,
    retry,
    setSentinel,
  } = useActivityLogFeed(stepId, blockId);

  // 필터 목록
  useEffect(() => {
    const controller = new AbortController();

    getStepBlocks(stepId, controller.signal)
      .then((blocks) => {
        setLoadedBlocks({ stepId, blocks });
        setBlocksFailedStepId((failed) => (failed === stepId ? null : failed));
      })
      .catch((caught) => {
        // 취소는 실패가 아니다. 필터를 못 읽어도 '전체' 목록은 계속 볼 수 있다
        if (!isAbortError(caught)) setBlocksFailedStepId(stepId);
      });

    return () => controller.abort();
  }, [stepId, blocksReloadCount]);

  const groups = visible ? groupByDate(visible.logs) : [];

  return (
    <div
      ref={topRef}
      // 첫 조회 중임을 보조기술에 알린다 — 스켈레톤은 눈으로만 보이는 신호다
      aria-busy={!visible && !hasFailed}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-body-m font-semibold text-text-primary">
            활동 기록
          </h2>
          {/*
            건수 배지는 목록이 있는 동안 계속 자리를 지킨다 —
            조건이 바뀔 때마다 사라졌다 나타나면 제목 줄이 흔들린다
          */}
          {visible && (
            <span className="rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
              {visible.logs.length}건{visible.hasNext && ' +'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 필터를 못 읽었다는 사실과 다시 시도할 방법을 알린다 — 조용히 비워 두지 않는다 */}
          {hasBlocksFailed && (
            <span className="flex items-center gap-1.5">
              <span role="alert" className="text-caption text-text-danger">
                블록 목록을 불러오지 못했습니다.
              </span>
              <button
                type="button"
                onClick={() => {
                  setBlocksFailedStepId(null);
                  setBlocksReloadCount((count) => count + 1);
                }}
                className="cursor-pointer rounded-button-sm px-1.5 py-0.5 text-caption font-semibold text-text-primary-blue hover:bg-blue-bg-soft"
              >
                다시 시도
              </button>
            </span>
          )}

          <label className="flex items-center gap-2 text-[11px] text-text-secondary">
            블록
            <select
              value={blockFilter}
              onChange={(event) => {
                setFilter({ stepId, value: event.target.value });
                // 목록이 통째로 갈리는데 스크롤이 중간에 남아 있으면 아무 데나 떨어진다
                topRef.current?.scrollIntoView({ block: 'start' });
              }}
              className="cursor-pointer rounded-button-md border border-border-default bg-bg-card px-2 py-1.5 text-[11px] text-text-primary focus:border-border-primary focus:outline-none"
            >
              <option value={ALL_BLOCKS}>전체</option>
              {blocks?.map((block) => (
                <option key={block.blockId} value={String(block.blockId)}>
                  {block.title || '제목 없는 블록'}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {hasFailed ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-default px-4 py-12">
          <p className="text-label text-text-secondary">
            활동 기록을 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={retry}
            className="cursor-pointer rounded-button-sm px-2 py-1 text-[11px] font-medium text-text-primary-blue hover:bg-blue-bg-soft"
          >
            다시 시도
          </button>
        </div>
      ) : !visible ? (
        <ActivityLogSkeleton />
      ) : visible.logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-4 py-12 text-center text-[11px] text-text-secondary">
          아직 활동 기록이 없습니다.
        </p>
      ) : (
        <div
          aria-busy={isSwitching}
          // 새 조건을 부르는 동안에는 이전 목록을 흐리게만 둔다 — 지우지 않는다
          className={`flex flex-col gap-6 transition-opacity duration-150 ${
            isSwitching ? 'opacity-45' : ''
          }`}
        >
          {groups.map((group) => (
            <section key={group.dateKey}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-caption font-semibold tracking-wider text-text-secondary">
                  {group.dateLabel}
                </h3>
                <span aria-hidden className="h-px flex-1 bg-bg-sidebar/10" />
              </div>
              <ul>
                {group.logs.map((log, index) => (
                  <ActivityLogItem
                    key={log.activityLogId}
                    log={log}
                    isLast={index === group.logs.length - 1}
                    // 지금 그려진 목록이 어느 조건의 결과인지를 따른다
                    showBlock={visible.blockId === undefined}
                  />
                ))}
              </ul>
            </section>
          ))}

          {errorMessage && (
            <div className="flex flex-col items-center gap-2">
              <p
                role="alert"
                className="rounded-lg border border-red-border bg-red-bg-soft px-3 py-2 text-caption text-text-danger"
              >
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={loadMore}
                className="cursor-pointer rounded-button-sm px-2 py-1 text-[11px] font-medium text-text-primary-blue hover:bg-blue-bg-soft"
              >
                다시 시도
              </button>
            </div>
          )}

          {isLoadingMore && <ActivityLogMoreSkeleton />}

          {visible.hasNext && !errorMessage && (
            <div ref={setSentinel} aria-hidden className="h-px" />
          )}

          {/*
            더 없을 때만 뜨는 마무리 문구. 이어 읽는 중에는 감춰 두면
            스켈레톤 ↔ 문구가 번갈아 나타나며 바닥이 깜빡인다
          */}
          {!visible.hasNext && !isLoadingMore && (
            <p className="text-center text-caption text-text-muted">
              마지막 기록입니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
