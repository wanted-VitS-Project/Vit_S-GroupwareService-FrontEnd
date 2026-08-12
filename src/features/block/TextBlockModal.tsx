'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
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
  const [confirmation, setConfirmation] = useState<'save' | 'leave' | null>(
    null,
  );
  /** TipTap이 최초로 파싱·직렬화한 값 — 원문 표기 차이를 수정으로 오인하지 않는다. */
  const [normalizedInitialContent, setNormalizedInitialContent] = useState<
    string | null
  >(null);
  const isDirty =
    normalizedInitialContent !== null && content !== normalizedInitialContent;

  function requestClose() {
    if (isSaving) return;
    if (isDirty) setConfirmation('leave');
    else onClose();
  }

  function requestSave() {
    if (isSaving) return;
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirmation('save');
  }

  async function save() {
    if (isSaving) return;

    setConfirmation(null);
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
    <>
      <Modal
        title="텍스트 블록 편집"
        // 저장 중에는 ESC · 백드롭 클릭까지 막는다.
        // 닫은 뒤 응답이 도착하면 카드 내용이 예고 없이 바뀐다
        onClose={isSaving ? undefined : requestClose}
        className="flex max-h-[85vh] w-full max-w-[680px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
        header={
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border-default px-5 py-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-button-sm border border-border-default bg-bg-surface text-gray-text-soft">
              <BlockTypeIcon code="TEXT" />
            </span>
            <h2 className="shrink-0 text-body-m font-semibold text-text-primary">
              텍스트 블록 편집
            </h2>
            <span className="min-w-0 flex-1 truncate font-mono text-caption text-text-secondary">
              {blockTitle}
            </span>
            <button
              type="button"
              onClick={requestClose}
              disabled={isSaving}
              aria-label="닫기"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CloseIcon />
            </button>
          </div>
        }
      >
        <MarkdownEditor
          value={content}
          onChange={setContent}
          onReady={(normalized) => {
            setContent(normalized);
            setNormalizedInitialContent(normalized);
          }}
        />

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border-default bg-bg-surface px-5 py-3">
          <p
            role={errorMessage ? 'alert' : undefined}
            className={`text-caption ${
              errorMessage ? 'text-text-danger' : 'text-text-secondary'
            }`}
          >
            {errorMessage ||
              '선택 후 툴바 버튼을 클릭하거나 Ctrl+B / Ctrl+I 단축키를 사용하세요'}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSaving}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="button"
              onClick={requestSave}
              disabled={isSaving}
              className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
            >
              {isSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </Modal>
      {confirmation === 'save' && (
        <AlertDialogTwoButton
          icon={DialogIcons.info}
          title="변경사항을 저장할까요?"
          description="편집한 텍스트 블록 본문을 저장합니다."
          confirmLabel="저장"
          onConfirm={save}
          onCancel={() => setConfirmation(null)}
        />
      )}
      {confirmation === 'leave' && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="편집을 취소할까요?"
          description="저장하지 않은 본문 변경사항은 사라집니다."
          confirmLabel="나가기"
          isDanger
          onConfirm={onClose}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </>
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
