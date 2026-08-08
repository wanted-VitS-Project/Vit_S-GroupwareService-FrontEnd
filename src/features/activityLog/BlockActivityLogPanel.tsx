'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';
import { Skeleton } from '@/components/Skeleton';

import ActivityIcon from './ActivityIcon';
import ActivityLogItem from './ActivityLogItem';
import {
  ActivityLogMoreSkeleton,
  ActivityLogSkeleton,
} from './ActivityLogSkeletons';
import { groupByDate } from './time';
import { useActivityLogFeed } from './useActivityLogFeed';

/**
 * 블록 활동 로그 팝업. (.ai/API.md 72번)
 *
 * ⚠️ **블록 전용 API 는 없다** — 스텝 활동 기록 API 에 `?blockId=` 를 붙여 쓴다.
 * 목록 · 커서 규칙은 스텝 화면과 같아 `useActivityLogFeed` 를 공유한다.
 *
 * 블록이 고정이라 줄마다 블록 이름을 반복하지 않는다 (`showBlock={false}`).
 * 연결 이슈 패널(`BlockIssuesPanel`)과 같은 자리 · 같은 크기로 뜬다.
 */
export default function BlockActivityLogPanel({
  stepId,
  blockId,
  blockTitle,
  onClose,
}: {
  stepId: string;
  blockId: number;
  blockTitle: string;
  onClose: () => void;
}) {
  /**
   * 팝업은 화면이 아니라 **자기 안에서** 스크롤한다.
   * 감시 지점을 화면 기준으로 재면 목록이 짧을 때 계속 걸려 이어 읽기가 멈추지 않는다.
   */
  const [scrollArea, setScrollArea] = useState<HTMLDivElement | null>(null);

  const {
    visible,
    hasFailed,
    isLoadingMore,
    errorMessage,
    loadMore,
    retry,
    setSentinel,
  } = useActivityLogFeed(stepId, blockId, { root: scrollArea });

  const groups = visible ? groupByDate(visible.logs) : [];

  return (
    <Modal
      title="블록 활동 로그"
      onClose={onClose}
      className="mt-auto mr-4 mb-4 ml-auto flex h-[72vh] max-h-[560px] w-[380px] flex-col overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      header={
        <div className="flex shrink-0 items-center gap-2 border-b border-[#1C1F2A]/10 px-4 py-3">
          <span className="flex size-5 shrink-0 items-center justify-center rounded border border-violet-200 bg-violet-100 text-violet-600">
            <ActivityIcon />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold text-[#1C1F2A]">
              블록 활동 로그
            </h2>
            <p className="truncate text-[10px] text-[#6C7389]">{blockTitle}</p>
          </div>
          {visible && (
            <span className="shrink-0 rounded-full bg-violet-600/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              {visible.logs.length}건{visible.hasNext && ' +'}
            </span>
          )}
          {!visible && !hasFailed && (
            <Skeleton className="h-5 w-10 shrink-0 rounded-full" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-6 cursor-pointer items-center justify-center rounded text-[#6C7389] hover:bg-[#ECEEF4]"
          >
            ✕
          </button>
        </div>
      }
    >
      <div
        ref={setScrollArea}
        // 첫 조회 중임을 보조기술에 알린다 — 스켈레톤은 눈으로만 보이는 신호다
        aria-busy={!visible && !hasFailed}
        className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto p-3"
      >
        {hasFailed ? (
          <div className="flex h-full min-h-28 flex-col items-center justify-center gap-2 text-center">
            <p role="alert" className="text-[11px] text-[#E7000B]">
              활동 기록을 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={retry}
              className="cursor-pointer text-[10px] font-semibold text-[#3B5BDB] hover:underline"
            >
              다시 시도
            </button>
          </div>
        ) : !visible ? (
          <ActivityLogSkeleton />
        ) : visible.logs.length === 0 ? (
          <div className="flex h-full min-h-28 flex-col items-center justify-center gap-1 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEEF4] text-[#9AA1B4]">
              <ActivityIcon className="size-4" />
            </span>
            <p className="text-[11px] text-[#6C7389]">활동 기록이 없습니다.</p>
            <p className="text-[10px] text-[#9AA1B4]">
              이 블록에서 무언가 바뀌면 여기에 쌓입니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <section key={group.dateKey}>
                <div className="mb-2.5 flex items-center gap-2">
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
                      // 블록이 고정이라 줄마다 같은 이름을 반복하지 않는다
                      showBlock={false}
                    />
                  ))}
                </ul>
              </section>
            ))}

            {errorMessage && (
              <div className="flex flex-col items-center gap-2">
                <p role="alert" className="text-[10px] text-[#E7000B]">
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={loadMore}
                  className="cursor-pointer text-[10px] font-semibold text-[#3B5BDB] hover:underline"
                >
                  다시 시도
                </button>
              </div>
            )}

            {isLoadingMore && <ActivityLogMoreSkeleton />}

            {visible.hasNext && !errorMessage && (
              <div ref={setSentinel} aria-hidden className="h-px" />
            )}

            {!visible.hasNext && !isLoadingMore && (
              <p className="text-center text-[10px] text-[#9AA1B4]">
                마지막 기록입니다.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
