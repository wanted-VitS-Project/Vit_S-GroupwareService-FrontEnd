'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import ModalLoadingFallback from '@/components/ModalLoadingFallback';

import BlockCard from './BlockCard';
import { useBlockCanEdit } from './BlockPermissionContext';
import { notifyBlockChanged } from './events';
import { readTextBlockDetail, type StepBlock } from './types';

const MarkdownView = dynamic(() => import('./MarkdownView'), {
  loading: () => (
    <div
      role="status"
      aria-label="텍스트 본문을 불러오는 중입니다"
      className="h-20 animate-pulse rounded-button-sm bg-bg-surface"
    />
  ),
});
const loadTextBlockModal = () => import('./TextBlockModal');
const TextBlockModal = dynamic(loadTextBlockModal, {
  loading: () => (
    <ModalLoadingFallback
      title="텍스트 블록 편집"
      className="flex h-[85vh] w-full max-w-[680px] flex-col rounded-base p-6 shadow-2xl"
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
  const serverVersion = detail?.version;

  const [content, setContent] = useState(serverContent);
  /**
   * 저장에 실을 낙관적 락 버전.
   *
   * ⚠️ 응답의 새 값을 여기에 꽂아야 **연달아 두 번 저장**할 수 있다 —
   *    블록 목록을 다시 읽지 않으므로 `detail.version` 은 옛 값에 머문다.
   */
  const [version, setVersion] = useState(serverVersion);
  const canEdit = useBlockCanEdit();
  /*
   * `autoEdit` 는 **방금 만든 블록**에만 켜진다 — 만들 수 있었다는 것은 권한이 있다는 뜻이라
   * 여기서 다시 막지 않는다. 아래 `편집` 버튼만 권한을 본다.
   */
  const [isEditing, setIsEditing] = useState(autoEdit);

  // 아래 세 블록은 effect 가 아니라 렌더 중 상태 조정이다.
  // (https://react.dev/reference/react/useState — effect 로 하면 린트 규칙에 걸린다)

  // 재조회로 서버 본문이 바뀌면 화면도 따라간다
  const [lastServerContent, setLastServerContent] = useState(serverContent);
  if (lastServerContent !== serverContent) {
    setLastServerContent(serverContent);
    setContent(serverContent);
  }

  // 버전도 같이 따라간다 — 본문이 그대로여도 남이 고쳐 버전만 올라갈 수 있다
  const [lastServerVersion, setLastServerVersion] = useState(serverVersion);
  if (lastServerVersion !== serverVersion) {
    setLastServerVersion(serverVersion);
    setVersion(serverVersion);
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
            <p className="text-caption text-text-muted">
              내용이 없습니다. 편집에서 작성하세요.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border-default pt-1">
          <span className="font-mono text-micro text-text-secondary">
            {content.length}자
          </span>

          {/*
            ⚠️ 두 가지를 구분한다 — **권한이 없으면 아무것도 적지 않고**(원래 못 하는 일이라
               안내할 것이 없다), 권한은 있는데 `txtId` 가 없으면 `편집 불가` 로 알린다
               (할 수 있어야 하는데 값이 없어 막힌 경우라 그냥 사라지면 고장으로 읽힌다).
          */}
          {!canEdit ? null : detail ? (
            <button
              type="button"
              onPointerEnter={() => void loadTextBlockModal()}
              onFocus={() => void loadTextBlockModal()}
              onClick={() => setIsEditing(true)}
              className="flex cursor-pointer items-center gap-1 rounded-button-md px-2 py-0.5 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft"
            >
              <PencilIcon />
              편집
            </button>
          ) : (
            // detail.txtId 없이는 어느 본문을 고칠지 알 수 없다
            <span className="text-micro text-text-secondary">편집 불가</span>
          )}
        </div>
      </div>

      {isEditing && detail && (
        <TextBlockModal
          blockTitle={block.title || '텍스트'}
          txtId={detail.txtId}
          initialContent={content}
          version={version}
          onClose={() => setIsEditing(false)}
          onSaved={(saved, savedVersion) => {
            setContent(saved);
            // 응답에 버전이 없으면 비운다 — 옛 값을 들고 있으면 다음 저장이 무조건 409 다
            setVersion(savedVersion);
          }}
          // 409 에서 `다시 불러오기` — 목록을 다시 읽어 새 본문 · 새 버전을 받는다
          onRefetch={notifyBlockChanged}
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
