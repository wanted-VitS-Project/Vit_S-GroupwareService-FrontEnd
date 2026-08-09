'use client';

import { useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import { formatDateTime } from '@/lib/format';
import { messageOf } from '@/lib/api';

import AnalysisResultView from './AnalysisResultView';
import { getAnalysis, getBlockAnalyses } from './api';
import StatusBadge from './StatusBadge';
import {
  type Analysis,
  type AnalysisDocument,
  type AnalysisSummary,
  isRunning,
  ROLE_LABEL,
} from './types';

/**
 * 분석 이력 패널. (최신순 · 최대 20건 · 페이징 없음)
 *
 * ⚠️ 목록 API 에는 `documents`·`result`·`citations` 가 없다 — 한 건을 누르면
 *    단건 조회를 한 번 더 해서 본문·근거를 채운다.
 *
 * 활동 로그 패널과 같은 자리 · 같은 크기로 뜬다.
 */
export default function AnalysisHistoryPanel({
  blockId,
  blockTitle,
  onClose,
}: {
  blockId: number;
  blockTitle: string;
  onClose: () => void;
}) {
  const [analyses, setAnalyses] = useState<AnalysisSummary[] | null>(null);
  const [listError, setListError] = useState('');
  /** 펼쳐 본 분석 — 목록에서 한 건을 고르면 상세로 바뀐다 */
  const [openId, setOpenId] = useState<number | null>(null);
  /**
   * 한 번 본 상세는 들고 있는다.
   *
   * 끝난 분석은 내용이 더 바뀌지 않는데, 목록 ↔ 상세를 오갈 때마다 다시 받고
   * 있었다. 진행 중인 건만 매번 새로 받는다.
   *
   * `useRef` 가 아니라 `useState` 로 두는 것은 이 값을 **렌더 중에 자식에게
   * 넘기기** 때문이다 — ref 는 렌더 중 접근이 금지돼 있다. 갱신자는 안 쓰므로
   * 참조는 마운트 내내 그대로다.
   */
  const [seen] = useState(() => new Map<number, Analysis>());

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getBlockAnalyses(blockId, signal)
      .then((data) => {
        setAnalyses(data);
        setListError('');
      })
      .catch((caught) => {
        if (signal.aborted) return;
        setAnalyses([]);
        setListError(messageOf(caught, '분석 이력을 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [blockId]);

  return (
    <Modal
      title="비타메이트 분석 이력"
      onClose={onClose}
      className="mt-auto mr-4 mb-4 ml-auto flex h-[72vh] max-h-[560px] w-[420px] flex-col overflow-hidden rounded-xl border border-border-default shadow-2xl"
      header={
        <div className="flex shrink-0 items-center gap-2 border-b border-border-default px-4 py-3">
          <span className="flex size-5 shrink-0 items-center justify-center rounded border border-purple-border bg-blue-bg-soft text-[11px] text-[#4F39F6]">
            ✦
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold text-text-primary">
              비타메이트 분석 이력
            </h2>
            <p className="truncate text-[10px] text-text-secondary">
              {blockTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover"
          >
            ✕
          </button>
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {openId !== null ? (
          <AnalysisDetail
            analysisId={openId}
            cache={seen}
            onBack={() => setOpenId(null)}
          />
        ) : analyses === null ? (
          <ul className="flex flex-col gap-1.5">
            {[0, 1, 2].map((row) => (
              <li
                key={row}
                aria-hidden
                className="h-14 animate-pulse rounded-lg bg-bg-hover"
              />
            ))}
          </ul>
        ) : listError ? (
          // 빈 목록과 같은 모양이면 실패를 "아직 없음" 으로 오해한다
          <p
            role="alert"
            className="rounded border border-red-border bg-red-bg-soft px-2.5 py-3 text-center text-[11px] break-keep text-text-danger"
          >
            {listError}
          </p>
        ) : analyses.length === 0 ? (
          <p className="py-10 text-center text-xs text-text-secondary">
            아직 실행한 분석이 없습니다.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {analyses.map((analysis) => (
                <li key={analysis.analysisId}>
                  <button
                    type="button"
                    onClick={() => setOpenId(analysis.analysisId)}
                    className="w-full cursor-pointer rounded-lg border border-border-default px-3 py-2 text-left hover:bg-bg-surface"
                  >
                    <span className="flex items-center gap-1.5">
                      <StatusBadge status={analysis.analysisStatus} />
                      <span className="min-w-0 flex-1 truncate text-[10px] text-text-secondary">
                        {analysis.reviewType ?? '검토 유형 지정 안 됨'}
                      </span>
                      <span className="shrink-0 text-[9px] text-text-secondary">
                        {formatDateTime(analysis.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed break-keep text-text-primary">
                      {analysis.prompt ?? '프롬프트 없음'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {analyses.length >= 20 && (
              <p className="mt-2 text-center text-[9px] text-text-secondary">
                최근 20건까지만 보여집니다.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

/** 이력 한 건의 상세 — 목록 응답에 본문이 없어 단건 조회로 받아 온다 */
function AnalysisDetail({
  analysisId,
  cache,
  onBack,
}: {
  analysisId: number;
  /** 이미 본 분석 — 다시 받지 않는다 */
  cache: Map<number, Analysis>;
  onBack: () => void;
}) {
  const [analysis, setAnalysis] = useState<Analysis | null>(
    () => cache.get(analysisId) ?? null,
  );
  const [error, setError] = useState('');

  /** 상세를 갈아탈 때 캐시가 있으면 깜빡임 없이 곧바로 보여준다 */
  const [trackedId, setTrackedId] = useState(analysisId);
  if (trackedId !== analysisId) {
    setTrackedId(analysisId);
    setAnalysis(cache.get(analysisId) ?? null);
    setError('');
  }

  useEffect(() => {
    // 끝난 분석은 내용이 더 바뀌지 않는다
    if (cache.has(analysisId)) return;

    const controller = new AbortController();
    const { signal } = controller;

    getAnalysis(analysisId, signal)
      .then((data) => {
        // 진행 중인 건은 아직 확정이 아니라 캐시하지 않는다
        if (!isRunning(data.analysisStatus)) cache.set(analysisId, data);
        setAnalysis(data);
        setError('');
      })
      .catch((caught) => {
        if (signal.aborted) return;
        setError(messageOf(caught, '분석을 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [analysisId, cache]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer self-start text-[10px] font-medium text-[#4F39F6] hover:underline"
      >
        ← 이력 목록
      </button>

      {error ? (
        <p className="py-10 text-center text-xs text-text-secondary">{error}</p>
      ) : !analysis ? (
        <div
          aria-hidden
          className="h-40 animate-pulse rounded-lg bg-bg-hover"
        />
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={analysis.analysisStatus} />
            <span className="text-[9px] text-text-secondary">
              {formatDateTime(analysis.completedAt ?? analysis.createdAt)}
            </span>
          </div>

          <DocumentRoleList documents={analysis.documents} />

          {analysis.prompt && (
            <blockquote className="rounded bg-bg-surface px-2.5 py-2 text-[10px] leading-relaxed break-keep text-text-secondary">
              {analysis.prompt}
            </blockquote>
          )}

          {analysis.analysisStatus === 'FAILED' ? (
            <p className="rounded border border-red-border bg-red-bg-soft px-2.5 py-2 text-[10px] break-keep text-text-danger">
              {analysis.errorMessage ?? '분석에 실패했습니다.'}
            </p>
          ) : analysis.result ? (
            <AnalysisResultView
              result={analysis.result}
              documents={analysis.documents}
              citations={analysis.citations}
            />
          ) : isRunning(analysis.analysisStatus) ? (
            // 진행 중인데 "결과 없음" 이라고 하면 끝났는데 빈 것으로 읽힌다
            <p className="text-[10px] text-text-secondary">
              아직 검토하고 있어요. 잠시 후 다시 확인해주세요.
            </p>
          ) : (
            <p className="text-[10px] text-text-secondary">
              결과가 비어 있는 분석입니다.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** 분석 **당시** 문서 목록 — 최신 파일이 아니다 */
export function DocumentRoleList({
  documents,
}: {
  documents: AnalysisDocument[];
}) {
  if (documents.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1">
      {documents.map((document) => (
        <li
          key={document.fileVersionId}
          className="flex max-w-full items-center gap-1 rounded border border-border-default bg-bg-surface px-1.5 py-0.5"
        >
          {/* 블록 카드와 같은 매퍼를 쓴다 — 한쪽만 REFERENCE 로 보이면 용어가 갈린다 */}
          <span className="shrink-0 text-[8px] font-bold tracking-wider text-text-secondary">
            {ROLE_LABEL[document.documentRole]}
          </span>
          <span className="min-w-0 truncate text-[10px] text-text-primary">
            {document.fileName}
          </span>
        </li>
      ))}
    </ul>
  );
}
