'use client';

import { useEffect, useRef, useState } from 'react';

import { ApiError, messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

import {
  confirmSummary,
  getNoticeSummaries,
  getSummary,
  requestSummary,
  updateSummary,
} from './api';
import { BIDDING_CODES } from './errorCodes';
import { AlertBanner } from './FormFields';
import type { BidSummary, SummarySections } from './types';

/**
 * 폴링 주기. 요약은 Gemini 왕복이라 수집(2초)보다 오래 걸린다.
 * 너무 잦으면 결과도 없이 요청만 쌓여 3초로 둔다.
 */
const POLL_MS = 3000;

/**
 * 폴링 상한. 넘기면 **손을 놓되 실패로 보지 않는다** —
 * 요약은 서버에 남아 있어 화면을 다시 열면 이력에서 이어 볼 수 있다
 * (수집 실행과 다른 점이다. 그쪽은 이력 API 가 없어 `runId` 를 잃으면 끝이다).
 */
const MAX_POLLS = 60;

/** 처리 중인지 — 끝난 상태(`COMPLETED` · `FAILED`)와 가른다 */
function isRunning(status: string) {
  return status === 'PENDING' || status === 'PROCESSING';
}

/** 화면에 그릴 여섯 칸. 순서가 곧 읽는 순서다 */
const SECTIONS: { key: keyof SummarySections; label: string }[] = [
  { key: 'overviewSummary', label: '개요' },
  { key: 'amountSummary', label: '금액' },
  { key: 'scheduleSummary', label: '일정' },
  { key: 'qualificationSummary', label: '참가 자격' },
  { key: 'taskSummary', label: '과업' },
  { key: 'riskSummary', label: '수행 위험' },
];

const PROMPT_PLACEHOLDER =
  '예) 공고의 금액, 일정, 참가 자격과 수행 위험을 실무 검토용으로 정리해줘';

/**
 * 공고 AI 요약. (BID-V1 · `.ai/API.md` 입찰 AI 요약)
 *
 * **프롬프트를 사람이 직접 쓴다** — 무엇을 물었는지가 결과를 좌우해서 결과와 함께 남긴다.
 *
 * 흐름은 비동기다. 요청하면 `202` 로 `summaryId` 만 오고, `COMPLETED` · `FAILED` 가
 * 될 때까지 폴링한다. 완료되면 여섯 칸을 고칠 수 있고, 확정하면 잠긴다.
 *
 * ⚠️ **Python Worker 가 꺼져 있으면 `PENDING` 에서 멈춘다** — 장애가 아니라 미기동이다.
 *    상한을 넘기면 "아직 처리 중" 으로 안내하고 폴링만 접는다.
 */
export default function NoticeSummaryCard({
  noticeId,
  isBare = false,
}: {
  noticeId: number;
  /**
   * 테두리 · 배경 · 여백을 빼고 **알맹이만** 그린다.
   *
   * 모달처럼 **이미 카드인 자리**에 넣을 때 쓴다 — 그대로 넣으면 테두리가 두 겹으로
   * 겹치고 여백이 두 번 잡혀 안쪽이 좁아진다.
   */
  isBare?: boolean;
}) {
  const [summary, setSummary] = useState<BidSummary | null>(null);
  /** 이력을 아직 못 받았으면 `null` — 요청 칸을 성급히 열지 않는다 */
  const [isLoaded, setIsLoaded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  /** 실패가 아닌 알림 (폴링 상한 · 이미 진행 중 등) */
  const [notice, setNotice] = useState('');
  /**
   * 폴링을 접었는지.
   *
   * ⚠️ 이게 없으면 **막다른 길이 된다** — Worker 가 꺼져 있어 `PENDING` 이 영영 안 바뀌면
   *    상태만 보고 입력칸을 감추던 화면이 다시 물어볼 방법을 주지 않는다.
   *    포기한 뒤에는 상태와 무관하게 다시 요청할 수 있어야 한다.
   */
  const [hasGivenUp, setHasGivenUp] = useState(false);
  /** 편집 중인 여섯 칸. `null` 이면 보기 모드 */
  const [draft, setDraft] = useState<SummarySections | null>(null);

  /**
   * 폴링 뒷정리 — 타이머와 **이미 나간 요청**을 함께 끊는다.
   * 타이머만 끊으면 응답이 돌아와 사라진 컴포넌트에 `setState` 한다.
   */
  const timer = useRef<number | null>(null);
  const pollAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    pollAbort.current = controller;

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      controller.abort();
    };
  }, []);

  /** 처음 열 때 내 마지막 요약을 이어서 보여준다 */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getNoticeSummaries(noticeId, signal)
      .then(async (history) => {
        const latest =
          history.latestMySummaryId ?? history.content[0]?.summaryId ?? null;

        if (latest === null) return;

        const found = await getSummary(latest, signal);
        setSummary(found);
        // 진행 중이던 요약이면 이어서 지켜본다
        if (isRunning(found.summaryStatus)) poll(found.summaryId, 0);
      })
      .catch(() => {
        // 이력이 없거나 못 받아도 요청은 할 수 있다 — 화면을 막지 않는다
      })
      .finally(() => {
        if (!signal.aborted) setIsLoaded(true);
      });

    return () => controller.abort();
    // 폴링 함수는 ref 만 읽어 매 렌더 새로 만들어도 안전하다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId]);

  /** `COMPLETED` · `FAILED` 가 될 때까지 물어본다 */
  function poll(summaryId: number, attempt: number) {
    /**
     * ⚠️ 새 체인을 걸기 전에 **앞 체인을 끊는다.** 타이머 슬롯이 하나뿐이라
     *    덮어쓰면 이전 타이머의 참조를 잃고, 정리 함수가 마지막 것만 해제한다.
     */
    if (timer.current !== null) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      try {
        const next = await getSummary(summaryId, pollAbort.current?.signal);
        setSummary(next);

        if (!isRunning(next.summaryStatus)) {
          setIsBusy(false);
          return;
        }

        if (attempt >= MAX_POLLS) {
          setIsBusy(false);
          setHasGivenUp(true);
          setNotice(
            '아직 결과가 오지 않았습니다. 새로고침하면 이어서 확인할 수 있습니다.',
          );
          return;
        }

        poll(summaryId, attempt + 1);
      } catch (caught) {
        // 언마운트로 인한 취소는 실패가 아니다 (알릴 화면도 이미 없다)
        if (pollAbort.current?.signal.aborted) return;

        setIsBusy(false);
        setHasGivenUp(true);
        setNotice(messageOf(caught, '요약 결과를 가져오지 못했습니다.'));
      }
    }, POLL_MS);
  }

  /** `baseSummaryId` 를 주면 지금 요약을 딛고 다시 묻는다 (차수가 오른다) */
  async function ask(baseSummaryId?: number) {
    if (isBusy || prompt.trim() === '') return;

    setIsBusy(true);
    setError('');
    setNotice('');
    setDraft(null);

    try {
      const accepted = await requestSummary(noticeId, {
        prompt: prompt.trim(),
        baseSummaryId,
      });

      // 아직 본문이 없다 — 상태만 있는 껍데기로 바꿔 두고 폴링이 채운다
      setSummary({
        ...EMPTY_SECTIONS,
        summaryId: accepted.summaryId,
        noticeId,
        parentSummaryId: baseSummaryId ?? null,
        revisionNo: (summary?.revisionNo ?? 0) + 1,
        prompt: prompt.trim(),
        summaryStatus: accepted.summaryStatus,
        confirmed: false,
        confirmedBy: null,
        confirmedAt: null,
        projectId: null,
        errorMessage: null,
        requestedAt: accepted.requestedAt,
        completedAt: null,
        updatedAt: null,
      });
      setPrompt('');

      /**
       * 기다리기 잠금은 **받아들여진 뒤에** 다시 건다.
       * 요청 직전에 풀면 `409` 로 막혔을 때도 잠긴 채 남아 손이 다시 묶인다.
       */
      setHasGivenUp(false);
      poll(accepted.summaryId, 0);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      /*
        이미 돌고 있는 요약이 있다는 뜻이라 실패가 아니다 —
        새로 요청하는 대신 그 요약을 이어서 지켜보게 안내한다.
      */
      if (code === BIDDING_CODES.summaryAlreadyProcessing) {
        setNotice('이미 요약이 진행 중입니다.');
      } else {
        setError(messageOf(caught, '요약을 요청하지 못했습니다.'));
      }
      setIsBusy(false);
    }
  }

  async function save() {
    if (!summary || !draft || isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      setSummary(await updateSummary(summary.summaryId, draft));
      setDraft(null);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 그 사이 확정됐거나 상태가 바뀐 경우 — 무엇이 막았는지 알려준다
      setError(
        code === BIDDING_CODES.summaryNotEditable
          ? '확정됐거나 완료되지 않아 수정할 수 없습니다.'
          : messageOf(caught, '요약을 저장하지 못했습니다.'),
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function confirm() {
    if (!summary || isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      const result = await confirmSummary(summary.summaryId);
      setSummary({
        ...summary,
        confirmed: result.confirmed,
        confirmedBy: result.confirmedBy,
        confirmedAt: result.confirmedAt,
      });
      setDraft(null);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      setError(
        code === BIDDING_CODES.summaryAlreadyConfirmed
          ? '이미 확정된 요약입니다.'
          : messageOf(caught, '요약을 확정하지 못했습니다.'),
      );
    } finally {
      setIsBusy(false);
    }
  }

  const status = summary?.summaryStatus;
  /** 폴링을 접었으면 상태가 `PENDING` 이어도 기다리는 화면으로 두지 않는다 */
  const isWaiting = status !== undefined && isRunning(status) && !hasGivenUp;
  const isDone = status === 'COMPLETED';
  const isFailed = status === 'FAILED';
  /** 확정 전 완료 상태에서만 고치고 확정할 수 있다 */
  const canEdit = isDone && summary !== null && !summary.confirmed;

  /**
   * 딛고 갈 요약. **완료된 것만** 딛는다 (`isDone`).
   *
   * ⚠️ 실패한 요약을 `baseSummaryId` 로 보내면 서버가
   *    `수정할 수 없는 입찰 공고 AI 요약입니다` 로 거절한다 — 실패했으니 이어붙일
   *    내용 자체가 없다. 그때는 **새로 시작**해야 한다.
   */
  const baseSummaryId = isDone && summary ? summary.summaryId : undefined;

  /**
   * 이력을 받기 전에는 **자리만 잡아 둔다.**
   *
   * 빈 화면을 그렸다가 응답이 오는 순간 제목·요청칸·결과가 한꺼번에 튀어나오면
   * 창이 딸깍거린다 — 틀은 이미 떠 있으니 안쪽 높이를 미리 잡아 두면 조용하다.
   */
  if (!isLoaded) {
    return (
      <section
        className={
          isBare
            ? ''
            : 'rounded-base border border-border-default bg-bg-card p-5'
        }
      >
        <SummarySkeleton />
      </section>
    );
  }

  return (
    <section
      className={
        isBare ? '' : 'rounded-base border border-border-default bg-bg-card p-5'
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* 모달로 열면 창 제목이 이미 `AI 요약` 이라 여기 제목은 겹친다 */}
        {!isBare && (
          <h3 className="text-label font-bold text-text-primary">AI 요약</h3>
        )}
        {summary && summary.revisionNo > 0 && (
          <span className="rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
            {summary.revisionNo}차
          </span>
        )}
        {summary?.confirmed && (
          <span className="rounded-pill bg-green-bg px-2 py-0.5 text-caption font-semibold text-green-text">
            확정됨
          </span>
        )}
      </div>

      {/* 무엇을 물었는지 결과와 함께 남긴다 — 프롬프트가 결과를 좌우한다 */}
      {summary?.prompt && (
        <p className="mt-3 rounded-lg bg-bg-hover px-4 py-3 text-caption leading-relaxed break-keep text-text-secondary">
          <span className="font-semibold text-text-primary">요청</span>{' '}
          {summary.prompt}
        </p>
      )}

      {isFailed && (
        <AlertBanner tone="danger" className="mt-3">
          {summary?.errorMessage || '요약에 실패했습니다. 다시 요청해주세요.'}
        </AlertBanner>
      )}

      {isDone && summary && (
        <dl className="mt-5 flex flex-col gap-5">
          {SECTIONS.map(({ key, label }) => (
            <div key={key}>
              <dt className="text-caption font-semibold text-text-primary">
                {label}
              </dt>
              <dd className="mt-1.5">
                {draft ? (
                  <textarea
                    value={draft[key] ?? ''}
                    onChange={(event) =>
                      setDraft({ ...draft, [key]: event.target.value })
                    }
                    rows={3}
                    aria-label={label}
                    className="w-full resize-y rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-caption text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
                  />
                ) : (
                  <p className="text-caption leading-relaxed break-keep whitespace-pre-wrap text-text-secondary">
                    {summary[key] || '—'}
                  </p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {summary?.confirmedAt && (
        <p className="mt-3 text-caption text-text-secondary">
          {formatDateTime(summary.confirmedAt)} 확정
          {summary.confirmedBy && ` · ${summary.confirmedBy}`}
        </p>
      )}

      {/* 동작 버튼은 오른쪽 끝에 — 읽고 내려온 시선이 마지막에 닿는 자리다 */}
      {canEdit && (
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {draft ? (
            <>
              <button
                type="button"
                onClick={save}
                disabled={isBusy}
                className="btn btn-sm btn-primary"
              >
                {isBusy ? '저장 중…' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={isBusy}
                className="btn btn-sm btn-gray-outlined"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setDraft(toSections(summary))}
                className="btn btn-sm btn-gray-outlined"
              >
                수정
              </button>
              {/* 확정하면 되돌릴 수 없다 — 수정 다음에 두어 순서를 자연스럽게 만든다 */}
              <button
                type="button"
                onClick={confirm}
                disabled={isBusy}
                className="btn btn-sm btn-primary"
              >
                {isBusy ? '확정 중…' : '확정'}
              </button>
            </>
          )}
        </div>
      )}

      {notice && (
        <AlertBanner tone="warning" className="mt-3">
          {notice}
        </AlertBanner>
      )}
      {error && (
        <AlertBanner tone="danger" className="mt-3">
          {error}
        </AlertBanner>
      )}

      {/**
       * 확정된 요약은 더 못 고친다 — 다시 물으려면 새 차수를 만든다.
       *
       * ⭐ **요약 중에도 접지 않는다.** 입력칸이 통째로 사라지면 카드가 쪼그라들고,
       *    무엇을 물어놓고 기다리는지도 알 수 없다. 잠그기만 하고 자리는 지킨다.
       * ℹ️ 버튼은 배너보다 **아래**다 — 알림이 뜰 때마다 눌러야 할 것이 밀리면 안 된다.
       */}
      {!draft && (
        <div className="mt-6 border-t border-border-default pt-5">
          <label
            htmlFor="summaryPrompt"
            className="text-caption font-semibold text-text-primary"
          >
            {baseSummaryId ? '다시 요약' : '요약 요청'}
          </label>
          <textarea
            id="summaryPrompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={2}
            disabled={isWaiting}
            placeholder={PROMPT_PLACEHOLDER}
            className="mt-2 w-full resize-y rounded-lg border border-border-default bg-bg-surface px-3.5 py-2.5 text-caption leading-relaxed text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:opacity-60"
          />
          {baseSummaryId && !isWaiting && (
            <p className="mt-2 text-caption break-keep text-text-secondary">
              지금 요약을 기준으로 새 차수를 만듭니다. 이전 차수는 이력으로
              남습니다.
            </p>
          )}

          {/* 상태 문장은 버튼과 **다른 줄**에 둔다 — 같은 줄에 두면 밀려서 잘린다 */}
          {isWaiting && (
            <p
              aria-live="polite"
              className="mt-3 flex items-start gap-2 text-caption leading-relaxed break-keep text-text-secondary"
            >
              <span
                aria-hidden
                className="mt-1 size-3 shrink-0 animate-pulse rounded-pill bg-btn-primary"
              />
              공고를 분석하는 중입니다.
            </p>
          )}

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {/**
             * ⚠️ 요약에는 **검토의 `abandon` 같은 취소 API 가 없다.**
             *    서버 작업은 계속 도니 "취소" 라고 쓰지 않는다 — 화면 잠금만 푼다.
             *    그 사이 새로 요청하면 `409` 로 막힐 수 있고, 그건 아래 `ask()` 가 받는다.
             */}
            {isWaiting && (
              <button
                type="button"
                onClick={() => {
                  /**
                   * ⚠️ `isBusy` 까지 함께 푼다 — `hasGivenUp` 만 세우면 요청 버튼이
                   *    `disabled={isBusy || …}` 에 걸려 멈춘 뒤에도 아무것도 못 한다.
                   * ⚠️ 예약된 폴링도 끊는다 — 안 그러면 멈춘 뒤에도 요청이 계속 나간다.
                   */
                  if (timer.current !== null) {
                    window.clearTimeout(timer.current);
                    timer.current = null;
                  }
                  setHasGivenUp(true);
                  setIsBusy(false);
                  setNotice(
                    '대기를 멈췄습니다. 진행 중인 요약이 끝나면 결과가 표시됩니다.',
                  );
                }}
                className="btn btn-sm btn-gray-outlined"
              >
                멈추기
              </button>
            )}
            <button
              type="button"
              onClick={() => ask(baseSummaryId)}
              disabled={isBusy || isWaiting || prompt.trim() === ''}
              className="btn btn-sm btn-primary"
            >
              {isWaiting
                ? '요약 중…'
                : isBusy
                  ? '요청 중…'
                  : baseSummaryId
                    ? '이어서 요약'
                    : '요약하기'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * 이력을 기다리는 동안의 자리막이.
 *
 * 실제로 그려질 것과 **비슷한 높이**로 둔다 — 너무 짧으면 내용이 들어올 때
 * 창이 튀어 오르고, 너무 길면 반대로 꺼진다.
 */
function SummarySkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-4 w-24 rounded-button-sm bg-bg-hover" />
      <div className="mt-4 h-16 rounded-lg bg-bg-hover" />
      <div className="mt-6 flex flex-col gap-4">
        {[0, 1, 2].map((row) => (
          <div key={row}>
            <div className="h-3 w-16 rounded-button-sm bg-bg-hover" />
            <div className="mt-2 h-3 rounded-button-sm bg-bg-hover" />
            <div className="mt-1.5 h-3 w-4/5 rounded-button-sm bg-bg-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 편집 시작값 — 응답에서 여섯 칸만 떼어낸다 */
function toSections(summary: BidSummary): SummarySections {
  return {
    overviewSummary: summary.overviewSummary,
    amountSummary: summary.amountSummary,
    scheduleSummary: summary.scheduleSummary,
    qualificationSummary: summary.qualificationSummary,
    taskSummary: summary.taskSummary,
    riskSummary: summary.riskSummary,
  };
}

/** 요청 직후의 빈 껍데기 — 폴링이 채운다 */
const EMPTY_SECTIONS: SummarySections = {
  overviewSummary: null,
  amountSummary: null,
  scheduleSummary: null,
  qualificationSummary: null,
  taskSummary: null,
  riskSummary: null,
};
