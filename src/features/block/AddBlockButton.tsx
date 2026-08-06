'use client';

import { useState } from 'react';

import AddBlockModal from './AddBlockModal';
import type { StepBlock } from './types';

/** 스텝 화면 블록 목록 헤더의 `Block 추가` 버튼. */
export default function AddBlockButton({
  stepName,
  blocks,
  onCreated,
}: {
  stepName: string;
  /** 새 블록 자리 계산용 — 아직 못 불러왔으면 `null` */
  blocks: StepBlock[] | null;
  onCreated?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[#3B5BDB] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3450c4]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
          className="size-3"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Block 추가
      </button>

      {isOpen && (
        <AddBlockModal
          stepName={stepName}
          blocks={blocks}
          onCreated={onCreated}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
