'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { NoticeDetailSkeleton } from '@/components/bidding/NoticeSkeletons';
import Modal from '@/components/Modal';
import { PROJECT_ROUTES } from '@/features/project/routes';
import { ApiError, messageOf } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';

import { getNoticeDetail } from './api';
import { formatAmount, orDash } from './display';
import { BIDDING_CODES } from './errorCodes';
import {
  ConvertedBadge,
  DeadlineBadge,
  NoticeStatusBadge,
} from './NoticeBadges';
import NoticeReviewModal from './NoticeReviewModal';
import NoticeSummaryCard from './NoticeSummaryCard';
import { BIDDING_ROUTES } from './routes';
import type { BidNoticeDetail, NoticeAttachment } from './types';

/**
 * 조회 실패. 없는 공고와 그 외를 나눈다.
 *
 * ℹ️ 401 · 403 은 여기서 다루지 않는다 — `lib/api.ts` 가 전역으로 받아
 *    로그인 · `/forbidden` 으로 보낸다 (`errorCodes.ts` 참고).
 */
type Failure = 'notFound' | 'other';

function failureOf(error: unknown): Failure {
  return error instanceof ApiError &&
    error.code === BIDDING_CODES.noticeNotFound
    ? 'notFound'
    : 'other';
}

/**
 * 공고 번호. `externalId` 에 차수를 붙여 한 덩어리로 읽힌다 (`20260801234-00`).
 * 차수는 빈 문자열로 오기도 해 `orDash` 대신 값이 있을 때만 붙인다.
 *
 * ⚠️ **직접 등록한 공고는 번호가 없다** — 백엔드가 `MANUAL-<uuid>` 를 채워 보내는데
 *    사람이 읽을 값이 아니라 화면에 그리지 않는다.
 */
function formatNoticeNo(notice: BidNoticeDetail) {
  if (!notice.externalId || notice.sourceCode === 'MANUAL') return '-';
  return notice.noticeOrder?.trim()
    ? `${notice.externalId}-${notice.noticeOrder}`
    : notice.externalId;
}

/**
 * 공동수급 허용 여부. **`null` 과 `false` 를 구분한다** —
 * 수집처가 안 준 것(`null`)을 `불가` 로 그리면 없는 사실을 지어내는 셈이다.
 */
function formatJointContract(allowed: boolean | null) {
  if (allowed === null) return '-';
  return allowed ? '허용' : '불가';
}

/**
 * 입찰 공고 상세 화면. (.ai/API.md 104)
 *
 * ⚠️ **읽기 전용이다.** 제외 · 복구(`PATCH .../dismiss` · `/restore`)와
 *    프로젝트 전환(`POST .../projects`)은 아직 배포되지 않아 버튼을 두지 않는다.
 * ⚠️ 상세는 목록과 달리 금액을 줄이지 않는다 — `3.4억` 이 아니라 `340,000,000원` 이다.
 */
