'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import DataTable, { type DataTableColumn } from '@/components/DataTable';
import PageTitle from '@/components/PageTitle';
import Pagination, { PaginationPlaceholder } from '@/components/Pagination';
import { formatDate, formatTime } from '@/lib/format';

import { getNotices } from './api';
import { formatAmountShort } from './display';
import { DeadlineBadge, NoticeStatusBadge } from './NoticeBadges';
import { BIDDING_ROUTES } from './routes';
import type {
  BidNoticeListItem,
  NoticeListQuery,
  NoticePage,
  NoticeSort,
  NoticeStatus,
} from './types';

const PAGE_SIZE = 10;

/** 셀렉트는 없앴지만 URL 로 들어오는 값은 계속 검증한다 */
const STATUS_OPTIONS: NoticeStatus[] = ['COLLECTED', 'DISMISSED'];

/**
 * 정렬 옵션.
 *
 * ⚠️ Spring 규약(`필드,방향`)이 아니라 **자체 enum** 이다 —
 *    `bidDeadlineAt,asc` 를 보내면 400(`BIDDING_INVALID_NOTICE_QUERY`) 이 난다.
 *    서버 기본값은 `ANNOUNCED_DESC` 라 첫 옵션에 `(기본)` 을 붙이지 않고 그대로 둔다.
 */
const SORT_OPTIONS: { value: NoticeSort; label: string }[] = [
  { value: 'ANNOUNCED_DESC', label: '최신 공고순' },
  { value: 'ANNOUNCED_ASC', label: '오래된 공고순' },
  { value: 'DEADLINE_ASC', label: '마감 임박순' },
  { value: 'DEADLINE_DESC', label: '마감 늦은순' },
];

/** URL 은 사용자가 손댈 수 있다 — 허용된 값이 아니면 필터가 없는 것으로 본다 */
function pickOption<T extends string>(value: string | null, options: T[]) {
  return options.find((option) => option === value);
}

/** 음수 · 소수 · 문자열이 그대로 서버로 가면 400 이 되어 목록이 실패 화면이 된다 */
function pickInt(value: string | null, min: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min ? parsed : undefined;
}

/** `yyyy-MM-dd` 형태만 서버로 보낸다 (date 인풋 값이지만 URL 로도 들어온다) */
function pickDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

/**
 * 입찰 공고 목록 화면. (.ai/API.md 103)
 *
 * ⚠️ **상태와 전환 여부는 다른 축이다** — `noticeStatus` 는 검토 상태(공고중 · 제외)이고,
 *    프로젝트 전환 여부는 `projectId` 로만 안다. 한 배지로 합치지 않고 열을 나눠 그린다.
 */
