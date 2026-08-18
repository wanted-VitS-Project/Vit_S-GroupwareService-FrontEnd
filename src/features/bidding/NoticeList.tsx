'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import DataTable, { type DataTableColumn } from '@/components/DataTable';
import PageTitle from '@/components/PageTitle';
import Pagination, { PaginationPlaceholder } from '@/components/Pagination';
import { notifyToast } from '@/components/Toast';
import { messageOf } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/format';

import { favoriteNotice, getNotices, unfavoriteNotice } from './api';
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
 * 정렬 옵션. Spring 규약이 아니라 자체 enum 이라 필드,방향 으로 보내면 400 이다.
 * 서버 기본값이 ANNOUNCED_DESC 다.
 */
const SORT_OPTIONS: { value: NoticeSort; label: string }[] = [
  { value: 'ANNOUNCED_DESC', label: '최신 공고순' },
  { value: 'ANNOUNCED_ASC', label: '오래된 공고순' },
  { value: 'DEADLINE_ASC', label: '마감 임박순' },
  { value: 'DEADLINE_DESC', label: '마감 늦은순' },
];

/** URL 은 사용자가 손댈 수 있다. 허용된 값이 아니면 필터가 없는 것으로 본다 */
function pickOption<T extends string>(value: string | null, options: T[]) {
  return options.find((option) => option === value);
}

/** 음수 · 문자열이 그대로 서버로 가면 400 이 되어 목록이 실패 화면이 된다 */
function pickInt(value: string | null, min: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min ? parsed : undefined;
}

/** yyyy-MM-dd 형태만 서버로 보낸다 (URL 로도 들어온다) */
function pickDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

/**
 * 입찰 공고 목록 화면.
 * 검토 상태(noticeStatus)와 전환 여부(projectId)는 다른 축이라 열을 나눠 그린다.
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
      favorite: searchParams.get('favorite') === 'true' || undefined,
      /**
       * 기본값을 두지 않는다. 값이 규약과 다르면 첫 조회부터 400 이 난다.
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

  /** 입력 중인 검색어. 제출해야 URL 에 반영된다 */
  const [keywordInput, setKeywordInput] = useState(query.keyword ?? '');
  const [syncedKeyword, setSyncedKeyword] = useState(query.keyword ?? '');

  // 뒤로가기나 검색어가 담긴 링크로 들어오면 URL 만 바뀌고 입력값은 옛것이 남는다
  if (syncedKeyword !== (query.keyword ?? '')) {
    setSyncedKeyword(query.keyword ?? '');
    setKeywordInput(query.keyword ?? '');
  }

  const [reloadCount, setReloadCount] = useState(0);
  /** 관심 토글이 오가는 중인 공고. 두 번 눌러 요청이 겹치지 않게 잠근다 */
  const [pendingFavorite, setPendingFavorite] = useState<number | null>(null);
  /** 어떤 요청의 결과인지 key 로 들고 있는다. 조건이 바뀌면 자동으로 로딩 상태가 된다 */
  const [result, setResult] = useState<{
    key: string;
    data?: NoticePage<BidNoticeListItem>;
    hasFailed?: boolean;
  } | null>(null);

  const requestKey = `${reloadCount} ${searchParams.toString()}`;
  const current = result?.key === requestKey ? result : null;
  /** 재조회 중에는 직전 결과를 유지한다. 목록이 사라지면 스크롤이 튄다 */
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

  /** 필터를 바꾸면 첫 페이지로 돌아간다. 3페이지에서 조건을 바꾸면 빈 화면이 된다 */
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

  /**
   * 관심 토글. 응답이 바뀐 뒤의 상태를 그대로 줘 그 줄만 갈아끼운다.
   * 목록을 다시 읽으면 스크롤이 튀고 방금 누른 줄이 사라진다.
   */
  async function toggleFavorite(row: BidNoticeListItem) {
    // 오가는 중에 또 누르면 무시한다. 버튼을 잠그면 못 누르는 것처럼 보인다
    if (pendingFavorite === row.noticeId) return;

    setPendingFavorite(row.noticeId);

    try {
      const next = row.isFavorite
        ? await unfavoriteNotice(row.noticeId)
        : await favoriteNotice(row.noticeId);

      setResult((current) =>
        current?.data
          ? {
              ...current,
              data: {
                ...current.data,
                content: current.data.content.map((item) =>
                  item.noticeId === next.noticeId
                    ? { ...item, isFavorite: next.isFavorite }
                    : item,
                ),
              },
            }
          : current,
      );
    } catch (caught) {
      notifyToast(messageOf(caught, '관심 상태를 바꾸지 못했습니다.'), 'error');
    } finally {
      setPendingFavorite(null);
    }
  }

  return (
    <>
      {/* 액션 버튼은 필터 바의 검색 오른쪽에 둔다 */}
      <PageTitle
        variant="top"
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
        loadingLabel="공고를 불러오는 중"
        columns={noticeColumns(toggleFavorite, pendingFavorite)}
        rows={hasFailed ? [] : isLoading && !rows ? null : (rows ?? [])}
        rowKey={(row) => row.noticeId}
        /**
         * 행 어디를 눌러도 상세로 간다. 공고명 링크만 열어 두면 다른 칸이 죽은 것처럼 보인다.
         * 공고명 Link 는 새 탭 열기 · 주소 복사를 위해 그대로 둔다.
         */
        onRowClick={(row) => router.push(BIDDING_ROUTES.detail(row.noticeId))}
        /**
         * 가로 스크롤을 두지 않는다. 대신 여백을 줄이고 날짜 · 시각을 쌓아 자리를 만든다.
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

      {/* 받아오는 동안에도 같은 높이를 잡아 둔다. 결과가 올 때 아래가 밀리지 않게 */}
      {!hasFailed && !page && (
        <div className="mt-3 overflow-hidden rounded-base border border-border-default bg-bg-card">
          <PaginationPlaceholder />
        </div>
      )}

      {/* 표 바깥에 둔다. 실패 · 빈 상태에서는 넘길 페이지가 없다 */}
      {!hasFailed && page && page.totalElements > 0 && (
        <div className="mt-3 overflow-hidden rounded-base border border-border-default bg-bg-card">
          <Pagination
            page={query.page ?? 0}
            totalPages={page.totalPages}
            onChange={(next) => applyFilter({ page: String(next) })}
          />
        </div>
      )}
    </>
  );
}

