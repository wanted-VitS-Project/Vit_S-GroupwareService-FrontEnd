'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Pagination from '@/components/Pagination';
import ProjectListSkeleton from '@/components/project/ProjectListSkeleton';
import { PROJECT_STATUS_LABELS } from '@/constants/status';
import { getCategories } from '@/features/businessCategory/api';
import type { BusinessCategory as CategoryOption } from '@/features/businessCategory/types';

import { getProjectCount, getProjects } from './api';
import ProjectCard from './ProjectCard';
import {
  PROJECT_STATUS_OPTIONS,
  PROJECT_SUMMARY_STATUSES,
} from './projectStatus';
import type { ProjectListItem, ProjectListQuery, ProjectPage } from './types';

const PAGE_SIZE = 10;

/** URL 은 사용자가 손댈 수 있다 — 허용된 값이 아니면 필터가 없는 것으로 본다 */
function pickStatus(value: string | null) {
  return PROJECT_STATUS_OPTIONS.find((status) => status === value);
}

/** 음수 · 소수 · 문자열이 그대로 서버로 가면 400 이 되어 목록이 실패 화면이 된다 */
function pickInt(value: string | null, min: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min ? parsed : undefined;
}

/** 서버가 받는 `yyyy-MM-dd` 형식만 통과시킨다 */
function pickDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

/**
 * 내 프로젝트 목록 화면. (PRJ-013 · PRJ-015, .ai/API.md 프로젝트 목록)
 *
 * 목록은 서버가 대상을 정한다 — 참여하지 않은 프로젝트는 403 이 아니라 응답에서 빠지므로
 * 화면이 역할별로 다시 거르지 않는다.
 */