export default function NoticeList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** URL 이 필터의 원본이다. 같은 쿼리면 같은 객체를 유지해 효과가 헛돌지 않게 한다 */
  const query = useMemo<NoticeListQuery>(
    () => ({
      startDate: pickDate(searchParams.get('startDate')),
      endDate: pickDate(searchParams.get('endDate')),
      noticeAgency: searchParams.get('noticeAgency') ?? undefined,
      businessCategoryId: pickInt(searchParams.get('businessCategoryId'), 1),
      region: searchParams.get('region') ?? undefined,
      deadlineSoon: searchParams.get('deadlineSoon') === 'true' || undefined,
      keyword: searchParams.get('keyword') ?? undefined,
      noticeStatus: pickOption(searchParams.get('status'), STATUS_OPTIONS),
      /**
       * ⚠️ 기본값을 두지 않는다 — 화면에 들어오기만 해도 `sort` 가 붙어
       * 값이 규약과 다르면 **첫 조회부터 400** 이 된다 (`BIDDING_INVALID_NOTICE_QUERY`).
       * 고르지 않으면 서버 기본 정렬에 맡긴다.
       */
      sort: pickOption(
        searchParams.get('sort'),
        SORT_OPTIONS.map((option) => option.value),
      ),
      // 백엔드와 같은 0-based. 값이 이상하면 첫 페이지로 본다
      page: pickInt(searchParams.get('page'), 0) ?? 0,
      size: PAGE_SIZE,
    }),
    [searchParams],
  );

  /** 입력 중인 검색어 — 제출해야 URL 에 반영된다 */
  const [keywordInput, setKeywordInput] = useState(query.keyword ?? '');
  const [syncedKeyword, setSyncedKeyword] = useState(query.keyword ?? '');

  // 뒤로가기나 검색어가 담긴 링크로 들어오면 URL 만 바뀌고 입력값은 옛것이 남는다
  if (syncedKeyword !== (query.keyword ?? '')) {
    setSyncedKeyword(query.keyword ?? '');
    setKeywordInput(query.keyword ?? '');
  }

  const [reloadCount, setReloadCount] = useState(0);
  /** 어떤 요청의 결과인지 `key` 로 들고 있는다 — 조건이 바뀌면 자동으로 로딩 상태가 된다 */
  const [result, setResult] = useState<{
    key: string;
    data?: NoticePage<BidNoticeListItem>;
    hasFailed?: boolean;
  } | null>(null);

  const requestKey = `${reloadCount} ${searchParams.toString()}`;
  const current = result?.key === requestKey ? result : null;
  /** 재조회 중에는 직전 결과를 유지한다 — 목록이 통째로 사라지면 스크롤이 튄다 */
  const page = current?.data ?? result?.data ?? null;
  const hasFailed = current?.hasFailed ?? false;
  const isLoading = current === null && !hasFailed;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getNotices(query, signal)
      .then((data) => setResult({ key: requestKey, data }))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
      });

    return () => controller.abort();
  }, [requestKey, query]);

  /** 필터를 바꾸면 첫 페이지로 돌아간다 — 3페이지에서 조건을 바꾸면 빈 화면이 된다 */
  function applyFilter(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in patch)) next.delete('page');

    router.replace(next.toString() ? `?${next}` : '?');
  }

  const rows = page?.content ?? null;
  const hasFilter = [...searchParams.keys()].some((key) => key !== 'page');

  return (
    <>
      {/* 액션 버튼은 필터 바의 검색 오른쪽에 둔다 (`NoticeFilterBar`) */}
      <PageTitle
        title="공고 조회"
        description="수집된 입찰 공고를 확인합니다."
      />

      <NoticeFilterBar
        searchParams={searchParams}
        keywordInput={keywordInput}
        onKeywordChange={setKeywordInput}
        onApply={applyFilter}
      />

      <DataTable
        caption="입찰 공고 목록"
        columns={NOTICE_COLUMNS}
        rows={hasFailed ? [] : isLoading && !rows ? null : (rows ?? [])}
        rowKey={(row) => row.noticeId}
        /**
         * 행 어디를 눌러도 상세로 간다 — 공고명 링크만 열어 두면 발주처 · 금액 칸을
         * 눌렀을 때 아무 일도 일어나지 않아, 표가 눌리는 것인지 아닌지 매번 가늠하게 된다.
         * 공고명 `<Link>` 는 그대로 둔다 — 새 탭 열기 · 주소 복사가 되는 곳이 하나는 있어야 한다.
         */
        onRowClick={(row) => router.push(BIDDING_ROUTES.detail(row.noticeId))}
        /**
         * ⚠️ **가로 스크롤을 두지 않는다** (2026-08-12) — `minWidth` 를 뺐다.
         *    대신 여백을 줄이고(`dense`) 날짜 · 시각을 두 줄로 쌓아 자리를 만든다.
         */
        dense
        skeletonRows={PAGE_SIZE}
        errorMessage={
          hasFailed ? '공고 목록을 불러오지 못했습니다.' : undefined
        }
        onRetry={() => setReloadCount((count) => count + 1)}
        emptyMessage={
          hasFilter
            ? '조건에 맞는 공고가 없습니다.'
            : '아직 수집된 공고가 없습니다.'
        }
        emptyAction={
          hasFilter && (
            <button
              type="button"
              onClick={() => router.replace('?')}
              className="btn btn-sm btn-gray-outlined"
            >
              필터 초기화
            </button>
          )
        }
      />

      {/* 받아오는 동안에도 같은 높이를 잡아 둔다 — 결과가 올 때 아래가 밀리지 않게 */}
      {!hasFailed && !page && (
        <div className="mt-3 overflow-hidden rounded-base border border-border-default bg-bg-card">
          <PaginationPlaceholder />
        </div>
      )}

      {/* 표 바깥에 둔다 — 실패 · 빈 상태에서는 넘길 페이지가 없다 */}
      {!hasFailed && page && page.totalElements > 0 && (
        <div className="mt-3 overflow-hidden rounded-base border border-border-default bg-bg-card">
          <Pagination
            page={query.page ?? 0}
            totalPages={page.totalPages}
            totalElements={page.totalElements}
            unit="건"
            onChange={(next) => applyFilter({ page: String(next) })}
          />
        </div>
      )}
    </>
  );
}

/**
 * 열 정의. 폭 합계는 100% 여야 한다 (`DataTable` 이 개발 모드에서 검사한다).
 *
 * ⚠️ 사업 카테고리 열은 두지 않는다 — 우리 카테고리는 **회사 내부 분류**고
 *    나라장터는 **업종코드(수천 개)** 라 체계가 다르다. 프로젝트를 만들 때 사람이 지정한다.
 */
