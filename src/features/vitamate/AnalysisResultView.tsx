'use client';

import { useMemo, useState } from 'react';

import InlineMarkdown from '@/components/InlineMarkdown';
import MarkdownView from '@/features/block/MarkdownView';

import {
  type AnalysisCitation,
  type AnalysisDocument,
  type FindingSeverity,
  parseResult,
  type ResultBlock,
  type ResultFinding,
} from './types';

/** 접기 전에 보여줄 지적 사항 수 — 나머지는 "더보기" 로 편다 */
const VISIBLE_FINDINGS = 3;

/**
 * 심각도별 왼쪽 색 막대.
 * 값이 어긋난 것(빨강)과 비어 있는 것(주황)을 눈으로 먼저 가르게 한다.
 */
const SEVERITY_BAR: Record<FindingSeverity, string> = {
  high: 'border-l-border-danger',
  medium: 'border-l-[#F54900]',
  low: 'border-l-text-secondary',
};

/**
 * 색 막대가 뜻하는 것 — **등급이 아니라 지적 유형**이다.
 * 시각 사용자는 색으로 구분하므로 비시각 사용자에게도 같은 정보를 준다.
 */
const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  high: '값이 어긋난 항목',
  medium: '비어 있는 항목',
  low: '확인이 필요한 항목',
};

/**
 * AI 분석 결과 본문.
 *
 * ⚠️ `result` 는 서버가 형식을 보장하지 않는 **자유 문자열**이다.
 *    요약 · 지적 사항 · 경고로 나눠지면 구조화해서 그리고, 안 나눠지면
 *    마크다운 원문을 그대로 보여준다 (`parseResult` 가 null 을 준다).
 *
 * 📝 **마크다운** (2026-08-17) — 구조화된 쪽도 조각마다 마크다운을 그린다.
 *    소제목 · 문단 · 목록은 `parseResult` 가 `ResultBlock` 으로 넘겨 주고, 문장 안의
 *    `**굵게**` · `*기울임*` 은 `InlineMarkdown` 이 받는다. 예전엔 파서가 쪼갠 조각을
 *    생 문자열로 박아, 강조 기호가 별표째 읽히고 층이 한 덩이로 뭉개졌다.
 */
