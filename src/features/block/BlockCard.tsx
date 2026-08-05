'use client';

import { useRef, useState } from 'react';

import BlockTypeIcon from './BlockTypeIcon';
import { BLOCK_TYPES, type StepBlock } from './types';

/** 담당자 아바타 색. 사번을 기준으로 고정 배정해 새로고침해도 같은 색이 나온다 */
const AVATAR_COLORS = [
  '#FE9A00',
  '#2B7FFF',
  '#FF2056',
  '#8E51FF',
  '#00BC7D',
  '#0092B8',
];

function avatarColor(userId: string) {
  const sum = [...userId].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

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
 * ⚠️ 블록 수정 · 삭제 · 순서 변경 API 미확정 — ⋯ 메뉴와 드래그 핸들은 아직 동작하지 않는다.
 */
export default function BlockCard({
  block,
  headerExtra,
  children,
}: BlockCardProps) {
  const type = BLOCK_TYPES.find((option) => option.code === block.type);

  return (
    <article className="flex h-full flex-col rounded-lg border border-[#1C1F2A]/10 bg-white">
      <header className="flex items-center gap-2 border-b border-[#1C1F2A]/10 px-3 py-2">
        {/* TODO: 순서 변경(rowIndex · sortOrder) API 연동 후 드래그 활성 */}
        <span aria-hidden className="flex flex-col gap-0.5 opacity-25">
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
        <BlockMenu title={block.title || type?.label || '블록'} />
      </header>

      <div className="flex-1 p-3">{children}</div>

      <footer className="flex items-center gap-2 border-t border-[#1C1F2A]/[0.05] bg-[#ECEEF4]/20 px-3 py-1.5">
        {block.owner ? (
          <>
            <span
              style={{ backgroundColor: avatarColor(block.owner.userId) }}
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
            >
              {block.owner.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[9px] text-[#6C7389]">
              {block.owner.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-[9px] text-[#6C7389]">담당자 없음</span>
        )}

        {block.linkedIssueTotal > 0 && (
          <span
            title={`연결된 이슈 ${block.linkedIssueDone} / ${block.linkedIssueTotal} 완료`}
            className="shrink-0 text-[9px] text-[#6C7389]"
          >
            # {block.linkedIssueDone} / {block.linkedIssueTotal}
          </span>
        )}
      </footer>
    </article>
  );
}

/** 블록 헤더의 `⋯` 메뉴 — 수정 · 삭제 */
function BlockMenu({ title }: { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
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
            {/* TODO: 블록 수정 · 삭제 API 연동 */}
            <button
              type="button"
              role="menuitem"
              onClick={close}
              className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-[#1C1F2A] hover:bg-gray-50"
            >
              <PencilIcon />
              수정
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={close}
              className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-[#E7000B] hover:bg-red-50"
            >
              <TrashIcon />
              삭제
            </button>
          </span>
        </>
      )}
    </span>
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
