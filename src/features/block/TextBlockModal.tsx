'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { updateTextBlock } from './api';
import BlockTypeIcon from './BlockTypeIcon';
import MarkdownEditor from './MarkdownEditor';

interface TextBlockModalProps {
  /** 헤더에 노출할 블록 제목 */
  blockTitle: string;
  txtId: number;
  /** 마크다운 원문 */
  initialContent: string;
  onClose: () => void;
  /** 저장 성공 시 화면에 반영할 내용 */
  onSaved: (content: string) => void;
}

/**
 * 텍스트 블록 편집 모달.
 * 생성 직후에도 같은 모달이 곧바로 열린다 (빈 내용으로 시작).
 */
export default function TextBlockModal({
  blockTitle,
  txtId,
  initialContent,
  onClose,
  onSaved,
}: TextBlockModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function save() {
    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage('');

    try {
      const updated = await updateTextBlock(txtId, content);
      onSaved(updated.content);
      onClose();
    } catch (caught) {
      setErrorMessage(messageOf(caught, '본문을 저장하지 못했습니다.'));
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="텍스트 블록 편집"
      // 저장 중에는 ESC · 백드롭 클릭까지 막는다.
      // 닫은 뒤 응답이 도착하면 카드 내용이 예고 없이 바뀐다
      onClose={isSaving ? undefined : onClose}
      className="flex max-h-[85vh] w-full max-w-[680px] flex-col overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      header={
        <div className="flex shrink-0 items-center gap-2.5 border-b border-[#1C1F2A]/10 px-5 py-3">
          <span className="flex size-5 shrink-0 items-center justify-center rounded border border-[#E2E8F0] bg-[#F1F5F9] text-[#45556C]">
            <BlockTypeIcon code="TEXT" />
          </span>
          <h2 className="shrink-0 text-sm font-semibold text-[#1C1F2A]">
            텍스트 블록 편집
          </h2>
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[#6C7389]">
            {blockTitle}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="닫기"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CloseIcon />
          </button>
        </div>
      }
    >
      <MarkdownEditor value={content} onChange={setContent} />

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#1C1F2A]/10 bg-[#ECEEF4]/20 px-5 py-3">
        <p
          role={errorMessage ? 'alert' : undefined}
          className={`text-[10px] ${
            errorMessage ? 'text-[#E7000B]' : 'text-[#6C7389]'
          }`}
        >
          {errorMessage ||
            '선택 후 툴바 버튼을 클릭하거나 Ctrl+B / Ctrl+I 단축키를 사용하세요'}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="cursor-pointer rounded-lg bg-[#3B5BDB] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3450c4] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
          >
            {isSaving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="size-3.5"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
