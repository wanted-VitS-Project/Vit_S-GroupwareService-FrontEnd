'use client';

import { useState } from 'react';

import BlockCard from './BlockCard';
import MarkdownView from './MarkdownView';
import TextBlockModal from './TextBlockModal';
import { readTextBlockDetail, type StepBlock } from './types';

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
            <p className="text-[10px] text-[#6C7389]/60">
              내용이 없습니다. 편집으로 작성해보세요.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#1C1F2A]/[0.045] pt-1">
          <span className="font-mono text-[9px] text-[#6C7389]">
            {content.length}자
          </span>

          {detail ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-[#3B5BDB] hover:bg-[#3B5BDB]/10"
            >
              <PencilIcon />
              편집
            </button>
          ) : (
            // detail.txtId 없이는 어느 본문을 고칠지 알 수 없다
            <span className="text-[9px] text-[#6C7389]">편집 불가</span>
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