export default function AnalysisResultView({
  result,
  documents,
  citations,
}: {
  result: string;
  documents: AnalysisDocument[];
  citations: AnalysisCitation[];
}) {
  // 폴링 중에도 카드가 다시 그려진다 — 긴 결과를 매 렌더마다 줄 단위로 파싱하지 않는다
  const parsed = useMemo(() => parseResult(result), [result]);

  return (
    <div className="flex flex-col gap-3">
      {parsed ? (
        <>
          {parsed.summary.length > 0 && (
            <section>
              <SectionLabel>검토 요약</SectionLabel>
              <BlockList blocks={parsed.summary} />
            </section>
          )}

          {parsed.findings.length > 0 && (
            <FindingList findings={parsed.findings} />
          )}

          {parsed.warning.length > 0 && (
            <WarningBanner blocks={parsed.warning} />
          )}
        </>
      ) : (
        <div className="text-detail leading-relaxed text-text-primary">
          <MarkdownView content={result} />
        </div>
      )}

      {citations.length > 0 && (
        <CitationList citations={citations} documents={documents} />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-1 text-micro font-semibold tracking-wider text-text-secondary uppercase">
      {children}
    </h4>
  );
}

/**
 * 소제목 크기별 글자 크기.
 *
 * ⚠️ 태그는 `h5`/`h6` 로 **고정**한다 — 이 구획 위에 이미 `h4`(`SectionLabel`)가 있어,
 *    원문의 `#` 개수를 그대로 태그로 옮기면 문서 제목 층이 뒤집힌다. 보이는 크기만 나눈다.
 */
const HEADING_SIZE: Record<number, string> = {
  1: 'text-label font-bold',
  2: 'text-label font-bold',
  3: 'text-detail font-semibold',
  4: 'text-detail font-semibold',
  5: 'text-caption font-semibold',
  6: 'text-caption font-semibold',
};

/**
 * 요약 · 경고 구획의 본문 — 소제목 · 문단 · 목록을 원문 순서대로 그린다.
 *
 * 이어지는 목록 항목은 하나의 `<ul>` 로 묶는다. 항목마다 목록을 새로 열면
 * 보조 기술이 "항목 1개짜리 목록" 을 개수만큼 읽는다.
 */
function BlockList({ blocks }: { blocks: ResultBlock[] }) {
  return (
    <div className="flex flex-col gap-1">
      {groupBlocks(blocks).map((group, index) =>
        group.kind === 'item' ? (
          <ul key={index} className="list-disc pl-4">
            {group.blocks.map((block, itemIndex) => (
              <li
                key={itemIndex}
                className="text-detail leading-relaxed break-keep text-text-primary"
              >
                <InlineMarkdown text={block.text} />
              </li>
            ))}
          </ul>
        ) : group.blocks[0].kind === 'heading' ? (
          <h5
            key={index}
            className={`mt-1 break-keep text-text-primary ${
              HEADING_SIZE[group.blocks[0].level ?? 3] ?? HEADING_SIZE[3]
            }`}
          >
            <InlineMarkdown text={group.blocks[0].text} />
          </h5>
        ) : (
          <p
            key={index}
            className="text-detail leading-relaxed break-keep text-text-primary"
          >
            <InlineMarkdown text={group.blocks[0].text} />
          </p>
        ),
      )}
    </div>
  );
}

/** 이어지는 목록 항목만 한 덩이로 묶는다. 나머지는 한 칸에 하나씩 */
function groupBlocks(blocks: ResultBlock[]) {
  const groups: { kind: ResultBlock['kind']; blocks: ResultBlock[] }[] = [];

  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (block.kind === 'item' && last?.kind === 'item') last.blocks.push(block);
    else groups.push({ kind: block.kind, blocks: [block] });
  }

  return groups;
}

function FindingList({ findings }: { findings: ResultFinding[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hidden = findings.length - VISIBLE_FINDINGS;
  const shown =
    isExpanded || hidden <= 0 ? findings : findings.slice(0, VISIBLE_FINDINGS);

  return (
    <section>
      <SectionLabel>불일치 및 누락 항목 · {findings.length}건</SectionLabel>
      <ul className="flex flex-col gap-1">
        {shown.map((finding, index) => (
          <li
            // 제목이 겹칠 수 있어 순서를 함께 쓴다. 목록은 재정렬되지 않는다
            key={`${index}-${finding.title}`}
            className={`rounded-button-sm border-l-2 bg-bg-surface px-2.5 py-1.5 ${SEVERITY_BAR[finding.severity]}`}
          >
            <p className="flex items-center gap-1.5 text-detail font-semibold break-keep text-text-primary">
              <span className="min-w-0 flex-1">
                <InlineMarkdown text={finding.title} />
              </span>
              <span className="sr-only">
                — {SEVERITY_LABEL[finding.severity]}
              </span>
            </p>
            {finding.detail && (
              <p className="mt-0.5 text-caption leading-relaxed break-keep text-text-secondary">
                <InlineMarkdown text={finding.detail} />
              </p>
            )}
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
          aria-expanded={isExpanded}
          className="mt-1 w-full cursor-pointer rounded-button-sm border border-border-default py-1.5 text-caption font-medium text-text-secondary hover:bg-bg-surface"
        >
          {isExpanded ? '접기' : `나머지 ${hidden}건 더보기`}
        </button>
      )}
    </section>
  );
}

/**
 * 종합 경고.
 * 결과 안에서 가장 먼저 읽혀야 하는 문장이라 색을 따로 준다.
 *
 * ⚠️ 배너 안은 색이 하나(`text-yellow-text`)여야 경고로 읽힌다 — `BlockList` 를
 *    돌려쓰면 본문 색이 섞여 들어와 배너가 배너로 보이지 않는다.
 */
function WarningBanner({ blocks }: { blocks: ResultBlock[] }) {
  return (
    <div className="flex items-start gap-1.5 rounded-button-sm border border-yellow-border bg-yellow-bg-soft px-2.5 py-2 text-caption leading-relaxed font-medium break-keep text-yellow-text">
      <span aria-hidden>⚠</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {blocks.map((block, index) => (
          <p key={index} className={block.kind === 'item' ? 'pl-2' : undefined}>
            {block.kind === 'item' && <span aria-hidden>· </span>}
            <InlineMarkdown text={block.text} />
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * 근거 목록 — AI 가 어느 문서 어느 페이지를 보고 말했는지.
 * 결과보다 부차적이라 기본은 접어 둔다.
 */
function CitationList({
  citations,
  documents,
}: {
  citations: AnalysisCitation[];
  documents: AnalysisDocument[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  /** citation 에는 문서명이 없다 — 분석에 쓰인 문서 목록에서 찾는다 */
  function nameOf(fileVersionId: number) {
    return (
      documents.find((document) => document.fileVersionId === fileVersionId)
        ?.fileName ?? '삭제된 문서'
    );
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center gap-1 text-micro font-semibold tracking-wider text-text-secondary uppercase hover:text-text-primary"
      >
        <span>근거 · {citations.length}건</span>
        <span aria-hidden className={isOpen ? 'rotate-180' : ''}>
          ⌄
        </span>
      </button>

      {isOpen && (
        <ol className="mt-1 flex flex-col gap-1">
          {[...citations]
            .sort((left, right) => left.rankOrder - right.rankOrder)
            .map((citation) => (
              <li
                key={citation.documentChunkId}
                className="rounded-button-sm bg-bg-surface px-2.5 py-1.5"
              >
                <p className="text-micro text-text-secondary">
                  {nameOf(citation.fileVersionId)}
                  {citation.pageNumber !== null && ` · ${citation.pageNumber}p`}
                </p>
                <p className="mt-0.5 text-caption leading-relaxed break-keep text-text-primary">
                  {citation.excerpt}
                </p>
              </li>
            ))}
        </ol>
      )}
    </section>
  );
}
