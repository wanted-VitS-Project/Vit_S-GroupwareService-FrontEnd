'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import ModalLoadingFallback from '@/components/ModalLoadingFallback';

import BlockCard from './BlockCard';
import { readTextBlockDetail, type StepBlock } from './types';

const MarkdownView = dynamic(() => import('./MarkdownView'), {
  loading: () => (
    <div
      role="status"
      aria-label="텍스트 본문을 불러오는 중입니다"
      className="h-20 animate-pulse rounded bg-bg-surface"
    />
  ),
});
const loadTextBlockModal = () => import('./TextBlockModal');
const TextBlockModal = dynamic(loadTextBlockModal, {
  loading: () => (
    <ModalLoadingFallback
      title="텍스트 블록 편집"
      className="flex h-[85vh] w-full max-w-[680px] flex-col rounded-xl p-6 shadow-2xl"
      bodyClassName="mt-5 min-h-0 flex-1"
    />
  ),
});

/**
 * 텍스트 블록.
 * 카드에는 서식이 적용된 결과만 보이고, 마크다운 원문은 노출하지 않는다.
 * 생성 직후에는 `autoEdit` 으로 편집 모달이 곧바로 열린다.
 */
export default function TextBlock({
  block,
  autoEdit = false,
}: {
  block: StepBlock;
  autoEdit?: boolean;
}) {
  const detail = readTextBlockDetail(block.detail);
  const serverContent = detail?.content ?? '';

  const [content, setContent] = useState(serverContent);
  const [isEditing, setIsEditing] = useState(autoEdit);

  // 아래 두 블록은 effect 가 아니라 렌더 중 상태 조정이다.
  // (https://react.dev/reference/react/useState — effect 로 하면 린트 규칙에 걸린다)

  // 재조회로 서버 본문이 바뀌면 화면도 따라간다
  const [lastServerContent, setLastServerContent] = useState(serverContent);
  if (lastServerContent !== serverContent) {
    setLastServerContent(serverContent);
    setContent(serverContent);
  }

  // 마운트 이후에 autoEdit 이 켜져도 입력창이 열려야 한다
  const [lastAutoEdit, setLastAutoEdit] = useState(autoEdit);
  if (lastAutoEdit !== autoEdit) {
    setLastAutoEdit(autoEdit);
    if (autoEdit) setIsEditing(true);
  }

  return (
    <BlockCard block={block}>
      <div className="flex h-full flex-col gap-2">
        <div className="max-h-40 min-h-0 flex-1 overflow-hidden">
          {content ? (
            // 저장 직후 새 내용으로 다시 마운트한다
            <MarkdownView key={content} content={content} />
          ) : (
            <p className="text-[10px] text-text-muted">
              내용이 없습니다. 편집으로 작성해보세요.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border-default pt-1">
          <span className="font-mono text-[9px] text-text-secondary">
            {content.length}자
          </span>

          {detail ? (
            <button
              type="button"
              onPointerEnter={() => void loadTextBlockModal()}
              onFocus={() => void loadTextBlockModal()}
              onClick={() => setIsEditing(true)}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-text-primary-blue hover:bg-blue-bg-soft"
            >
              <PencilIcon />
              편집
            </button>
          ) : (
            // detail.txtId 없이는 어느 본문을 고칠지 알 수 없다
            <span className="text-[9px] text-text-secondary">편집 불가</span>
          )}
        </div>
      </div>

      {isEditing && detail && (
        <TextBlockModal
          blockTitle={block.title || '텍스트'}
          txtId={detail.txtId}
          initialContent={content}
          onClose={() => setIsEditing(false)}
          onSaved={setContent}
        />
      )}
    </BlockCard>
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