const NOTICE_COLUMNS: DataTableColumn<BidNoticeListItem>[] = [
  {
    key: 'noticeName',
    // ⚠️ 링크가 행 클릭까지 타면 `router.push` 가 두 번 돈다 (Ctrl+클릭도 새 탭 대신 이동)
    stopRowClick: true,
    header: '공고명',
    width: '30%',
    skeletonWidth: 'w-64',
    /**
     * 공고명만 **두 줄까지** 편다 — `[TEST] …`, `(협상에 의한 계약)` 처럼
     * 뒤에 붙는 말이 공고를 가르는 정보라 잘라내면 구분이 안 된다.
     * `break-keep` 이라 단어 중간이 아니라 **단어 단위로** 끊긴다.
     */
    /**
     * ⚠️ `break-keep` — **단어 중간에서 끊지 않는다.** `실시설계기술용역` 같은 말이
     *    `실시설계기` / `술용역` 으로 갈리면 훑어 읽을 수가 없다.
     * ⚠️ `text-balance` — 두 줄의 **길이를 비슷하게** 나눈다. 그냥 두면 첫 줄이 꽉 차고
     *    둘째 줄에 `분석 용역` 두 마디만 남아, 붙어 읽혀야 할 말이 갈린다.
     */
    cell: (row) => (
      <Link
        href={BIDDING_ROUTES.detail(row.noticeId)}
        className="line-clamp-2 block font-semibold text-balance break-keep text-text-primary hover:underline"
        title={row.noticeName}
      >
        {row.noticeName}
      </Link>
    ),
  },
  {
    key: 'noticeAgency',
    header: '발주처',
    width: '16%',
    skeletonWidth: 'w-28',
    /**
     * 발주처는 **공고명과 함께 유일하게 두 줄을 허용**한다 —
     * `경상남도교육청 경상남도밀양교육지원청` 처럼 긴 기관명이 흔하다.
     * 잘라 감추지 않고 두 줄까지 편다 — 넘치면 `line-clamp-2` 가 받는다.
     */
    cell: (row) => (
      <span
        className="line-clamp-2 break-keep text-text-secondary"
        title={row.noticeAgency}
      >
        {row.noticeAgency}
      </span>
    ),
  },
  {
    key: 'baseAmount',
    header: '기초금액',
    width: '8%',
    align: 'right',
    skeletonWidth: 'w-16',
    cell: (row) => (
      <span className="block text-text-primary">
        {formatAmountShort(row.baseAmount)}
      </span>
    ),
  },
  {
    key: 'estimatedAmount',
    header: '추정가격',
    width: '8%',
    align: 'right',
    skeletonWidth: 'w-16',
    cell: (row) => (
      <span className="block text-text-primary">
        {formatAmountShort(row.estimatedAmount)}
      </span>
    ),
  },
  {
    key: 'announcedAt',
    header: '공고일',
    width: '10%',
    skeletonWidth: 'w-20',
    cell: (row) => (
      <span className="block text-text-secondary">
        {formatDate(row.announcedAt) || '-'}
      </span>
    ),
  },
  {
    key: 'bidDeadlineAt',
    header: '투찰 마감',
    width: '18%',
    skeletonWidth: 'w-24',
    /**
     * 날짜 · 시각 · 남은 기간을 **한 줄**에 둔다 — 마감을 볼 때 셋은 한 덩어리로 읽힌다.
     *
     * ⚠️ 줄바꿈을 허용하지 않는다. 예전에는 날짜 칸에 고정 폭(`w-32`)을 주고 넘치면
     *    다음 줄로 흐르게 두었는데, 표가 좁아지자 **배지만 아래로 떨어져** 줄마다 높이가
     *    달라지고 고장난 것처럼 보였다. 배지 세로 맞춤보다 한 줄 유지가 먼저다.
     */
    cell: (row) => (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="text-text-secondary">
          {formatDate(row.bidDeadlineAt) || '-'}
          {formatTime(row.bidDeadlineAt) && (
            <span className="ml-1 text-detail text-text-muted">
              {formatTime(row.bidDeadlineAt)}
            </span>
          )}
        </span>
        <DeadlineBadge dDay={row.dDay} />
      </span>
    ),
  },
  {
    key: 'noticeStatus',
    header: '상태',
    width: '10%',
    skeletonWidth: 'w-12',
    cell: (row) => <NoticeStatusBadge status={row.noticeStatus} />,
  },
];

/**
 * 필터 바. 값의 원본은 URL 이라 상태를 따로 들지 않는다
 * (검색어만 예외 — 타이핑마다 조회하면 요청이 쏟아진다).
 */
