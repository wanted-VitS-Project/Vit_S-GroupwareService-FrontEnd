'use client';

import { memo } from 'react';

import RowMenu from '@/components/RowMenu';
import { formatDate } from '@/lib/format';

import {
  AssigneeAvatars,
  IssuePriorityBadge,
  OverdueBadge,
} from './IssueBadges';
import { overdueDays, type IssueSummary } from './types';

/**
 * 이슈 보드의 카드 한 장.
 *
 * 카드 전체가 드래그 손잡이다 — 열 사이로 끌어 상태를 바꾼다.
 * `⋯` 은 수정 · 삭제만 담는다 (스텝 `EDITOR` 에게만 보인다).
 *
 * ⚠️ 상세 열기는 **제목 버튼**이 맡는다. 카드에 메뉴 버튼이 들어 있어 겉껍데기를
 *    `role="button"` 으로 만들면 중첩 대화형 요소가 되어 보조기술에서 뜻이 어긋난다.
 *    (마우스 편의를 위해 카드 여백 클릭도 상세를 열지만, 초점·키보드는 제목 버튼이 받는다)
 * ⚠️ **상태 변경은 드래그&드롭 하나로만 한다** (2026-08-07 결정).
 *    메뉴에 있던 `~(으)로 이동` 항목을 없앴다 — 경로가 둘이면 어느 쪽이 정본인지 흐려진다.
 *    대신 드래그를 쓸 수 없는 사용자는 상태를 바꿀 수단이 없다.
 *
 * ⚠️ `memo` 로 감싼다. 드래그 중에는 보드가 자주 다시 그려지는데, 그때마다
 *    카드 전부를 다시 그리면 이슈가 많은 스텝에서 화면이 버벅인다.
 *    그래서 콜백 prop 은 **호출 때 대상을 넘기는 고정 함수**를 받는다
 *    (카드마다 새로 만든 화살표 함수를 넘기면 `memo` 가 무력해진다).
 */
function IssueCard({
  issue,
  canEdit,
  isDragging,
  onOpen,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  issue: IssueSummary;
  /** 스텝 `EDITOR` 인지 — 아니면 드래그 · 메뉴를 막는다 */
  canEdit: boolean;
  /** 지금 끌고 있는 카드 */
  isDragging: boolean;
  onOpen: (issueId: number) => void;
  onEdit: (issueId: number) => void;
  onDelete: (issueId: number) => void;
  onDragStart: (event: React.DragEvent, issue: IssueSummary) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable={canEdit}
      onDragStart={(event) => onDragStart(event, issue)}
      onDragEnd={onDragEnd}
      // 카드 위에서도 열(section)이 dragover 를 받아야 한다 — 여기서 막지 않는다
      onClick={() => onOpen(issue.issueId)}
      // 크기 · 위치를 바꾸는 효과는 쓰지 않는다 — 드래그 중 카드가 흔들려 보인다
      className={`rounded-lg border bg-white p-3 transition-colors select-none ${
        canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${
        isDragging
          ? 'border-dashed border-[#3B5BDB]/40 bg-[#ECEEF4]/40 opacity-50'
          : 'border-[#1C1F2A]/10 hover:border-[#3B5BDB]/30'
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <IssuePriorityBadge priority={issue.priority} />
          <OverdueBadge days={overdueDays(issue)} />
        </span>
        {canEdit && (
          // 카드 클릭(상세 열기)까지 번지지 않게 메뉴 영역에서 멈춘다
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <RowMenu
              label={issue.title}
              // 상태 이동 항목이 빠져 `수정` · `삭제` 두 줄만 남는다
              width={112}
              items={[
                { label: '수정', onSelect: () => onEdit(issue.issueId) },
                {
                  label: '삭제',
                  danger: true,
                  onSelect: () => onDelete(issue.issueId),
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* 상세 열기의 진짜 주체 — 초점 · Enter · 스크린리더가 여기를 잡는다 */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen(issue.issueId);
        }}
        className="mb-2 block cursor-pointer text-left text-[11px] leading-snug font-semibold text-[#1C1F2A] hover:text-[#3B5BDB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5BDB]"
      >
        {issue.title}
      </button>

      <div className="flex items-center justify-between gap-2">
        <AssigneeAvatars assignees={issue.assignees} />
        <div className="flex items-center gap-2 text-[10px] text-[#6C7389]">
          {issue.relatedBlocks.length > 0 && (
            <span title={`연결된 블록 ${issue.relatedBlocks.length}개`}>
              🔗 {issue.relatedBlocks.length}
            </span>
          )}
          <span>{formatDate(issue.dueDate) || '마감일 없음'}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(IssueCard);
