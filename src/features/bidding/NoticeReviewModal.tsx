'use client';

import { useEffect, useRef, useState } from 'react';

import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/Spinner';
import { getSelectableDocuments } from '@/features/companyDocument/api';
import type { SelectableDocument } from '@/features/companyDocument/types';
import { ApiError, messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

import {
  abandonReview,
  getNoticeReviews,
  getReview,
  getReviewSources,
  requestReview,
} from './api';
import { BIDDING_CODES } from './errorCodes';
import { AlertBanner } from './FormFields';
import type { BidReview, ReviewAttachment, ReviewDocument } from './types';

/** 검토는 문서를 내려받아 읽어서 요약보다 오래 걸린다 */
const POLL_MS = 4000;

/** 상한을 넘기면 폴링만 접는다 — 검토는 서버에 남아 이력에서 이어 볼 수 있다 */
const MAX_POLLS = 75;

function isRunning(status: string) {
  return status === 'PENDING' || status === 'PROCESSING';
}

const PROMPT_PLACEHOLDER =
  '예) 우리 회사의 재정 상태와 보유 인력으로 수행 가능한지, 부족한 자격과 실적을 근거와 함께 검토';

/**
 * AI 문서 검토. (BID-V1 · `.ai/API.md` 입찰 문서 검토)
 *
 * 요약과 **다른 기능**이다 — 공고 첨부와 사내 문서를 골라 비교하고, 결과에 **분석 자료(인용)** 가 붙는다.
 * 서버 쪽 워커도 갈린다 (`bid_review_worker`).
 *
 * ⚠️ 고른 파일은 검토를 위해 **임시 저장소에 올라간다.** 프로젝트로 전환하지 않으면
 *    `expiresAt` 에 자동 삭제되므로 그 사실을 요청 전에 알린다.
 */
export default function NoticeReviewModal({
  noticeId,
  isConverted,
  onClose,
  onConvert,
}: {
  noticeId: number;
  /** 이미 프로젝트로 전환된 공고면 전환 버튼을 두지 않는다 */
  isConverted: boolean;
  onClose: () => void;
  /** 이 검토를 근거로 프로젝트를 만든다 — 전환 모달은 상위가 연다 */
  onConvert: (reviewId: number) => void;
}) {
  const [attachments, setAttachments] = useState<ReviewAttachment[] | null>(
    null,
  );
  const [documents, setDocuments] = useState<SelectableDocument[] | null>(null);

  /** 고른 공고 첨부 (`attachmentId`) */
  const [pickedAttachments, setPickedAttachments] = useState<Set<number>>(
    new Set(),
  );
  /** 고른 사내 문서 — **버전 ID** 로 고정한다 */
  const [pickedDocuments, setPickedDocuments] = useState<Set<number>>(
    new Set(),
  );

  const [prompt, setPrompt] = useState('');
  const [review, setReview] = useState<BidReview | null>(null);
  /**
   * 처음 세 요청이 **모두** 끝났는지.
   *
   * ⚠️ 이게 없으면 창이 딸깍거린다 — 고르는 칸을 먼저 그렸다가 뒤늦게 도착한
   *    이력이 완료 상태면 그 자리를 결과가 통째로 갈아치운다.
   */
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  /**
   * 종료 요청이 나가 있는지.
   *
   * `isBusy` 만으로는 **무엇 때문에 바쁜지** 구분되지 않아, 요청 버튼과 종료 버튼이
   * 동시에 진행 문구를 띄운다 (`검토 중…` 옆에 `종료 중…`).
   */
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [hasGivenUp, setHasGivenUp] = useState(false);
  /**
   * 결과를 덮고 **다시 고르는 중**인지.
   *
   * ⚠️ 이게 없으면 검토를 한 번 마친 공고는 **다시 검토할 수 없다** — 완료 상태에서는
   *    고르는 자리와 요청 버튼이 함께 사라지고, 창을 닫았다 열어도 같은 이력이 다시 온다.
   */
  const [wantsNew, setWantsNew] = useState(false);

  const timer = useRef<number | null>(null);
  const pollAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    pollAbort.current = new AbortController();

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      // 처음 것이 아니라 **지금 것**을 끊는다 (`abandon()` 이 갈아끼울 수 있다)
      pollAbort.current?.abort();
    };
  }, []);

  /** 고를 거리와 지난 검토를 함께 받는다 */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // 도착하는 대로 하나씩 그리지 않고 **함께** 기다린다 (위 `isLoaded` 참고)
    Promise.all([
      getReviewSources(noticeId, signal)
        .then((sources) => setAttachments(sources.attachments))
        .catch(() => {
          if (!signal.aborted) setAttachments([]);
        }),

      // 사내 문서는 없어도 검토는 된다 — 실패해도 화면을 막지 않는다
      getSelectableDocuments({}, signal)
        .then(setDocuments)
        .catch(() => {
          if (!signal.aborted) setDocuments([]);
        }),

      getNoticeReviews(noticeId, signal)
        .then(async (history) => {
          const latest = history[0];
          if (!latest) return;

          const found = await getReview(latest.reviewId, signal);
          setReview(found);

          /**
           * 무엇을 걸고 돌리는 중인지 **체크 상태로 되살린다.**
           *
           * ⚠️ 이게 없으면 창을 다시 열었을 때 고른 게 하나도 없는 것처럼 보이고,
           *    잠금을 풀어도 `pickedCount === 0` 이라 요청 버튼이 켜지지 않는다.
           */
          setPickedAttachments(pickedIds(found.documents, 'bidAttachmentId'));
          setPickedDocuments(
            pickedIds(found.documents, 'companyDocumentVersionId'),
          );
          setPrompt(found.prompt ?? '');

          if (isRunning(found.reviewStatus)) poll(found.reviewId, 0);
        })
        .catch(() => {
          // 이력이 없어도 새로 요청할 수 있다
        }),
    ]).finally(() => {
      if (!signal.aborted) setIsLoaded(true);
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId]);

  function poll(reviewId: number, attempt: number) {
    /**
     * ⚠️ 새 체인을 걸기 전에 **앞 체인을 끊는다.** 타이머 슬롯이 하나뿐이라
     *    덮어쓰면 이전 타이머의 참조를 잃고, 정리 함수가 마지막 것만 해제한다.
     */
    if (timer.current !== null) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      try {
        const next = await getReview(reviewId, pollAbort.current?.signal);
        setReview(next);

        if (!isRunning(next.reviewStatus)) {
          setIsBusy(false);
          return;
        }

        if (attempt >= MAX_POLLS) {
          setIsBusy(false);
          setHasGivenUp(true);
          setNotice(
            '아직 검토 중입니다. 창을 다시 열면 이어서 확인할 수 있습니다.',
          );
          return;
        }

        poll(reviewId, attempt + 1);
      } catch (caught) {
        if (pollAbort.current?.signal.aborted) return;

        setIsBusy(false);
        setHasGivenUp(true);
        setNotice(messageOf(caught, '검토 결과를 가져오지 못했습니다.'));
      }
    }, POLL_MS);
  }

  function toggle(set: Set<number>, id: number) {
    const next = new Set(set);
    if (!next.delete(id)) next.add(id);
    return next;
  }

  const pickedCount = pickedAttachments.size + pickedDocuments.size;
  const canRequest = pickedCount > 0 && prompt.trim() !== '' && !isBusy;

  async function ask() {
    if (!canRequest) return;

    setIsBusy(true);
    setError('');
    setNotice('');

    try {
      const accepted = await requestReview(noticeId, {
        bidAttachmentIds: [...pickedAttachments],
        companyDocumentVersionIds: [...pickedDocuments],
        prompt: prompt.trim(),
      });

      setReview({
        reviewId: accepted.reviewId,
        noticeId,
        prompt: prompt.trim(),
        reviewStatus: accepted.reviewStatus,
        result: null,
        errorMessage: null,
        requestedAt: accepted.requestedAt,
        completedAt: null,
        expiresAt: null,
        projectId: null,
        documents: [],
        citations: [],
      });

      /**
       * 기다리기 잠금은 **받아들여진 뒤에** 다시 건다.
       *
       * ⚠️ 요청 직전에 풀어 버리면 서버가 `409` 로 막았을 때도 잠긴 채로 남는다 —
       *    "다시 고르기" 로 풀어 놓은 걸 거절이 되돌려, 손이 다시 묶인다.
       */
      setHasGivenUp(false);
      // 새 검토가 접수됐으니 결과 화면으로 되돌린다
      setWantsNew(false);
      poll(accepted.reviewId, 0);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (code === BIDDING_CODES.reviewAlreadyProcessing) {
        setNotice('이미 검토가 진행 중입니다.');
      } else if (code === BIDDING_CODES.reviewUnsupportedFile) {
        setError('읽을 수 없는 형식의 파일이 포함돼 있습니다.');
      } else if (code === BIDDING_CODES.reviewDocumentNotReady) {
        setError('문서가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError(messageOf(caught, '검토를 요청하지 못했습니다.'));
      }
      setIsBusy(false);
    }
  }

  /**
   * 진행 중인 검토를 **실제로 끝낸다.** (`PATCH .../abandon` → `ABANDONED`)
   *
   * 잠금만 푸는 것과 다르다 — 서버 작업이 정말 닫히고 임시 파일도 정리되어,
   * 곧바로 새 검토를 요청할 수 있다 (`409` 로 막히지 않는다).
   *
   * ⚠️ 서버가 끝낼 수 없는 상태라고 하면(`BIDDING_REVIEW_NOT_ABANDONABLE`)
   *    **화면 잠금만이라도 푼다** — 손이 묶인 채로 두는 것보단 낫다.
   */
  async function abandon() {
    if (!review || isBusy) return;

    setIsBusy(true);
    setIsAbandoning(true);
    setError('');
    setNotice('');

    try {
      const result = await abandonReview(review.reviewId);

      /*
        더 물어볼 게 없다 — 예약된 폴링과 **이미 나간 조회**를 함께 끊는다.
        타이머만 끊으면 날아가던 응답이 돌아와 `PROCESSING` 으로 되돌려 놓는다.
        다음 요청을 위해 새 컨트롤러로 갈아끼운다 (끊긴 걸 재사용하면 즉시 실패한다).
      */
      if (timer.current !== null) window.clearTimeout(timer.current);
      pollAbort.current?.abort();
      pollAbort.current = new AbortController();

      setReview({ ...review, reviewStatus: result.reviewStatus });
      setNotice('검토를 종료했습니다. 다시 요청할 수 있습니다.');
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      setHasGivenUp(true);
      setNotice(
        code === BIDDING_CODES.reviewNotAbandonable
          ? '지금은 종료할 수 없습니다. 결과를 기다려주세요.'
          : messageOf(caught, '검토를 종료하지 못했습니다.'),
      );
    } finally {
      setIsBusy(false);
      setIsAbandoning(false);
    }
  }

  const status = review?.reviewStatus;
  const isWaiting = status !== undefined && isRunning(status) && !hasGivenUp;
  const isDone = status === 'COMPLETED';
  const isFailed = status === 'FAILED';
  /**
   * 결과가 나오면 고르는 자리를 접는다 — 한 창에 둘 다 펼치면 길기만 하다.
   *
   * ⚠️ **검토 중에는 접지 않는다.** 고른 목록이 통째로 사라지고 안내 한 줄만 남으면
   *    창이 확 쪼그라들어, 무엇을 걸어 두고 기다리는지도 알 수 없다.
   *    대신 아래에서 입력만 잠그고 진행 상태를 버튼 자리에 띄운다.
   */
  const showsPicker = isLoaded && (!isDone || wantsNew);

  /**
   * 전환을 막는 이유. `null` 이면 지금 만들 수 있다.
   *
   * ⚠️ 막힌 경우에도 **버튼을 감추지 않고 비활성화**한다 — 버튼이 통째로 사라지면
   *    "왜 없지" 를 사용자가 혼자 추측해야 한다. 이유를 옆에 적어 두는 편이 낫다.
   * ℹ️ 툴팁(`title`)은 쓸 수 없다 — `.btn:disabled` 가 `pointer-events: none` 이라 뜨지 않는다.
   */
  const convertBlockedReason = isConverted
    ? '이미 프로젝트로 전환된 공고입니다.'
    : review?.projectId != null
      ? '이 검토는 이미 다른 프로젝트에 연결되어 있습니다.'
      : !isDone
        ? '검토가 완료되지 않아 프로젝트로 생성할 수 없습니다. 다시 검토해주세요.'
        : null;

  return (
    <Modal
      title="AI 검토"
      onClose={onClose}
      /**
       * 바깥을 눌러도 닫히지 않는다 — 파일을 고르고 프롬프트까지 쓴 상태에서
       * 한 번 잘못 누르면 처음부터 다시다. 닫기 버튼 · Esc 는 그대로 살아 있다.
       */
      dismissOnBackdrop={false}
      className="flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
      header={
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border-default px-6 py-4">
          <h2 className="text-body-m font-bold text-text-primary">AI 검토</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="cursor-pointer rounded-button-sm px-1 text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>
      }
    >
      {/* 아래 여백을 더 준다 — 마지막 버튼 줄이 창 끝에 붙어 잘려 보인다 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-8">
        {!isLoaded && (
          <LoadingSpinner label="검토 정보 불러오는 중" className="py-20" />
        )}

        {showsPicker && (
          <>
            <PickSection
              title="공고 첨부파일"
              emptyText="첨부가 없습니다."
              isLoading={attachments === null}
            >
              {attachments?.map((item) => (
                <PickRow
                  key={item.attachmentId}
                  label={item.fileName}
                  // AI 가 못 읽는 형식은 고를 수 없다 (보내면 422)
                  disabled={!item.supported || isWaiting}
                  disabledReason={
                    item.supported ? undefined : '지원하지 않는 형식'
                  }
                  isPicked={pickedAttachments.has(item.attachmentId)}
                  onToggle={() =>
                    setPickedAttachments((prev) =>
                      toggle(prev, item.attachmentId),
                    )
                  }
                />
              ))}
            </PickSection>

            <PickSection
              title="사내 문서 비교"
              emptyText="선택할 사내 문서가 없습니다."
              isLoading={documents === null}
              className="mt-5"
            >
              {documents?.map((item) => (
                <PickRow
                  key={item.companyDocumentVersionId}
                  label={item.originalFileName}
                  disabled={isWaiting}
                  isPicked={pickedDocuments.has(item.companyDocumentVersionId)}
                  onToggle={() =>
                    setPickedDocuments((prev) =>
                      toggle(prev, item.companyDocumentVersionId),
                    )
                  }
                />
              ))}
            </PickSection>

            <div className="mt-5">
              <label
                htmlFor="reviewPrompt"
                className="text-caption font-semibold text-text-primary"
              >
                검토하고 싶은 포인트
              </label>
              <textarea
                id="reviewPrompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                disabled={isWaiting}
                placeholder={PROMPT_PLACEHOLDER}
                className="mt-2 w-full resize-y rounded-lg border border-border-default bg-bg-surface px-3.5 py-2.5 text-caption leading-relaxed text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:opacity-60"
              />
            </div>

            {/**
             * 요청 전에 알린다 — 누른 뒤에 알면 늦다.
             *
             * 색은 **파란 계열**이다. 아래 `AlertBanner` 가 노란색이라 같은 톤을 쓰면
             * 늘 떠 있는 설명과 그때그때 뜨는 알림이 한 덩어리로 보인다.
             */}
            <p className="mt-4 rounded-lg border border-blue-border-soft bg-blue-bg-soft px-4 py-3 text-caption leading-relaxed break-keep text-blue-text">
              선택한 파일은 검토를 위해 임시 저장소에 업로드됩니다. 프로젝트로
              생성하지 않으면 자동 삭제되며, 생성하면 해당 프로젝트에
              보존됩니다.
            </p>
          </>
        )}

        {isFailed && (
          <AlertBanner tone="danger">
            {review?.errorMessage || '검토에 실패했습니다. 다시 요청해주세요.'}
          </AlertBanner>
        )}

        {isDone && review && !wantsNew && <ReviewResult review={review} />}

        {/**
         * 검토를 마친 뒤의 두 갈래 — 프롬프트를 바꿔 다시 묻거나, 이 검토를 근거로
         * 프로젝트를 만들거나.
         *
         * ℹ️ **실패했을 때는 여기가 아니라 맨 아래 버튼 줄에** 잠긴 전환 버튼을 둔다 —
         *    실패하면 고르는 자리가 다시 펼쳐져(`showsPicker`) `AI 검토하기` 가 살아나는데,
         *    전환 버튼만 따로 위에 두면 눌러야 할 것이 두 군데로 흩어진다.
         */}
        {review && !wantsNew && isDone && (
          <div className="mt-6 border-t border-border-default pt-5">
            <p className="text-caption break-keep text-text-secondary">
              {convertBlockedReason ??
                '이 검토를 근거로 프로젝트를 만들면 검토에 쓰인 공고 첨부가 프로젝트 파일로 보존됩니다.'}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              {isDone && (
                <button
                  type="button"
                  onClick={() => setWantsNew(true)}
                  className="btn btn-sm btn-gray-outlined"
                >
                  다시 검토
                </button>
              )}
              <button
                type="button"
                onClick={() => onConvert(review.reviewId)}
                disabled={convertBlockedReason !== null}
                className="btn btn-sm btn-primary"
              >
                프로젝트 생성
              </button>
            </div>
          </div>
        )}

        {notice && (
          <AlertBanner tone="warning" className="mt-4">
            {notice}
          </AlertBanner>
        )}
        {error && (
          <AlertBanner tone="danger" className="mt-4">
            {error}
          </AlertBanner>
        )}

        {/**
         * 동작 버튼은 **언제나 맨 아래**다.
         *
         * 안내·에러 배너는 상황에 따라 늘었다 줄었다 하는데, 버튼을 그 위에 두면
         * 배너가 뜰 때마다 눌러야 할 것이 위로 밀려 자리를 다시 찾게 된다.
         *
         * ℹ️ 진행 상태 문장은 **버튼과 같은 줄에 두지 않는다** — 길어서 버튼에 밀려 잘린다.
         */}
        {showsPicker && (
          <div className="mt-5">
            {isWaiting && (
              <p
                aria-live="polite"
                className="flex items-start gap-2 text-caption leading-relaxed break-keep text-text-secondary"
              >
                <span
                  aria-hidden
                  className="mt-1 size-3 shrink-0 animate-pulse rounded-pill bg-btn-primary"
                />
                {isAbandoning
                  ? '검토를 종료하는 중입니다.'
                  : '문서를 비교하는 중입니다. 몇 분 걸릴 수 있습니다.'}
              </p>
            )}

            {/* 막힌 이유는 버튼 줄 위에 적는다 — 같은 줄에 두면 문장이 버튼에 밀려 잘린다 */}
            {isFailed && review && convertBlockedReason !== null && (
              <p className="mt-3 text-caption leading-relaxed break-keep text-text-secondary">
                {convertBlockedReason}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
              {!isWaiting && pickedCount === 0 && (
                <span className="text-caption text-text-secondary">
                  문서를 하나 이상 선택해주세요
                </span>
              )}

              {isFailed && review && (
                <button
                  type="button"
                  onClick={() => onConvert(review.reviewId)}
                  disabled={convertBlockedReason !== null}
                  className="btn btn-sm btn-primary shrink-0"
                >
                  프로젝트 생성
                </button>
              )}

              {/**
               * 기다리기를 **사용자가 끊을 수 있게** 한다.
               *
               * 워커는 Gemini 연결이 끊기면 재시도하는데 그 사이 상태는 계속 `PENDING`
               * 이라, 화면만 보면 **멈춘 것과 구분되지 않는다.** 상한(5분)까지 손이 묶이면
               * 잘못 고른 걸 알아채도 고칠 수가 없다.
               *
               * ⭐ 잠금만 푸는 게 아니라 **서버 작업까지 닫는다** — 그러지 않으면 새로
               *    요청해도 `409` 로 막혀 결국 기다리는 것 말곤 할 게 없다.
               */}
              {isWaiting && (
                <button
                  type="button"
                  onClick={abandon}
                  disabled={isBusy}
                  className="btn btn-sm btn-gray-outlined shrink-0"
                >
                  검토 종료
                </button>
              )}

              <button
                type="button"
                onClick={ask}
                disabled={!canRequest || isWaiting}
                className="btn btn-sm btn-primary shrink-0"
              >
                {isWaiting ? '검토 중…' : isBusy ? '요청 중…' : 'AI 검토하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** 검토에 들어간 문서에서 한 종류의 ID 만 추린다 (`null` 은 다른 종류라 버린다) */
function pickedIds(
  documents: ReviewDocument[],
  key: 'bidAttachmentId' | 'companyDocumentVersionId',
) {
  return new Set(
    documents
      .map((document) => document[key])
      .filter((id): id is number => id !== null),
  );
}

/** 완료된 검토 — 본문과 **분석 자료**(근거 인용)를 함께 보여준다 */
function ReviewResult({ review }: { review: BidReview }) {
  return (
    <>
      {review.prompt && (
        <p className="rounded-lg bg-bg-hover px-4 py-3 text-caption leading-relaxed break-keep text-text-secondary">
          <span className="font-semibold text-text-primary">요청</span>{' '}
          {review.prompt}
        </p>
      )}

      <p className="mt-5 text-caption leading-relaxed break-keep whitespace-pre-wrap text-text-primary">
        {review.result || '결과가 비어 있습니다.'}
      </p>

      {/**
       * 분석 자료는 **접지 않고 그대로 편다.** AI 판단만 있고 출처가 없으면 검증할 수 없어,
       * 한 번 더 눌러야 보이면 아무도 확인하지 않는다.
       */}
      {review.citations.length > 0 && (
        <div className="mt-6 border-t border-border-default pt-5">
          <p className="text-caption font-semibold text-text-primary">
            분석 자료
          </p>
          <ol className="mt-3 flex flex-col gap-3">
            {review.citations.map((citation) => (
              <li
                key={`${citation.rankOrder}-${citation.fileName}`}
                className="rounded-lg border border-border-default px-3.5 py-2.5"
              >
                <p className="text-caption font-medium text-text-primary">
                  {citation.fileName}
                  {citation.pageNumber !== null && (
                    <span className="text-text-secondary">
                      {' '}
                      · {citation.pageNumber}쪽
                    </span>
                  )}
                  {citation.sheetName && (
                    <span className="text-text-secondary">
                      {' '}
                      · {citation.sheetName}
                    </span>
                  )}
                </p>
                {citation.excerpt && (
                  <p className="mt-1.5 text-caption leading-relaxed break-keep text-text-secondary">
                    {citation.excerpt}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {review.expiresAt && review.projectId === null && (
        <p className="mt-5 text-caption break-keep text-text-secondary">
          이 검토에 쓰인 임시 파일은 {formatDateTime(review.expiresAt)} 에
          삭제됩니다.
        </p>
      )}
    </>
  );
}

function PickSection({
  title,
  emptyText,
  isLoading,
  className = '',
  children,
}: {
  title: string;
  emptyText: string;
  isLoading: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const isEmpty =
    !isLoading && Array.isArray(children) && children.length === 0;

  return (
    <div className={className}>
      <p className="text-caption font-semibold text-text-primary">{title}</p>
      {isLoading ? (
        <p className="mt-2 text-caption text-text-secondary">불러오는 중…</p>
      ) : isEmpty ? (
        <p className="mt-2 text-caption text-text-secondary">{emptyText}</p>
      ) : (
        /**
         * 첨부가 많은 공고는 목록만으로 창을 다 먹는다 — **자기 안에서 스크롤**시켜
         * 프롬프트와 버튼이 화면 밖으로 밀려나지 않게 한다.
         * `pr-1` 은 스크롤바가 체크박스 줄을 덮지 않게 두는 자리다.
         */
        <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
          {children}
        </ul>
      )}
    </div>
  );
}

/** 고르는 줄 하나. 라벨 전체가 눌리도록 `<label>` 로 감싼다 */
function PickRow({
  label,
  disabled = false,
  disabledReason,
  isPicked,
  onToggle,
}: {
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  isPicked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      {/**
       * 고른 표시(`isPicked`)가 **잠김보다 앞선다** — 검토 중에도 무엇을 걸어 두고
       * 기다리는지 보여야 한다. 잠김은 커서와 흐림으로만 알린다.
       */}
      <label
        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        } ${
          isPicked
            ? 'border-border-primary bg-blue-bg-soft'
            : disabled
              ? 'border-border-default opacity-60'
              : 'border-border-default hover:bg-bg-hover'
        }`}
      >
        <input
          type="checkbox"
          checked={isPicked}
          disabled={disabled}
          onChange={onToggle}
          className="size-4 shrink-0 accent-btn-primary"
        />
        <span className="min-w-0 flex-1 truncate text-caption text-text-primary">
          {label}
        </span>
        {/* 출처 태그(`OPEN_API` · `CERTIFICATE`)는 두지 않는다 — 고르는 데 쓰이지 않고 파일명만 밀어낸다 */}
        {disabled && disabledReason && (
          <span className="shrink-0 text-caption text-text-secondary">
            {disabledReason}
          </span>
        )}
      </label>
    </li>
  );
}
