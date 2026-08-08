'use client';

import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import BlockActivityLogPanel from '@/features/activityLog/BlockActivityLogPanel';

import { useBlockActions } from './BlockActionsContext';
import { setPillDragImage, useBlockDrag } from './BlockDragContext';
import BlockDeleteModal from './BlockDeleteModal';
import BlockEditModal from './BlockEditModal';
import BlockIssuesPanel from './BlockIssuesPanel';
import BlockTypeIcon from './BlockTypeIcon';
import { BLOCK_TYPES, type StepBlock } from './types';

interface BlockCardProps {
  block: StepBlock;
  /** 헤더 오른쪽 배지 등 유형별 부가 정보 */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 블록 공통 껍데기 — 헤더(드래그 핸들 · 유형 아이콘 · 제목 · ⋯) / 본문 / 담당자 푸터.
 * 같은 행의 블록끼리 높이를 맞추려고 `h-full` 로 늘어난다.
 *
 * 드래그는 **핸들에서만** 시작한다 — 카드 전체를 잡게 하면 본문의 입력·체크가 막힌다.
 */
export default function BlockCard({
  block,
  headerExtra,
  children,
}: BlockCardProps) {
  const { stepId } = useParams<{ stepId: string }>();
  const [isViewingIssues, setIsViewingIssues] = useState(false);
  const [isViewingLogs, setIsViewingLogs] = useState(false);
  const type = BLOCK_TYPES.find((option) => option.code === block.type);
  const drag = useBlockDrag();
  const label = block.title || type?.label || '블록';
  const isDragging = drag?.draggingId === block.blockId;

  return (
    <article
      /*
       * 드롭 대상 판정은 카드가 하지 않는다 — 보드가 캡처 단계에서 한 번에 처리한다.
       * 카드 안에는 파일 목록 · 에디터처럼 자체 드래그 처리를 갖는 자식이 있어,
       * 카드에 핸들러를 달면 그런 자식 위에서는 이벤트가 올라오지 않는다.
       */
      // 끄는 중인 카드는 "여기서 빠져나간 자리" 로 읽히게 점선 + 반투명으로 낮춘다
      className={`flex h-full flex-col rounded-lg border bg-white transition-[opacity,border-color] duration-150 ${
        isDragging
          ? 'border-dashed border-[#3B5BDB]/40 opacity-40'
          : 'border-[#1C1F2A]/10'
      }`}
    >
      <header className="flex items-center gap-2 border-b border-[#1C1F2A]/10 px-3 py-2">
        <span
          aria-label={drag ? `${label} 위치 이동 핸들` : undefined}
          aria-hidden={drag ? undefined : true}
          draggable={Boolean(drag)}
          onDragStart={
            drag
              ? (event) => {
                  setPillDragImage(event, label);
                  drag.start(block.blockId, label);
                }
              : undefined
          }
          onDragEnd={drag?.finish}
          // 점 6개(약 12×10px)만으로는 잡기 어렵다 — 여백으로 실제 클릭 영역을 넓힌다
          className={`-m-1 flex flex-col gap-0.5 rounded p-1 ${
            drag
              ? 'cursor-grab opacity-40 hover:bg-[#ECEEF4] hover:opacity-80 active:cursor-grabbing'
              : 'opacity-25'
          }`}
        >
          {[0, 1, 2].map((row) => (
            <span key={row} className="flex gap-0.5">
              <span className="size-1 rounded-full bg-[#6C7389]" />
              <span className="size-1 rounded-full bg-[#6C7389]" />
            </span>
          ))}
        </span>

        <span
          style={{
            backgroundColor: type?.background,
            borderColor: type?.border,
            color: type?.icon,
          }}
          className="flex size-5 shrink-0 items-center justify-center rounded border"
        >
          <BlockTypeIcon code={block.type} />
        </span>

        <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#1C1F2A]">
          {block.title || type?.label}
        </h3>

        {headerExtra}
        <BlockMenu
          block={block}
          title={label}
          onViewIssues={() => setIsViewingIssues(true)}
          onViewLogs={() => setIsViewingLogs(true)}
        />
      </header>

      <div className="flex-1 p-3">{children}</div>

      <footer className="flex items-center gap-2 border-t border-[#1C1F2A]/[0.05] bg-[#ECEEF4]/20 px-3 py-1.5">
        {block.owner ? (
          <>
            <MemberAvatar
              userId={block.owner.userId}
              name={block.owner.name}
              size="xs"
              withRing={false}
              // 바로 옆에 이름 글자가 있다
              decorative
            />
            <span className="min-w-0 flex-1 truncate text-[9px] text-[#6C7389]">
              {block.owner.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-[9px] text-[#6C7389]">담당자 없음</span>
        )}

        {block.linkedIssueTotal > 0 && (
          <button
            type="button"
            onClick={() => setIsViewingIssues(true)}
            aria-label={`연결된 이슈 ${block.linkedIssueDone} / ${block.linkedIssueTotal} 완료`}
            title={`연결된 이슈 ${block.linkedIssueDone} / ${block.linkedIssueTotal} 완료`}
            className="shrink-0 cursor-pointer rounded px-1 py-0.5 text-[9px] text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            # {block.linkedIssueDone} / {block.linkedIssueTotal}
          </button>
        )}
      </footer>
      {isViewingIssues && (
        <BlockIssuesPanel
          stepId={stepId}
          blockId={block.blockId}
          blockTitle={label}
          onClose={() => setIsViewingIssues(false)}
        />
      )}
      {isViewingLogs && (
        <BlockActivityLogPanel
          stepId={stepId}
          blockId={block.blockId}
          blockTitle={label}
          onClose={() => setIsViewingLogs(false)}
        />
      )}
    </article>
  );
}

/**
 * 목록을 다시 불러오라고 화면 전체에 알린다.
 *
 * 블록이 **없어지거나 생기는** 변화에만 쓴다. 이름 · 담당자처럼 그 블록 안에서 끝나는
 * 수정은 재조회하지 않고 응답을 곧바로 꽂는다 (`BlockActionsContext`) —
 * 왕복이 끝날 때까지 옛 값이 남거나, 새 배열로 갈리며 배치가 흔들리지 않게.
 */
function notifyBlockChanged() {
  window.dispatchEvent(new Event('block:changed'));
}

function BlockMenu({
  block,
  title,
  onViewIssues,
  onViewLogs,
}: {
  block: StepBlock;
  title: string;
  onViewIssues: () => void;
  onViewLogs: () => void;
}) {
  const actions = useBlockActions();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function openDeleteModal() {
    setIsOpen(false);
    setIsDeleting(true);
  }

  return (
    <>
      <span
        className="relative shrink-0"
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !isOpen) return;
          event.stopPropagation();
          close();
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${title} 메뉴`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((wasOpen) => !wasOpen)}
          className={`flex size-5 cursor-pointer items-center justify-center rounded text-[#6C7389] hover:bg-[#ECEEF4] ${
            isOpen ? 'bg-[#ECEEF4]' : ''
          }`}
        >
          <MoreIcon />
        </button>

        {isOpen && (
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-label="메뉴 닫기"
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <span
              role="menu"
              className="absolute top-full right-0 z-20 mt-1 flex w-28 flex-col overflow-hidden rounded-lg border border-[#1C1F2A]/10 bg-white shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onViewIssues();
                }}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-[#1C1F2A] hover:bg-gray-50"
              >
                <HashIcon />
                <span className="flex-1 text-left">연결된 이슈</span>
                {block.linkedIssueTotal > 0 && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                    {block.linkedIssueTotal}
                  </span>
                )}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onViewLogs();
                }}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-[#1C1F2A] hover:bg-gray-50"
              >
                <ActivityIcon />
                <span className="flex-1 text-left">활동 로그</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  setIsEditing(true);
                }}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-[#1C1F2A] hover:bg-gray-50"
              >
                <PencilIcon />
                수정
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={openDeleteModal}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-[#E7000B] hover:bg-red-50"
              >
                <TrashIcon />
                삭제
              </button>
            </span>
          </>
        )}
      </span>
      {isEditing && (
        <BlockEditModal
          block={block}
          onClose={() => setIsEditing(false)}
          // 보드 밖에서 쓰인 카드(컨텍스트 없음)는 재조회로 되돌아간다
          onUpdated={(updated) =>
            actions ? actions.patch(updated) : notifyBlockChanged()
          }
        />
      )}
      {isDeleting && (
        <BlockDeleteModal
          blockId={block.blockId}
          blockTitle={title}
          onClose={() => setIsDeleting(false)}
          onDeleted={(deletedId) =>
            actions ? actions.remove(deletedId) : notifyBlockChanged()
          }
        />
      )}
    </>
  );
}

function HashIcon() {
  return <span className="text-[11px] font-semibold text-blue-600">#</span>;
}

/** 활동 — 심전도 모양 선 (활동 로그 팝업 헤더와 같은 모양) */
function ActivityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5 shrink-0 text-violet-500"
    >
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="size-2.5"
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5 shrink-0"
    >
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5 shrink-0"
    >
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}