function NoticeFilterBar({
  searchParams,
  keywordInput,
  onKeywordChange,
  onApply,
}: {
  searchParams: URLSearchParams;
  keywordInput: string;
  onKeywordChange: (value: string) => void;
  onApply: (patch: Record<string, string | undefined>) => void;
}) {
  const isDeadlineSoon = searchParams.get('deadlineSoon') === 'true';

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply({ keyword: keywordInput.trim() || undefined });
      }}
      className="mb-4 flex flex-wrap items-center gap-2"
    >
      <DateInput
        label="공고일 시작"
        value={searchParams.get('startDate') ?? ''}
        onChange={(value) => onApply({ startDate: value })}
      />
      <span className="text-caption text-text-muted">~</span>
      <DateInput
        label="공고일 종료"
        value={searchParams.get('endDate') ?? ''}
        onChange={(value) => onApply({ endDate: value })}
      />

      {/**
       * ⚠️ 상태 · 정렬 셀렉트는 두지 않는다 (2026-08-11).
       *    - 상태: 제외 기능이 미배포라 사실상 `COLLECTED` 뿐이다
       *    - 정렬: 서버 기본값(`ANNOUNCED_DESC`) 으로 충분하다
       *
       *    두 파라미터 모두 `NoticeListQuery` 에는 남아 있어 URL 로 들어오면 계속 동작한다.
       */}

      <TextFilter
        id="noticeAgency"
        label="발주처"
        placeholder="발주처"
        value={searchParams.get('noticeAgency') ?? ''}
        onCommit={(value) => onApply({ noticeAgency: value })}
      />
      {/**
       * ⚠️ 지역 검색은 화면에서 뺐다 (2026-08-11) — 공고의 지역 제한이 원문 텍스트라
       *    입력값과 맞아떨어지는 경우가 드물다. `region` 파라미터 자체는 명세에 남아 있어
       *    `NoticeListQuery` 에는 그대로 두고, URL 로 들어오면 계속 동작한다.
       */}
      {/* 토글은 값이 하나뿐이라 켜면 `true`, 끄면 파라미터 자체를 뺀다 */}
      <button
        type="button"
        aria-pressed={isDeadlineSoon}
        onClick={() =>
          onApply({ deadlineSoon: isDeadlineSoon ? undefined : 'true' })
        }
        className={`h-9 shrink-0 cursor-pointer rounded-lg border px-3 text-caption font-semibold ${
          isDeadlineSoon
            ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
            : 'border-border-default text-text-secondary hover:bg-bg-hover'
        }`}
      >
        마감 임박
      </button>

      <div className="relative w-56 shrink-0">
        <label htmlFor="noticeSearch" className="sr-only">
          공고명 검색
        </label>
        <input
          id="noticeSearch"
          type="search"
          value={keywordInput}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="공고명 검색"
          className="h-9 w-full rounded-lg border border-border-default pr-10 pl-3 text-caption text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
        />
        <button
          type="submit"
          aria-label="검색"
          className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        >
          <SearchIcon />
        </button>
      </div>

      {/**
       * 조회 조건이 아니라 **다음 행동**이라 검색 오른쪽에 붙인다.
       * `type="button"` 이 아니라 링크라 Enter 로 폼이 제출되는 것과 섞이지 않는다.
       */}
      {/* `ml-auto` 로 남은 공간을 밀어 오른쪽 끝에 붙인다 */}
      <div className="ml-auto flex shrink-0 gap-2">
        {/**
         * 둘 다 파란 채움이면 무엇이 주 동작인지 사라진다 —
         * `수집 조건` 은 외곽선으로 강조하고 채움은 `공고 등록` 하나만 쓴다.
         */}
        <Link
          href={BIDDING_ROUTES.conditions}
          className="btn btn-sm btn-primary-outlined"
        >
          수집 조건
        </Link>
        {/* 수집이 못 가져온 공고를 사람이 넣는 경로 */}
        <Link href={BIDDING_ROUTES.create} className="btn btn-sm btn-primary">
          공고 등록
        </Link>
      </div>
    </form>
  );
}

/** 텍스트 조건. 타이핑마다 조회하지 않고 Enter · 포커스 아웃에서만 반영한다 */
function TextFilter({
  id,
  label,
  placeholder,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onCommit: (value: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);

  // 뒤로가기 · 필터 초기화로 URL 이 바뀌면 입력값도 따라와야 한다
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }

  function commit() {
    const next = draft.trim();
    if (next !== value) onCommit(next || undefined);
  }

  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            // 검색어 제출(form submit)과 겹치지 않게 여기서 끊는다
            event.preventDefault();
            commit();
          }
        }}
        className="h-9 w-28 rounded-lg border border-border-default px-3 text-caption text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
      />
    </>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="flex items-center">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="h-9 w-36 cursor-pointer rounded-lg border border-border-default px-3 text-caption text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
      />
    </label>
  );
}

/** 결재 목록 · 사원 목록과 같은 아이콘 — 검색바 모양을 화면마다 다르게 두지 않는다 */
function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
      className="size-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
