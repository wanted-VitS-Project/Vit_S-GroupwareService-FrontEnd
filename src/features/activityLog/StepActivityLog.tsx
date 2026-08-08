'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { getStepBlocks } from '@/features/block/api';
import type { StepBlock } from '@/features/block/types';

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

  const blockFilter = filter.stepId === stepId ? filter.value : ALL_BLOCKS;
  const blocks =
    loadedBlocks?.stepId === stepId ? loadedBlocks.blocks : undefined;

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
      .then((blocks) => setLoadedBlocks({ stepId, blocks }))
      // 필터를 못 읽어도 '전체' 목록은 볼 수 있다 — 화면을 막지 않는다
      .catch(() => undefined);

    return () => controller.abort();
  }, [stepId]);

  const groups = visible ? groupByDate(visible.logs) : [];

  return (
    <div ref={topRef} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#1C1F2A]">활동 기록</h2>
          {/*
            건수 배지는 목록이 있는 동안 계속 자리를 지킨다 —
            조건이 바뀔 때마다 사라졌다 나타나면 제목 줄이 흔들린다
          */}
          {visible && (
            <span className="rounded-full bg-[#ECEEF4] px-2 py-0.5 text-[10px] text-[#6C7389]">
              {visible.logs.length}건{visible.hasNext && ' +'}
            </span>
          )}
        </div>

        <label className="flex items-center gap-2 text-[11px] text-[#6C7389]">
          블록
          <select
            value={blockFilter}
            onChange={(event) => {
              setFilter({ stepId, value: event.target.value });
              // 목록이 통째로 갈리는데 스크롤이 중간에 남아 있으면 아무 데나 떨어진다
              topRef.current?.scrollIntoView({ block: 'start' });
            }}
            className="cursor-pointer rounded-md border border-[#1C1F2A]/10 bg-white px-2 py-1.5 text-[11px] text-[#1C1F2A] focus:border-[#3B5BDB] focus:outline-none"
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

      {hasFailed ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#1C1F2A]/10 px-4 py-12">
          <p className="text-xs text-[#6C7389]">
            활동 기록을 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={retry}
            className="cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-[#3B5BDB] hover:bg-[#EDF2FF]"
          >
            다시 시도
          </button>
        </div>
      ) : !visible ? (
        <ActivityLogSkeleton />
      ) : visible.logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#1C1F2A]/10 px-4 py-12 text-center text-[11px] text-[#6C7389]">
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
                <h3 className="text-[10px] font-semibold tracking-wider text-[#6C7389]">
                  {group.dateLabel}
                </h3>
                <span aria-hidden className="h-px flex-1 bg-[#1C1F2A]/10" />
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
                className="rounded-lg border border-[#FFC9C9] bg-[#FEF2F2] px-3 py-2 text-[10px] text-[#E7000B]"
              >
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={loadMore}
                className="cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-[#3B5BDB] hover:bg-[#EDF2FF]"
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
            <p className="text-center text-[10px] text-[#9AA1B4]">
              마지막 기록입니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