/**
 * 열 정의. 폭 합계는 100% 여야 한다.
 * 사업 카테고리 열은 두지 않는다. 우리 분류와 나라장터 업종코드는 체계가 다르다.
 */
function noticeColumns(
  onToggleFavorite: (row: BidNoticeListItem) => void,
  pendingFavorite: number | null,
): DataTableColumn<BidNoticeListItem>[] {
  return [
    {
      /**
       * 관심 열을 맨 앞에 둔다. 훑어 내려가며 별만 따라 읽을 수 있어야 한다.
       * 회사 공용이라 누가 눌렀는지는 표시하지 않는다.
       */
      key: 'isFavorite',
      header: '관심',
      width: '4%',
      align: 'center',
      skeletonWidth: 'w-4',
      // 별을 누르는 것은 상세로 가는 동작이 아니다
      stopRowClick: true,
      cell: (row) => (
        <FavoriteButton
          row={row}
          isPending={pendingFavorite === row.noticeId}
          onToggle={onToggleFavorite}
        />
      ),
    },
    {
      key: 'noticeName',
      // 링크가 행 클릭까지 타면 router.push 가 두 번 돈다
      stopRowClick: true,
      header: '공고명',
      width: '27%',
      skeletonWidth: 'w-64',
      /**
       * 공고명은 두 줄까지 편다. 뒤에 붙는 말이 공고를 가르는 정보라 잘라내면 구분이 안 된다.
       * break-keep 으로 단어 단위로 끊고 text-balance 로 두 줄 길이를 비슷하게 나눈다.
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
      width: '15%',
      skeletonWidth: 'w-28',
      /**
       * 발주처는 공고명과 함께 두 줄을 허용한다. 긴 기관명이 흔하다.
       * 넘치면 line-clamp-2 가 받는다.
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
       * 날짜 · 시각 · 남은 기간을 한 줄에 둔다. 마감을 볼 때 셋은 한 덩어리로 읽힌다.
       * 줄바꿈을 허용하면 배지만 아래로 떨어져 줄마다 높이가 달라진다.
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
}

/**
 * 관심 별. 색만으로 갈리지 않게 채운 별 · 빈 별로 모양까지 바꾼다.
 * 보조기술에는 별 모양이 안 보여 aria-pressed 로 눌린 상태를 알린다.
 */
function FavoriteButton({
  row,
  isPending,
  onToggle,
}: {
  row: BidNoticeListItem;
  isPending: boolean;
  onToggle: (row: BidNoticeListItem) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={row.isFavorite}
      aria-label={`${row.noticeName} 관심 ${row.isFavorite ? '해제' : '등록'}`}
      /**
       * 잠그지 않는다. 잠그면 오가는 동안 금지 커서가 떠 못 누르는 버튼처럼 읽힌다.
       * 요청이 겹치는 것은 onToggle 쪽에서 흘려보낸다.
       */
      onClick={() => onToggle(row)}
      className={`inline-flex size-7 cursor-pointer items-center justify-center rounded-button-sm hover:bg-bg-hover ${
        row.isFavorite
          ? 'text-yellow-border'
          : 'text-text-muted hover:text-text-secondary'
      } ${isPending ? 'opacity-60' : ''}`}
    >
      <StarIcon filled={row.isFavorite} />
    </button>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M10 2.5l2.36 4.78 5.28.77-3.82 3.72.9 5.26L10 14.55l-4.72 2.48.9-5.26L2.36 8.05l5.28-.77L10 2.5z" />
    </svg>
  );
}

/**
 * 필터 바. 값의 원본은 URL 이라 상태를 따로 들지 않는다.
 * 검색어만 예외다. 타이핑마다 조회하면 요청이 쏟아진다.
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
  const isFavoriteOnly = searchParams.get('favorite') === 'true';

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
       * 상태 셀렉트는 제외 기능이 붙은 뒤 다시 두었다. 제외한 공고를 골라 봐야 되돌릴 수 있다.
       * 정렬 셀렉트는 두지 않는다. 서버 기본값으로 충분하고 나머지 값은 아직 추정이다.
       */}
      <label className="sr-only" htmlFor="noticeStatusFilter">
        공고 상태
      </label>
      <select
        id="noticeStatusFilter"
        value={searchParams.get('status') ?? ''}
        onChange={(event) =>
          onApply({ status: event.target.value || undefined })
        }
        className="h-9 shrink-0 rounded-lg border border-border-default bg-bg-card px-2 text-caption text-text-primary"
      >
        <option value="">상태 전체</option>
        <option value="COLLECTED">공고중</option>
        <option value="DISMISSED">제외</option>
      </select>

      <TextFilter
        id="noticeAgency"
        label="발주처"
        placeholder="발주처"
        value={searchParams.get('noticeAgency') ?? ''}
        onCommit={(value) => onApply({ noticeAgency: value })}
      />
      {/**
       * 지역 검색은 화면에서 뺐다. 공고의 지역 제한이 원문 텍스트라 잘 맞지 않는다.
       * region 파라미터는 남아 있어 URL 로 들어오면 계속 동작한다.
       */}
      {/* 토글은 값이 하나뿐이라 켜면 true, 끄면 파라미터 자체를 뺀다 */}
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

      {/* 관심은 회사 공용이라 내 관심 이 아니라 관심 이다 */}
      <button
        type="button"
        aria-pressed={isFavoriteOnly}
        onClick={() =>
          onApply({ favorite: isFavoriteOnly ? undefined : 'true' })
        }
        className={`h-9 shrink-0 cursor-pointer rounded-lg border px-3 text-caption font-semibold ${
          isFavoriteOnly
            ? 'border-yellow-border bg-yellow-bg-soft text-yellow-text'
            : 'border-border-default text-text-secondary hover:bg-bg-hover'
        }`}
      >
        관심
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
       * 조회 조건이 아니라 다음 행동이라 검색 오른쪽 끝에 붙인다.
       * 버튼이 아니라 링크라 Enter 로 폼이 제출되는 것과 섞이지 않는다.
       */}
      <div className="ml-auto flex shrink-0 gap-2">
        {/**
         * 둘 다 파란 채움이면 무엇이 주 동작인지 사라진다.
         * 수집 조건 은 외곽선으로 두고 채움은 공고 등록 하나만 쓴다.
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

/** 결재 · 사원 목록과 같은 아이콘. 검색바 모양을 화면마다 다르게 두지 않는다 */
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
