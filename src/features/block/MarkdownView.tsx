'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

import { MARKDOWN_CLASS } from './MarkdownEditor';

// 읽기 전용 마크다운 렌더. 편집기와 같은 확장을 써서 카드 미리보기와 편집 화면이 어긋나지 않는다.
// 내용이 바뀌면 호출부에서 key 를 갈아 다시 마운트한다 — 저장 직후에만 일어난다.
export default function MarkdownView({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: MARKDOWN_CLASS } },
  });

  return <EditorContent editor={editor} />;
}