export default function MyProjectList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = pickStatus(searchParams.get('status'));

  /** URL 이 필터의 원본이다. 같은 쿼리면 같은 객체를 유지해 효과가 헛돌지 않게 한다 */
  const query = useMemo<ProjectListQuery>(
    () => ({
      status: pickStatus(searchParams.get('status')),
      businessCategoryId: pickInt(searchParams.get('categoryId'), 1),
      startedOnFrom: pickDate(searchParams.get('from')),
      startedOnTo: pickDate(searchParams.get('to')),
      keyword: searchParams.get('keyword') ?? undefined,
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
    data?: ProjectPage<ProjectListItem>;
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

    getProjects(query, signal)
      .then((data) => setResult({ key: requestKey, data }))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
      });

    return () => controller.abort();
  }, [requestKey, query]);

  /**
   * 필터를 바꾸면 첫 페이지로 돌아간다 — 3페이지에서 조건을 바꾸면 빈 화면이 된다.
   *
   * 히스토리 처리가 갈린다 — **필터는 `replace`, 페이지 이동은 `push`** 다.
   * 필터를 만질 때마다 쌓으면 뒤로가기가 조작 이력을 되짚느라 목록을 못 벗어나고,
   * 반대로 페이지까지 `replace` 하면 3페이지에서 뒤로가기가 목록 밖으로 나가버린다.
   */
  function applyFilter(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }

    const isPageMove = 'page' in patch;
    if (!isPageMove) next.delete('page');

    const href = next.toString() ? `?${next}` : '?';
    if (isPageMove) router.push(href);
    else router.replace(href);
  }

  const rows = page?.content ?? null;
  /**
   * ⚠️ `??` 를 쓰면 안 된다 — 빈 문자열은 nullish 가 아니라 거기서 체인이 멈춘다.
   * `?keyword=` 처럼 값이 비어 들어오면 뒤 항목을 평가하지 않아 판정이 틀어진다.
   */
  const hasFilter = Boolean(
    status ||
    query.businessCategoryId ||
    query.startedOnFrom ||
    query.startedOnTo ||
    query.keyword,
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] leading-8 font-bold text-[#111827]">
          내 프로젝트
        </h2>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          참여 중인 모든 프로젝트를 조회하고 관리합니다.
        </p>
      </div>

      <ProjectSummary reloadCount={reloadCount} />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilter({ keyword: keywordInput.trim() || undefined });
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative min-w-64 flex-1">
          <label htmlFor="projectSearch" className="sr-only">
            프로젝트 검색
          </label>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#9CA3AF]">
            <SearchIcon />
          </span>
          <input
            id="projectSearch"
            type="search"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            /* 백엔드 `keyword` 는 과업명뿐 아니라 발주처도 함께 검색한다 */
            placeholder="과업명 · 발주처 검색"
            className="h-[41px] w-full rounded-lg border border-[#E5E7EB] bg-white pr-4 pl-9 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B6FF6]"
          />
        </div>

        {/*
          `tablist` 가 아니라 `group` 이다 — 연결된 `tabpanel` 도, 화살표 키 이동도 없어
          탭으로 알리면 스크린리더 사용자가 동작하지 않는 조작을 시도하게 된다
        */}
        <div
          role="group"
          aria-label="프로젝트 상태 필터"
          className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white p-1"
        >
          <StatusTab
            label="전체"
            isActive={!status}
            onClick={() => applyFilter({ status: undefined })}
          />
          {PROJECT_STATUS_OPTIONS.map((option) => (
            <StatusTab
              key={option}
              label={PROJECT_STATUS_LABELS[option]}
              isActive={status === option}
              onClick={() => applyFilter({ status: option })}
            />
          ))}
        </div>
      </form>

      <CategoryPeriodFilter
        categoryId={query.businessCategoryId}
        from={query.startedOnFrom ?? ''}
        to={query.startedOnTo ?? ''}
        onChange={applyFilter}
      />

      {hasFailed ? (
        <Centered>
          <p className="text-[13px] text-[#6B7280]">
            프로젝트 목록을 불러오지 못했어요.
          </p>
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            className="mt-3 cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-[#F3F4F6]"
          >
            다시 시도
          </button>
        </Centered>
      ) : isLoading && !rows ? (
        <ProjectListSkeleton rows={PAGE_SIZE} />
      ) : !rows || rows.length === 0 ? (
        <Centered>
          <p className="text-[13px] text-[#6B7280]">
            {hasFilter
              ? '조건에 맞는 프로젝트가 없어요.'
              : '참여 중인 프로젝트가 없어요.'}
          </p>
        </Centered>
      ) : (
        /*
          재조회 중에는 직전 목록을 그대로 두되 진행 중임을 알린다 —
          아무 표시가 없으면 응답이 느릴 때 사용자가 같은 조작을 반복한다
        */
        <div
          aria-busy={isLoading}
          className={`flex flex-col gap-3 transition-opacity ${
            isLoading ? 'opacity-60' : ''
          }`}
        >
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <ProjectCard key={row.projectId} row={row} />
            ))}
          </ul>

          {page && (
            <div className="rounded-xl border border-[#E5E7EB] bg-white">
              <Pagination
                page={query.page ?? 0}
                totalPages={page.totalPages}
                totalElements={page.totalElements}
                unit="건"
                onChange={(next) => applyFilter({ page: String(next) })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 상태별 통계 카드.
 *
 * ⚠️ 집계 API 가 따로 없어 상태마다 `size=1` 로 한 번씩 물어 `totalElements` 만 쓴다.
 * 그래서 **목록 필터와 무관하게** 마운트 때 한 번만 부른다 — 필터를 만질 때마다
 * 다시 부르면 조작 한 번에 4콜이 나간다.
 *
 * ⭐ `전체` 는 **네 상태의 합**이다. 상태 필터 없이 세면 종결(`CLOSED`)까지 들어가는데,
 *    종결 건은 카드로 세우지 않으므로 합이 맞지 않는다. 덤으로 호출도 한 번 준다.
 */
function ProjectSummary({ reloadCount }: { reloadCount: number }) {
  const [counts, setCounts] = useState<number[] | null>(null);
  /** 카드만 따로 다시 부른다 — 목록은 멀쩡한데 통계만 실패할 수 있다 */
  const [retryCount, setRetryCount] = useState(0);
  /**
   * 몇 번째 시도가 실패했는지 들고 있는다.
   * `counts === null` 만으로는 **아직 세는 중**과 **실패**를 구분할 수 없어,
   * 실패해도 카드가 영영 `–` 로 남고 재시도할 방법이 없다.
   */
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const hasFailed = failedAt === retryCount;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all(
      PROJECT_SUMMARY_STATUSES.map((status) => getProjectCount(status, signal)),
    )
      .then(setCounts)
      // 통계는 보조 정보다 — 실패해도 목록까지 실패 화면으로 만들지 않는다
      .catch(() => {
        if (!signal.aborted) setFailedAt(retryCount);
      });

    return () => controller.abort();
  }, [reloadCount, retryCount]);

  /** 종결(`CLOSED`)은 어느 카드에도 들어가지 않는다 — 그래서 전체는 네 값의 합이다 */
  const total = counts?.reduce((sum, count) => sum + count, 0) ?? null;

  const cards = [
    { label: '전체 프로젝트', tint: '#6B7280', icon: <FolderIcon /> },
    ...PROJECT_SUMMARY_STATUSES.map((status, index) => ({
      label: `${PROJECT_STATUS_LABELS[status]} 프로젝트`,
      tint: ['#6B7280', '#3B6FF6', '#F59E0B', '#22C55E'][index],
      icon: [
        <ClockIcon key="c" />,
        <PlayIcon key="p" />,
        <CoinIcon key="s" />,
        <CheckIcon key="d" />,
      ][index],
    })),
  ];

  /** 카드 순서(`전체` + 네 상태)에 맞춘 표시값 */
  const values = counts === null ? null : [total, ...counts];

  if (hasFailed) {
    return (
      <section
        aria-label="프로젝트 상태 요약"
        className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4"
      >
        <p role="alert" className="text-[13px] text-[#6B7280]">
          상태별 건수를 불러오지 못했어요.
        </p>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="cursor-pointer rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold text-[#111827] hover:bg-[#F3F4F6]"
        >
          다시 시도
        </button>
      </section>
    );
  }

  return (
    /* 좁은 화면에서 5열을 유지하면 카드 폭이 좁아져 숫자가 아이콘과 겹친다 */
    <section
      aria-label="프로젝트 상태 요약"
      className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 xl:gap-7"
    >
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="flex h-24 items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <span
            aria-hidden
            style={{ backgroundColor: `${card.tint}15`, color: card.tint }}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          >
            {card.icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] text-[#6B7280]">{card.label}</p>
            <p className="mt-0.5 truncate text-[22px] leading-8 font-semibold text-[#111827]">
              {/* 아직 세는 중이면 자리만 잡아 둔다 — 0 을 먼저 보이면 잘못된 값을 읽힌다 */}
              {values ? (values[index] ?? 0).toLocaleString('ko-KR') : '–'}
              <span className="ml-1 text-[13px] font-medium text-[#6B7280]">
                개
              </span>
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

/**
 * 기간 · 사업분류 필터 바.
 *
 * 사업분류는 **한 번에 하나만** 고를 수 있다 — 서버가 `businessCategoryId` 를
 * 단수로 받아서 셀렉트로 둔다. `전체` 를 고르면 필터가 풀린다.
 */
function CategoryPeriodFilter({
  categoryId,
  from,
  to,
  onChange,
}: {
  categoryId?: number;
  from: string;
  to: string;
  onChange: (patch: Record<string, string | undefined>) => void;
}) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCategories({}, signal)
      .then(setCategories)
      // 카테고리를 못 받아도 나머지 필터는 그대로 쓸 수 있다
      .catch(() => {
        if (!signal.aborted) setCategories([]);
      });

    return () => controller.abort();
  }, []);

  /**
   * ⚠️ `??` 가 아니라 `||` 다 — `from` · `to` 는 값이 없으면 **빈 문자열**로 들어온다.
   * 빈 문자열은 nullish 가 아니라 `??` 체인이 거기서 멈춰,
   * `to` 만 지정한 경우 초기화 버튼이 나타나지 않는다.
   */
  const hasValue = Boolean(categoryId || from || to);

  return (
    <div
      id="projectFilters"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EFF0F2] bg-white px-5 py-3"
    >
      <span className="text-[15px] font-semibold text-[#38424E]">기간</span>
      <DateTag
        label="시작일 (부터)"
        value={from}
        max={to || undefined}
        onChange={(value) => onChange({ from: value })}
      />
      <span aria-hidden className="h-3 w-px bg-[#E5E7EB]" />
      <DateTag
        label="시작일 (까지)"
        value={to}
        min={from || undefined}
        onChange={(value) => onChange({ to: value })}
      />

      <span aria-hidden className="mx-2 h-6 w-px bg-[#E5E7EB]" />

      <label className="flex items-center gap-3">
        <span className="text-[15px] font-semibold text-[#38424E]">
          사업분류
        </span>
        <select
          value={categoryId ?? ''}
          onChange={(event) =>
            onChange({ categoryId: event.target.value || undefined })
          }
          className="w-44 cursor-pointer rounded-[9px] border-[1.5px] border-[#E5E7EB] bg-white px-3 py-1 text-[13px] font-medium text-[#374151] focus:outline-2 focus:outline-offset-2 focus:outline-[#2563EB]"
        >
          {/* 아직 못 받았어도 `전체` 는 고를 수 있어야 한다 — 필터를 지우는 유일한 값이다 */}
          <option value="">전체</option>
          {categories.map((category) => (
            <option key={category.categoryId} value={category.categoryId}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      {hasValue && (
        <button
          type="button"
          onClick={() =>
            onChange({ categoryId: undefined, from: undefined, to: undefined })
          }
          className="ml-auto cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
        >
          초기화
        </button>
      )}
    </div>
  );
}

/** 시안의 날짜 `Tag`. 네이티브 날짜 입력을 태그 모양으로 감싼다 */
function DateTag({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="flex items-center rounded-[9px] border-[1.5px] border-[#E5E7EB] bg-[#F6F8FC] px-3 py-1">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="w-36 cursor-pointer bg-transparent text-[13px] font-medium text-[#374151] focus:outline-none"
      />
    </label>
  );
}

function StatusTab({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium ${
        isActive
          ? 'bg-[#EDF4FF] text-[#3B6FF6]'
          : 'text-[#4B5563] hover:bg-[#F3F4F6]'
      }`}
    >
      {label}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-white py-16">
      {children}
    </div>
  );
}

/** 아래 아이콘은 모두 시안의 벡터를 stroke 로 옮긴 것이다 */
function iconProps(size: string) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: size,
  };
}

function SearchIcon() {
  return (
    <svg {...iconProps('size-4')}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.5 9.5v5l4-2.5-4-2.5Z" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps('size-5')}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}
