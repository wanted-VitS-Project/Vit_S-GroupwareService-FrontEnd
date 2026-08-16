'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Pagination from '@/components/Pagination';
import { ErrorStateTwoButton } from '@/components/ErrorState';
import ProjectListSkeleton from '@/components/project/ProjectListSkeleton';
import { PROJECT_STATUS_LABELS } from '@/constants/status';
import { getCategories } from '@/features/businessCategory/api';
import type { BusinessCategory as CategoryOption } from '@/features/businessCategory/types';

import { getProjects } from './api';
import ProjectCard from './ProjectCard';
import ProjectSummaryCards from './ProjectSummaryCards';
import { PROJECT_STATUS_OPTIONS } from './projectStatus';
import type { ProjectListItem, ProjectListQuery, ProjectPage } from './types';
import { useRefreshProjectCounts } from './useProjectCounts';

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
  const refreshCounts = useRefreshProjectCounts();

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
        <h2 className="text-logo leading-8 font-bold text-text-primary">
          내 프로젝트
        </h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          참여 중인 모든 프로젝트를 조회하고 관리합니다.
        </p>
      </div>

      {/* 카드 · 건수 조회는 대시보드와 같은 것을 쓴다 (`useProjectCounts` 캐시 공유) */}
      <ProjectSummaryCards
        label="프로젝트 상태 요약"
        wideGapClassName="xl:gap-7"
      />

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
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted">
            <SearchIcon />
          </span>
          <input
            id="projectSearch"
            type="search"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            /* 백엔드 `keyword` 는 과업명뿐 아니라 발주처도 함께 검색한다 */
            placeholder="과업명 · 발주처 검색"
            className="h-[41px] w-full rounded-lg border border-border-default bg-bg-card pr-4 pl-9 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
          />
        </div>

        {/*
          `tablist` 가 아니라 `group` 이다 — 연결된 `tabpanel` 도, 화살표 키 이동도 없어
          탭으로 알리면 스크린리더 사용자가 동작하지 않는 조작을 시도하게 된다
        */}
        <div
          role="group"
          aria-label="프로젝트 상태 필터"
          className="flex items-center gap-1 rounded-lg border border-border-default bg-bg-card p-1"
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
        <ErrorStateTwoButton
          title="프로젝트 목록을 불러오지 못했습니다."
          description="잠시 후 다시 시도해주세요."
          retryLabel="다시 시도"
          onRetry={() => {
            setReloadCount((count) => count + 1);
            // 목록이 실패했으면 건수도 못 받았을 공산이 크다 — 함께 다시 읽는다
            void refreshCounts();
          }}
        />
      ) : isLoading && !rows ? (
        <ProjectListSkeleton rows={PAGE_SIZE} />
      ) : !rows || rows.length === 0 ? (
        <Centered>
          <p className="text-[13px] text-text-secondary">
            {hasFilter
              ? '조건에 맞는 프로젝트가 없습니다.'
              : '참여 중인 프로젝트가 없습니다.'}
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
            <div className="rounded-base border border-border-default bg-bg-card">
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
      className="flex flex-wrap items-center gap-3 rounded-base border border-border-default bg-bg-card px-5 py-3"
    >
      <span className="text-[15px] font-semibold text-gray-text-soft">
        기간
      </span>
      <DateTag
        label="시작일 (부터)"
        value={from}
        max={to || undefined}
        onChange={(value) => onChange({ from: value })}
      />
      <span aria-hidden className="h-3 w-px bg-bg-hover-secondary" />
      <DateTag
        label="시작일 (까지)"
        value={to}
        min={from || undefined}
        onChange={(value) => onChange({ to: value })}
      />

      <span aria-hidden className="mx-2 h-6 w-px bg-bg-hover-secondary" />

      <label className="flex items-center gap-3">
        <span className="text-[15px] font-semibold text-gray-text-soft">
          사업분류
        </span>
        <select
          value={categoryId ?? ''}
          onChange={(event) =>
            onChange({ categoryId: event.target.value || undefined })
          }
          className="w-44 cursor-pointer rounded-[9px] border-[1.5px] border-border-default bg-bg-card px-3 py-1 text-[13px] font-medium text-gray-text-soft focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
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
          className="ml-auto cursor-pointer rounded-lg px-3 py-1.5 text-label font-medium text-text-secondary hover:bg-bg-hover"
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
    <label className="flex items-center rounded-[9px] border-[1.5px] border-border-default bg-bg-surface px-3 py-1">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="w-36 cursor-pointer bg-transparent text-[13px] font-medium text-gray-text-soft focus:outline-none"
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
      className={`cursor-pointer rounded-button-md px-3 py-1.5 text-label font-medium ${
        isActive
          ? 'bg-blue-bg-soft text-text-primary-blue'
          : 'text-btn-gray-text-hover hover:bg-bg-hover'
      }`}
    >
      {label}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-base border border-border-default bg-bg-card py-16">
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

/* 요약 카드 아이콘 5종은 `ProjectSummaryCards` 로 옮겼다 — 이 화면에는 검색만 남는다 */
