'use client';

import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

/**
 * 마크다운 렌더 스타일. 편집 화면과 카드 미리보기가 같은 모습이어야 해서 공유한다.
 * `@tailwindcss/typography` 를 도입하지 않고 필요한 요소만 직접 지정한다.
 */
export const MARKDOWN_CLASS = [
  'text-detail leading-[18px] text-text-primary',
  '[&_p]:my-0 [&_p+p]:mt-2',
  '[&_strong]:font-semibold',
  '[&_em]:italic',
  '[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-[15px] [&_h1]:font-bold',
  '[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:border-b [&_h2]:border-border-default [&_h2]:pb-1 [&_h2]:text-detail [&_h2]:font-bold',
  '[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-label [&_h3]:font-bold',
  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:my-0.5',
  '[&_blockquote]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-border-default [&_blockquote]:pl-3 [&_blockquote]:text-text-secondary [&_blockquote]:italic',
  '[&_code]:rounded-button-sm [&_code]:bg-bg-surface [&_code]:px-1 [&_code]:font-mono [&_code]:text-caption [&_code]:text-text-danger',
  '[&_pre]:my-1.5 [&_pre]:rounded-button-sm [&_pre]:bg-bg-surface [&_pre]:p-2',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-text-primary',
  '[&_hr]:my-2 [&_hr]:border-t [&_hr]:border-border-default',
].join(' ');

/**
 * `tiptap-markdown` 이 `editor.storage` 타입을 확장하지 않아 여기서 좁혀 쓴다.
 * 확장이 등록돼 있으면 항상 존재하는 값이다.
 */
function toMarkdown(editor: Editor) {
  const { markdown } = editor.storage as unknown as {
    markdown: { getMarkdown: () => string };
  };
  return markdown.getMarkdown();
}

/** 마크다운 원문을 화면에 노출하지 않는 WYSIWYG 에디터 + 서식 툴바 */
export default function MarkdownEditor({
  value,
  onChange,
  onReady,
}: {
  value: string;
  onChange: (markdown: string) => void;
  /** 파싱 후 최초 직렬화 값을 넘겨 dirty 비교 기준을 에디터와 맞춘다. */
  onReady?: (normalizedMarkdown: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: value,
    // SSR 에서 즉시 렌더하면 하이드레이션이 어긋난다
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${MARKDOWN_CLASS} min-h-[300px] outline-none`,
        'aria-label': '텍스트 블록 본문',
      },
    },
    onCreate: ({ editor: current }) => onReady?.(toMarkdown(current)),
    onUpdate: ({ editor: current }) => onChange(toMarkdown(current)),
  });

  return (
    <>
      <div
        role="toolbar"
        aria-label="텍스트 서식"
        aria-controls="markdown-editor-body"
        className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border-default bg-bg-surface px-4 py-2"
      >
        {editor && <Toolbar editor={editor} />}
      </div>

      <div
        id="markdown-editor-body"
        className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
      >
        <EditorContent editor={editor} />
      </div>
    </>
  );
}

/**
 * 서식 툴바.
 *
 * ⚠️ TipTap 3 의 기본값이 `shouldRerenderOnTransaction: false` 라서
 *    `editor.isActive(...)` 를 렌더 중에 그냥 읽으면 선택 영역이 바뀌어도 갱신되지 않는다.
 *    `useEditorState` 로 필요한 값만 구독해야 활성 표시가 따라온다.
 */
function Toolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      heading1: current.isActive('heading', { level: 1 }),
      heading2: current.isActive('heading', { level: 2 }),
      heading3: current.isActive('heading', { level: 3 }),
      paragraph: current.isActive('paragraph'),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      blockquote: current.isActive('blockquote'),
      code: current.isActive('code'),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <>
      <ToolButton
        label="굵게 (Ctrl+B)"
        isActive={active.bold}
        onClick={() => chain().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton
        label="기울임 (Ctrl+I)"
        isActive={active.italic}
        onClick={() => chain().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolButton>

      <Divider />

      {([1, 2, 3] as const).map((level) => (
        <ToolButton
          key={level}
          label={`제목 ${level}`}
          isActive={active[`heading${level}`]}
          onClick={() => chain().toggleHeading({ level }).run()}
        >
          <span className="font-mono font-bold">H{level}</span>
        </ToolButton>
      ))}
      <ToolButton
        label="본문"
        isActive={active.paragraph}
        onClick={() => chain().setParagraph().run()}
      >
        <span className="font-mono">P</span>
      </ToolButton>

      <Divider />

      <ToolButton
        label="글머리 목록"
        isActive={active.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <span className="font-mono">•≡</span>
      </ToolButton>
      <ToolButton
        label="번호 목록"
        isActive={active.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <span className="font-mono">1≡</span>
      </ToolButton>

      <Divider />

      <ToolButton
        label="인용"
        isActive={active.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        ❝
      </ToolButton>
      <ToolButton
        label="코드"
        isActive={active.code}
        onClick={() => chain().toggleCode().run()}
      >
        <span className="font-mono text-[#FB2C36]">{'</>'}</span>
      </ToolButton>
      <ToolButton
        label="구분선"
        onClick={() => chain().setHorizontalRule().run()}
      >
        <span className="font-mono">―</span>
      </ToolButton>

      <Divider />

      <ToolButton
        label="서식 지우기"
        onClick={() => chain().unsetAllMarks().clearNodes().run()}
      >
        Tx
      </ToolButton>
    </>
  );
}

function ToolButton({
  label,
  isActive = false,
  onClick,
  children,
}: {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      onClick={onClick}
      className={`flex h-6 min-w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-button-sm px-1.5 text-caption font-medium ${
        isActive
          ? 'bg-blue-bg-soft text-text-primary-blue ring-1 ring-border-primary/30'
          : 'text-text-secondary hover:bg-bg-sidebar/5'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-bg-sidebar/10" />
  );
}
