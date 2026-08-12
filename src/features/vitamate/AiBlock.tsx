'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SIDE_PANEL_WIDE } from '@/components/Modal';
import ModalLoadingFallback, {
  SidePanelFallbackHeader,
} from '@/components/ModalLoadingFallback';
import BlockCard from '@/features/block/BlockCard';
import type { StepBlock } from '@/features/block/types';
import { messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

import { createAnalysis, getBlockAnalyses, newIdempotencyKey } from './api';
import AnalysisResultView from './AnalysisResultView';
import StatusBadge from './StatusBadge';
import {
  type Analysis,
  isRunning,
  readVitamateBlockDetail,
  ROLE_LABEL,
} from './types';
import { useAnalysisPolling } from './useAnalysisPolling';

const loadAnalysisRunModal = () => import('./AnalysisRunModal');
const loadAnalysisHistoryPanel = () => import('./AnalysisHistoryPanel');
const AnalysisRunModal = dynamic(loadAnalysisRunModal, {
  loading: () => (
    <ModalLoadingFallback
      title="비타메이트 분석 실행"
      className="flex h-[85vh] w-full max-w-[720px] flex-col rounded-base p-6 shadow-2xl"
      bodyClassName="mt-5 min-h-0 flex-1"
    />
  ),
});
const AnalysisHistoryPanel = dynamic(loadAnalysisHistoryPanel, {
  loading: () => (
    // 실물은 화면 오른쪽 아래 곁패널이다 — 폴백이 가운데 큰 모달이면 청크 도착 때 자리가 튄다
    <ModalLoadingFallback
      title="비타메이트 분석 이력"
      className={SIDE_PANEL_WIDE}
      header={<SidePanelFallbackHeader title="비타메이트 분석 이력" />}
      bodyClassName="m-3 min-h-0 flex-1"
    />
  ),
});

function preloadAnalysisPanels() {
  void loadAnalysisRunModal();
  void loadAnalysisHistoryPanel();
}

/**
 * 비타메이트 AI 블록. (검토 유형 · 기준/대상 문서 · 프롬프트 → 분석 결과)
 *
 * 화면이 넷으로 갈린다.
 * - 분석 없음 — 실행 안내
 * - `PENDING`·`PROCESSING` — 진행 중 (폴링)
 * - `FAILED` — 실패 사유 + 재실행
 * - `COMPLETED` — 결과 + 재실행 · 수정
 *
 * ⚠️ **"블록의 최신 분석" 전용 API 가 없다.** `detail.latestAnalysisId` 가 있으면
 *    그걸 쓰고, 없으면 이력 목록(최신순)의 첫 건으로 대체한다.
 */
export default function AiBlock({ block }: { block: StepBlock }) {
  const { id: projectId } = useParams<{ id: string }>();
  const detail = readVitamateBlockDetail(block.detail);

  /** 지금 보고 있는 분석. 실행 · 재실행하면 새 ID 로 갈아탄다 */
  const [analysisId, setAnalysisId] = useState<number | null>(
    detail.latestAnalysisId,
  );
  /** 최신 분석 ID 를 이력에서 찾는 중인지 — `detail` 에 없을 때만 돈다 */
  const [isResolving, setIsResolving] = useState(
    detail.latestAnalysisId === null,
  );
  /** 이 화면에서 방금 요청했는지 — 첫 15초를 건너뛸지 정한다 */
  const [justRequested, setJustRequested] = useState(false);
  /** 최신 분석을 찾다가 실패했는지 — "분석 없음" 과 구분해야 한다 */
  const [resolveError, setResolveError] = useState('');
  /** 값이 바뀌면 최신 분석을 다시 찾는다 */
  const [resolveCount, setResolveCount] = useState(0);

  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [actionError, setActionError] = useState('');

  const { analysis, loadError, isSlow } = useAnalysisPolling(analysisId, {
    justRequested,
  });

  useEffect(() => {
    if (detail.latestAnalysisId !== null) return;

    const controller = new AbortController();
    const { signal } = controller;

    getBlockAnalyses(block.blockId, signal)
      .then((list) => {
        // 최신순이라 첫 건이 최신이다
        if (list.length > 0) setAnalysisId(list[0].analysisId);
        setResolveError('');
      })
      .catch((caught) => {
        if (signal.aborted) return;
        /*
         * 삼키면 안 된다 — 실패를 "분석 없음" 으로 보여주면, 이미 결과가 있는데도
         * 사용자가 새로 실행해서 **같은 분석을 중복 생성**한다.
         */
        setResolveError(messageOf(caught, '분석 이력을 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (!signal.aborted) setIsResolving(false);
      });

    return () => controller.abort();
  }, [block.blockId, detail.latestAnalysisId, resolveCount]);

  /** 같은 설정으로 새 분석을 만든다 — 새 결과를 원하는 것이므로 키를 새로 뽑는다 */
  async function rerun() {
    if (!analysis || isRerunning) return;

    setIsRerunning(true);
    setActionError('');

    try {
      const created = await createAnalysis(
        block.blockId,
        {
          referenceFileVersionIds: idsOf(analysis, 'REFERENCE'),
          targetFileVersionIds: idsOf(analysis, 'TARGET'),
          reviewType: analysis.reviewType ?? '',
          reviewCategoryCodes: analysis.reviewCategoryCodes,
          prompt: analysis.prompt ?? '',
        },
        newIdempotencyKey(),
      );
      setJustRequested(true);
      setAnalysisId(created.analysisId);
    } catch (caught) {
      setActionError(messageOf(caught, '재실행하지 못했습니다.'));
    } finally {
      setIsRerunning(false);
    }
  }

  const label = block.title || '비타메이트 검토';
  /** 레거시 분석은 유형이 없다 — 재실행하면 400 이 나므로 수정 화면으로 보낸다 */
  const canRerun = Boolean(analysis?.reviewType && analysis.prompt);

  return (
    <BlockCard
      block={block}
      headerExtra={
        analysis ? <StatusBadge status={analysis.analysisStatus} /> : undefined
      }
    >
      <div
        onPointerEnter={preloadAnalysisPanels}
        onFocusCapture={preloadAnalysisPanels}
        className="flex flex-col gap-2.5"
      >
        {analysisId === null ? (
          isResolving ? (
            <div
              aria-hidden
              className="h-16 animate-pulse rounded-button-sm bg-bg-hover"
            />
          ) : resolveError ? (
            // "분석 없음" 으로 보여주면 중복 실행을 부른다
            <FailureNotice
              message={resolveError}
              onRetry={() => {
                setIsResolving(true);
                setResolveError('');
                setResolveCount((count) => count + 1);
              }}
            />
          ) : (
            <EmptyState onRun={() => setIsRunModalOpen(true)} />
          )
        ) : !analysis ? (
          /*
           * 조회가 실패했는데 진행 중 스피너를 계속 돌리면 실패를 놓친다.
           * 폴링은 뒤에서 계속 재시도하므로 재시도 버튼은 두지 않는다.
           */
          loadError ? (
            <FailureNotice message={loadError} />
          ) : (
            <RunningState requestedAt={null} isSlow={false} />
          )
        ) : (
          <>
            <RequestSummary analysis={analysis} />

            {isRunning(analysis.analysisStatus) ? (
              <RunningState requestedAt={analysis.createdAt} isSlow={isSlow} />
            ) : analysis.analysisStatus === 'FAILED' ? (
              <p className="rounded-button-sm border border-red-border bg-red-bg-soft px-2.5 py-2 text-caption leading-relaxed break-keep text-text-danger">
                {analysis.errorMessage ?? '분석에 실패했습니다.'}
              </p>
            ) : analysis.result ? (
              <AnalysisResultView
                result={analysis.result}
                documents={analysis.documents}
                citations={analysis.citations}
              />
            ) : (
              <p className="text-caption text-text-secondary">
                결과가 비어 있습니다.
              </p>
            )}

            {analysis.completedAt && (
              <p className="text-[9px] text-text-secondary">
                {formatDateTime(analysis.completedAt)} 완료
              </p>
            )}
          </>
        )}

        {/* 결과를 이미 보여주는 중이라면 안내만 얹는다 (위에서 이미 그렸으면 생략) */}
        {loadError && analysis && (
          <p className="text-caption text-yellow-text">{loadError}</p>
        )}
        {actionError && (
          <p role="alert" className="text-caption text-text-danger">
            {actionError}
          </p>
        )}

        {/* 진행 중에는 버튼을 감춘다 — 끝나기 전에 또 던지게 만들지 않는다 */}
        {analysis && !isRunning(analysis.analysisStatus) && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={rerun}
              disabled={!canRerun || isRerunning}
              title={
                canRerun
                  ? '같은 설정으로 다시 분석한다'
                  : '검토 유형 또는 프롬프트가 없는 이전 분석이라 수정 후 실행해야 한다'
              }
              className="cursor-pointer rounded-button-md bg-[#4F39F6] px-2.5 py-1 text-caption font-semibold text-text-white hover:bg-[#4429E0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRerunning ? '요청 중…' : '재실행'}
            </button>
            <button
              type="button"
              onClick={() => setIsRunModalOpen(true)}
              className="flex-1 cursor-pointer rounded-button-md border border-[#4F39F6]/30 py-1 text-caption font-medium text-[#4F39F6] hover:bg-blue-bg-soft"
            >
              수정하기
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="cursor-pointer rounded-button-md border border-border-default px-2.5 py-1 text-caption font-medium text-text-secondary hover:bg-bg-hover"
            >
              이력
            </button>
          </div>
        )}
      </div>

      {isRunModalOpen && (
        <AnalysisRunModal
          blockId={block.blockId}
          projectId={projectId}
          previous={analysis}
          onRequested={(created) => {
            setIsRunModalOpen(false);
            setActionError('');
            setJustRequested(true);
            setAnalysisId(created);
          }}
          onClose={() => setIsRunModalOpen(false)}
        />
      )}
      {isHistoryOpen && (
        <AnalysisHistoryPanel
          blockId={block.blockId}
          blockTitle={label}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </BlockCard>
  );
}

function idsOf(analysis: Analysis, role: 'REFERENCE' | 'TARGET') {
  return analysis.documents
    .filter((document) => document.documentRole === role)
    .map((document) => document.fileVersionId);
}

/** 이 결과가 **무엇을 기준으로 무엇을 봤는지** — 결과보다 먼저 읽혀야 한다 */
function RequestSummary({ analysis }: { analysis: Analysis }) {
  const references = analysis.documents.filter(
    (document) => document.documentRole === 'REFERENCE',
  );
  const targets = analysis.documents.filter(
    (document) => document.documentRole === 'TARGET',
  );

  return (
    <div className="flex flex-col gap-1.5">
      {analysis.reviewCategoryCodes.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {analysis.reviewCategoryCodes.map((code) => (
            <li
              key={code}
              className="rounded-button-sm bg-blue-bg-soft px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#4F39F6]"
            >
              {code}
            </li>
          ))}
        </ul>
      )}

      {references.length > 0 && (
        <RoleRow label={ROLE_LABEL.REFERENCE} documents={references} />
      )}
      {targets.length > 0 && (
        <RoleRow label={ROLE_LABEL.TARGET} documents={targets} />
      )}

      {analysis.prompt && (
        <blockquote className="rounded-button-sm bg-bg-surface px-2.5 py-1.5 text-caption leading-relaxed break-keep text-text-secondary">
          {analysis.prompt}
        </blockquote>
      )}
    </div>
  );
}

function RoleRow({
  label,
  documents,
}: {
  label: string;
  documents: {
    fileVersionId: number;
    fileName: string;
    versionNo: number | null;
  }[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0 text-[9px] font-semibold tracking-wider text-text-secondary uppercase">
        {label}
      </span>
      <ul className="flex min-w-0 flex-wrap gap-1">
        {documents.map((document) => (
          <li
            key={document.fileVersionId}
            className="max-w-full truncate rounded-button-sm border border-border-default bg-bg-card px-1.5 py-0.5 text-caption text-text-primary"
          >
            {document.fileName}
            {document.versionNo !== null && ` v${document.versionNo}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 조회 실패 안내.
 *
 * "분석 없음"·"진행 중" 과 **눈에 띄게 달라야** 한다 — 같은 모양이면 사용자가
 * 실패를 정상 상태로 오해하고, 이미 있는 분석을 또 실행하게 된다.
 */
function FailureNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-button-sm border border-red-border bg-red-bg-soft px-2.5 py-3"
    >
      <p className="text-center text-caption break-keep text-text-danger">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-button-md border border-red-border bg-bg-card px-2.5 py-1 text-caption font-medium text-text-danger hover:bg-red-bg-soft"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

function EmptyState({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <p className="text-center text-caption break-keep text-text-secondary">
        기준 문서와 검토 대상 문서를 골라 비타메이트 검토를 실행하세요.
      </p>
      <button
        type="button"
        onClick={onRun}
        className="cursor-pointer rounded-button-md bg-[#4F39F6] px-3 py-1.5 text-caption font-semibold text-text-white hover:bg-[#4429E0]"
      >
        ✦ 검토 실행하기
      </button>
    </div>
  );
}

/**
 * 진행 중 안내.
 *
 * 결과가 비어 있는 상태를 오류로 오해하지 않게 한다 — 실측 평균 20~30초라
 * 아무 표시도 없으면 멈춘 것처럼 보인다. 2분을 넘기면 문구를 바꾼다.
 */
function RunningState({
  requestedAt,
  isSlow,
}: {
  requestedAt: string | null;
  isSlow: boolean;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-1.5 rounded-button-sm border border-purple-border bg-blue-bg-soft py-4"
    >
      <span
        aria-hidden
        className="size-4 animate-spin rounded-pill border-2 border-purple-border border-t-[#4F39F6]"
      />
      <p className="text-caption font-medium text-[#4F39F6]">
        {isSlow ? '예상보다 지연되고 있습니다…' : '문서를 검토하고 있어요…'}
      </p>
      {/* 보통 20~30초 걸린다 — 대략의 눈금이 있어야 멈춘 게 아니라는 게 보인다 */}
      <p className="text-[9px] text-text-secondary">
        {isSlow
          ? '창을 닫아도 분석은 계속돼요'
          : '보통 20~30초 걸려요 · 창을 닫아도 계속돼요'}
      </p>
      {requestedAt && (
        <p className="text-[9px] text-text-secondary">
          {formatDateTime(requestedAt)} 요청
        </p>
      )}
    </div>
  );
}