export default function NoticeDetail({ noticeId }: { noticeId: number }) {
  const [notice, setNotice] = useState<BidNoticeDetail | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [failureMessage, setFailureMessage] = useState('');
  const [showsSummary, setShowsSummary] = useState(false);
  const [showsReview, setShowsReview] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getNoticeDetail(noticeId, signal)
      .then((data) => {
        setNotice(data);
        setFailure(null);
      })
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;
        setFailure(failureOf(caught));
        setFailureMessage(messageOf(caught, '공고를 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [noticeId]);

  if (failure) return <FailureView kind={failure} message={failureMessage} />;
  if (!notice) return <NoticeDetailSkeleton />;

  return (
    <>
      <p className="text-caption text-text-secondary">
        <Link
          href={BIDDING_ROUTES.list}
          className="hover:text-text-primary hover:underline"
        >
          공고 조회
        </Link>{' '}
        &gt; 공고 상세
      </p>

      <div className="mt-2">
        {/**
         * 배지를 제목 **옆**에 둔다 — 위에 한 줄을 따로 쓰면 공고명이 아래로 밀려
         * 화면을 열자마자 "무슨 공고인가" 가 한눈에 안 들어온다.
         * `items-baseline` 이라 제목이 두 줄이 되어도 배지는 첫 줄 옆에 붙는다.
         */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
          <h2 className="text-heading-m font-bold break-keep">
            {notice.noticeName}
          </h2>
          <span className="flex shrink-0 flex-wrap items-center gap-1.5">
            <NoticeStatusBadge status={notice.noticeStatus} />
            <DeadlineBadge dDay={notice.dDay} />
            <ConvertedBadge projectId={notice.projectId} />
          </span>
        </div>
        <p className="mt-1.5 text-caption text-text-secondary">
          {orDash(notice.noticeAgency)}
          {/* 번호 없는 공고에 `공고번호 -` 를 붙이면 빠진 값처럼 읽힌다 — 통째로 뺀다 */}
          {formatNoticeNo(notice) !== '-' &&
            ` · 공고번호 ${formatNoticeNo(notice)}`}
          {notice.sourceName && ` · ${notice.sourceName}`}
        </p>
      </div>

      {/* 제외 사유는 있을 때만 — 없는 줄을 비워 두면 제외가 아닌 것처럼 읽힌다 */}
      {notice.noticeStatus === 'DISMISSED' && notice.dismissReason && (
        <p className="mt-4 rounded-lg bg-bg-hover px-3 py-2.5 text-caption break-keep text-text-secondary">
          <span className="font-semibold text-text-primary">제외 사유</span>{' '}
          {notice.dismissReason}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card title="공고 정보">
            <Fields>
              <Field label="공고 유형" value={orDash(notice.noticeType)} />
              <Field
                label="원문 상태"
                value={orDash(notice.externalNoticeStatus)}
              />
              <Field label="발주처" value={orDash(notice.noticeAgency)} />
              <Field label="수요기관" value={orDash(notice.demandAgency)} />
              <Field
                label="수집처"
                value={orDash(notice.sourceName ?? notice.sourceCode)}
              />
              <Field label="공고번호" value={formatNoticeNo(notice)} />
            </Fields>
          </Card>

          <Card title="일정">
            <Fields>
              <Field label="공고일" value={formatDate(notice.announcedAt)} />
              <Field
                label="입찰 시작"
                value={formatDateTime(notice.bidStartAt)}
              />
              <Field
                label="질의 마감"
                value={formatDateTime(notice.questionDeadlineAt)}
              />
              <Field
                label="참가신청 마감"
                value={formatDateTime(notice.applicationDeadlineAt)}
              />
              <Field
                label="투찰 마감"
                value={formatDateTime(notice.bidDeadlineAt)}
              />
              <Field
                label="개찰 일시"
                value={formatDateTime(notice.openingAt)}
              />
            </Fields>
          </Card>

          <Card title="금액">
            <Fields>
              <Field label="기초금액" value={formatAmount(notice.baseAmount)} />
              <Field
                label="추정가격"
                value={formatAmount(notice.estimatedAmount)}
              />
              {/* 변동 폭 · 하한율은 수집처 원문이다 — 파싱하지 않고 그대로 보여준다 */}
              <Field
                label="예정가격 변동폭"
                value={orDash(notice.priceRangeText)}
              />
              <Field
                label="투찰하한율"
                value={orDash(notice.minimumBidRateText)}
              />
            </Fields>
          </Card>

          <Card title="참가 자격 · 계약">
            <Fields>
              <Field label="계약 방법" value={orDash(notice.contractMethod)} />
              <Field
                label="낙찰자 결정방법"
                value={orDash(notice.evaluationMethod)}
              />
              <Field
                label="공동수급"
                value={formatJointContract(notice.jointContractAllowed)}
              />
              <Field
                label="공동수급 조건"
                value={orDash(notice.jointContractText)}
              />
            </Fields>

            {/* 자격 · 제한은 문장이 길어 2단 격자에 넣으면 줄이 깨진다 — 아래에 편다 */}
            <div className="mt-4 flex flex-col gap-3 border-t border-border-default pt-4">
              <LongField
                label="참가 자격"
                value={notice.participationQualificationText}
              />
              <LongField label="지역 제한" value={notice.regionLimitText} />
              <LongField label="업종 제한" value={notice.businessLimitText} />
            </div>
          </Card>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
          <Card title="원문 · 첨부">
            {notice.sourceUrl ? (
              <a
                href={notice.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                // 새 탭으로 열리는 것을 스크린리더에도 알린다 (↗ 는 눈으로만 보인다)
                aria-label="원문 공고 보기 (새 창)"
                className="btn btn-sm btn-primary-outlined w-full"
              >
                원문 공고 보기 <span aria-hidden>↗</span>
              </a>
            ) : (
              <p className="text-caption text-text-secondary">
                원문 링크가 없어요.
              </p>
            )}

            <div className="mt-4">
              <p className="text-detail font-semibold text-text-secondary">
                첨부파일
              </p>
              <AttachmentList attachments={notice.attachments} />
            </div>
          </Card>

          {/* 이 공고로 무엇을 할지 — AI 요약 · 프로젝트 전환을 한 카드에 모은다 */}
          <Card title="분석 · 전환">
            <button
              type="button"
              onClick={() => setShowsSummary(true)}
              className="btn btn-sm btn-primary w-full"
            >
              AI 요약
            </button>

            {/**
             * AI 검토는 요약과 **다른 기능**이다 — 공고 첨부와 사내 문서를 골라 비교하고
             * 결과에 근거(인용)가 붙는다 (워커도 `bid_review_worker` 로 갈린다).
             */}
            <button
              type="button"
              onClick={() => setShowsReview(true)}
              className="btn btn-sm btn-primary mt-2 w-full"
            >
              AI 검토
            </button>

            {/**
             * ⚠️ **전환 버튼을 두지 않는다.**
             *
             * 백엔드에는 `POST /bidding/notices/{id}/projects` 가 들어왔지만
             * (근거 검토 · 사업 카테고리 · 기간 · 참여자를 받는 별도 흐름이라) 화면은 따로 만든다.
             * 눌리지 않는 버튼을 남겨 두면 "고장 났나" 로 읽혀, 아예 빼고 상태만 알린다.
             */}
            {notice.projectId === null ? (
              <p className="mt-2 text-caption text-text-secondary">
                아직 프로젝트로 전환되지 않았습니다.
              </p>
            ) : (
              <Link
                href={PROJECT_ROUTES.detail(notice.projectId)}
                className="btn btn-sm btn-gray-outlined mt-2 w-full"
              >
                프로젝트 보기
              </Link>
            )}
          </Card>
        </div>
      </div>

      {showsReview && (
        <NoticeReviewModal
          noticeId={noticeId}
          onClose={() => setShowsReview(false)}
        />
      )}

      {showsSummary && (
        <Modal
          title="AI 요약"
          onClose={() => setShowsSummary(false)}
          /* 프롬프트를 쓰다 바깥을 잘못 눌러 날리지 않게 한다 (닫기 · Esc 는 살아 있다) */
          dismissOnBackdrop={false}
          /* 검토 모달과 같은 크기로 맞춘다 — 두 창을 오가며 쓰는데 폭이 달라 흔들린다 */
          className="flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
          /**
           * 제목 줄을 직접 그린다.
           *
           * 기본 헤더는 **자기 여백이 없다** — 패널의 `p-8` 을 빌려 쓰는데, 여기서는
           * 본문만 스크롤시키려고 패딩 없는 `className` 을 주므로 글자가 모서리에 붙는다.
           */
          header={
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border-default px-6 py-4">
              <h2 className="text-body-m font-bold text-text-primary">
                AI 요약
              </h2>
              <button
                type="button"
                onClick={() => setShowsSummary(false)}
                aria-label="닫기"
                className="cursor-pointer rounded-button-sm px-1 text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>
          }
        >
          {/* 요약이 길어 모달 안에서만 스크롤한다 — 뒤 화면까지 함께 굴러가면 어지럽다 */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-8">
            {/* 모달이 이미 카드다 — 카드 껍데기를 한 겹 더 씌우지 않는다 */}
            <NoticeSummaryCard noticeId={noticeId} isBare />
          </div>
        </Modal>
      )}
    </>
  );
}

/**
 * 첨부 목록.
 *
 * ⚠️ 우리 저장소 파일이 아니라 **원문 사이트 링크**다 — 다운로드 API 가 없어
 *    링크가 없는 항목은 이름만 그린다.
 * ⚠️ `hasAttachment` 가 true 여도 목록이 빌 수 있어 **배열 길이로** 판단한다.
 */
function AttachmentList({ attachments }: { attachments: NoticeAttachment[] }) {
  if (attachments.length === 0) {
    return (
      <p className="mt-1.5 text-caption text-text-secondary">첨부가 없어요.</p>
    );
  }

  return (
    /**
     * 파일명이 길어 전부 잘리므로 **줄끼리 구분이 안 된다** — 파일마다 테두리를 둘러
     * 어디까지가 한 파일인지 눈으로 끊기게 한다. 아이콘은 링크 여부를 함께 알린다.
     */
    <ul className="mt-1.5 flex flex-col gap-1.5">
      {attachments.map((attachment) => (
        <li key={attachment.attachmentOrder} className="min-w-0">
          {attachment.sourceUrl ? (
            <a
              href={attachment.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              title={attachment.fileName}
              // `title` 은 접근 이름에 들어가지 않는다 — 새 탭 안내를 라벨로 준다
              aria-label={`${attachment.fileName} (새 창)`}
              className="flex items-center gap-2 rounded-lg border border-border-default px-2.5 py-2 text-caption text-text-primary hover:bg-bg-hover"
            >
              <FileIcon />
              <span className="min-w-0 flex-1 truncate">
                {attachment.fileName}
              </span>
              <span aria-hidden className="shrink-0 text-text-muted">
                ↗
              </span>
            </a>
          ) : (
            /* 링크가 없는 첨부는 이름만 남는다 — 눌러도 갈 곳이 없어 테두리를 흐리게 둔다 */
            <span
              title={attachment.fileName}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border-default px-2.5 py-2 text-caption text-text-secondary"
            >
              <FileIcon />
              <span className="min-w-0 flex-1 truncate">
                {attachment.fileName}
              </span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3.5 shrink-0 text-text-muted"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

/** 결재 상세와 같은 카드 — 상세 화면 모양을 도메인마다 다르게 두지 않는다 */
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-default bg-bg-card p-4">
      <h3 className="mb-3 text-caption font-semibold text-text-primary">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Fields({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">{children}</div>;
}

/** 한 줄짜리 값. 빈 값은 호출하는 쪽에서 `-` 로 채워 넘긴다 */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-detail text-text-secondary">{label}</p>
      <p className="mt-0.5 text-caption break-keep text-text-primary">
        {value || '-'}
      </p>
    </div>
  );
}

/** 문장형 값. 줄바꿈이 섞여 오는 원문이라 `whitespace-pre-line` 으로 그린다 */
function LongField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-detail text-text-secondary">{label}</p>
      <p className="mt-0.5 text-caption break-keep whitespace-pre-line text-text-primary">
        {orDash(value)}
      </p>
    </div>
  );
}

/** 실패 화면. 문구는 백엔드 것을 그대로 쓰고 목록으로 돌려보낸다 */
function FailureView({ kind, message }: { kind: Failure; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border-default py-20 text-center">
      <span aria-hidden className="text-heading-xl">
        📋
      </span>

      <p className="mt-3 text-label font-semibold text-text-primary">
        {kind === 'notFound'
          ? '공고를 찾을 수 없습니다'
          : '공고를 불러오지 못했습니다'}
      </p>
      <p className="mt-1.5 text-caption break-keep text-text-secondary">
        {message}
      </p>

      <Link
        href={BIDDING_ROUTES.list}
        className="btn btn-sm btn-gray-outlined mt-4"
      >
        공고 목록으로
      </Link>
    </div>
  );
}
