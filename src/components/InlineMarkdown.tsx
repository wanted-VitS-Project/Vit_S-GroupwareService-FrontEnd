import type { ReactNode } from 'react';

/**
 * **인라인** 마크다운만 그리는 렌더러 — `**굵게**` · `*기울임*` · `` `코드` `` · `~~취소~~`.
 *
 * 문단 · 제목 · 목록 같은 블록 문법은 다루지 않는다. 그건 이미 화면 구조가 맡고 있는
 * 자리(AI 결과의 요약 · 지적 사항 · 경고)에 **문장 단위로** 쓰라고 만든 것이다.
 *
 * ⚠️ 왜 `MarkdownView`(TipTap)를 쓰지 않나 — 그건 문서 하나에 에디터 인스턴스 하나다.
 *    지적 사항 20건이면 제목 · 상세로 40개가 뜬다. 문장 하나에 편집기를 붙일 일이 아니다.
 * ⚠️ `_밑줄_` 은 **일부러 뺐다** — 파일명(`report_v2_final`)이 통째로 기울어지는 쪽이
 *    강조를 놓치는 것보다 나쁘다. AI 결과에서 강조는 거의 `*` 로 온다.
 * ⚠️ 링크(`[글](주소)`)도 뺐다 — 본문은 모델이 만든 문자열이라, 주소를 그대로 눌리게
 *    하면 만들어낸 주소로 사용자를 보낼 수 있다.
 */
export default function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}

/** 짝 안쪽에 별표를 **허용하는** 몸통 — 굵게 속 기울임(`**굵게 *속* **`)이 살아난다 */
const NESTABLE = String.raw`\S(?:[\s\S]*?\S)?`;
/**
 * 짝 안쪽에 별표를 **허용하지 않는** 몸통.
 *
 * 기울임을 이걸로 두지 않으면 `*a **b** c*` 에서 여는 `*` 가 `**b` 의 첫 별표를
 * 짝으로 잡아 엉뚱한 자리가 기울어진다. 못 알아보고 별표를 그대로 두는 편이 낫다.
 */
const FLAT = String.raw`[^*\s](?:[^*\n]*[^*\s])?`;

/**
 * 여는 · 닫는 기호가 같은 쌍들. **순서가 규칙이다** (정규식 대안은 앞에서부터 시도된다):
 * 코드 → 굵게+기울임(`***`) → 굵게 → 기울임. 뒤집으면 `**x**` 가 `*` + `*x*` + `*` 로 읽힌다.
 *
 * ⚠️ 기호에 붙은 쪽이 공백이면 짝으로 보지 않는다 — `3 * 4 * 5` 를 기울임으로 읽으면
 *    곱셈이 사라지고, `2 ** 3` 도 굵게가 된다.
 */
const INLINE_PATTERN = new RegExp(
  [
    '`([^`\\n]+)`',
    String.raw`\*\*\*(${FLAT})\*\*\*`,
    String.raw`\*\*(${NESTABLE})\*\*`,
    String.raw`\*(${FLAT})\*`,
    String.raw`~~(${NESTABLE})~~`,
  ].join('|'),
);

const CODE_CLASS =
  'rounded-button-sm bg-bg-surface px-1 font-mono text-[0.9em] text-text-danger';

/**
 * 한 줄을 조각으로 나눠 React 노드로 만든다.
 *
 * 굵게 · 기울임 안쪽은 **다시 파싱한다** (`**굵게 속 *기울임*`). 안쪽 문자열은 기호
 * 네 글자만큼 반드시 짧아지므로 재귀는 끝난다.
 */
function renderInline(text: string, depth = 0): ReactNode[] {
  const nodes: ReactNode[] = [];
  // `g` 플래그 정규식은 `lastIndex` 를 들고 있다 — 재귀와 공유하면 서로 자리를 흐트린다
  const pattern = new RegExp(INLINE_PATTERN.source, 'g');
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const [whole, code, boldItalic, bold, italic, strike] = match;

    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    cursor = match.index + whole.length;

    // 같은 줄에 같은 낱말이 두 번 나올 수 있어 위치를 열쇠에 함께 쓴다
    const key = `${depth}-${match.index}`;

    if (code !== undefined) {
      // 코드 안쪽은 파싱하지 않는다 — `**` 를 글자 그대로 보여주는 자리다
      nodes.push(
        <code key={key} className={CODE_CLASS}>
          {code}
        </code>,
      );
    } else if (boldItalic !== undefined) {
      // 안쪽에 별표는 못 오지만 `` `코드` `` · `~~취소~~` 는 올 수 있다
      nodes.push(
        <strong key={key} className="font-semibold italic">
          {renderInline(boldItalic, depth + 1)}
        </strong>,
      );
    } else if (bold !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {renderInline(bold, depth + 1)}
        </strong>,
      );
    } else if (italic !== undefined) {
      nodes.push(
        <em key={key} className="italic">
          {renderInline(italic, depth + 1)}
        </em>,
      );
    } else if (strike !== undefined) {
      nodes.push(
        <s key={key} className="text-text-secondary">
          {renderInline(strike, depth + 1)}
        </s>,
      );
    }
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));

  return nodes;
}
