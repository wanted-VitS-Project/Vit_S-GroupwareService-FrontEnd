'use client';

import { useMemo, useState } from 'react';

import MarkdownView from '@/features/block/MarkdownView';

import {
  type AnalysisCitation,
  type AnalysisDocument,
  type FindingSeverity,
  parseResult,
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
          {parsed.summary && (
            <section>
              <SectionLabel>검토 요약</SectionLabel>
              <p className="text-[11px] leading-relaxed break-keep text-text-primary">
                {parsed.summary}
              </p>
            </section>
          )}

          {parsed.findings.length > 0 && (
            <FindingList findings={parsed.findings} />
          )}

          {parsed.warning && <WarningBanner text={parsed.warning} />}
        </>
      ) : (
        <div className="text-[11px] leading-relaxed text-text-primary">
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
    <h4 className="mb-1 text-[9px] font-semibold tracking-wider text-text-secondary uppercase">
      {children}
    </h4>
  );
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
            <p className="flex items-center gap-1.5 text-[11px] font-semibold break-keep text-text-primary">
              <span className="min-w-0 flex-1">{finding.title}</span>
              <span className="sr-only">
                — {SEVERITY_LABEL[finding.severity]}
              </span>
            </p>
            {finding.detail && (
              <p className="mt-0.5 text-caption leading-relaxed break-keep text-text-secondary">
                {finding.detail}
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
 * 종합 경고 줄.
 * 결과 안에서 가장 먼저 읽혀야 하는 문장이라 색을 따로 준다.
 */
function WarningBanner({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-1.5 rounded-button-sm border border-yellow-border bg-yellow-bg-soft px-2.5 py-2 text-caption leading-relaxed font-medium break-keep text-yellow-text">
      <span aria-hidden>⚠</span>
      <span className="min-w-0 flex-1">{text}</span>
    </p>
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
        className="flex w-full cursor-pointer items-center gap-1 text-[9px] font-semibold tracking-wider text-text-secondary uppercase hover:text-text-primary"
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
                <p className="text-[9px] text-text-secondary">
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
