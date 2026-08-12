'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ApprovalListSkeleton } from '@/components/approval/ApprovalSkeletons';
import Pagination from '@/components/Pagination';
import { APPROVAL_STATUS_LABELS } from '@/constants/status';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

import { getApprovals } from './api';
import ApprovalStatusBadge from './ApprovalStatusBadge';
import { LINE_STATUS_CLASS, LINE_STATUS_LABELS } from './lineStatus';
import { APPROVAL_ROUTES } from './routes';
import type {
  ApprovalListItem,
  ApprovalListQuery,
  ApprovalPage,
  ApprovalScope,
  ApprovalStatus,
} from './types';

const PAGE_SIZE = 10;

const SCOPE_OPTIONS: ApprovalScope[] = ['pending', 'drafted', 'all'];
const SCOPE_LABELS: Record<ApprovalScope, string> = {
  pending: '결재 요청받음',
  drafted: '내가 올린 결재',
  all: '전체',
};

const STATUS_OPTIONS: ApprovalStatus[] = [
  'DRAFT',
  'IN_PROGRESS',
  'REJECTED',
  'COMPLETED',
];

/** 기간 필터. 값은 `오늘로부터 며칠 전` 이고 빈 값이면 전체 기간이다 */
const PERIOD_OPTIONS = [
  { value: '7', label: '최근 1주일' },
  { value: '30', label: '최근 1개월' },
  { value: '90', label: '최근 3개월' },
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

/** 쓸 수 있는 탭. MASTER · ADMIN 이 아니면 `전체` 가 빠진다 */
function scopesFor(canSeeAll: boolean) {
  return canSeeAll
    ? SCOPE_OPTIONS
    : SCOPE_OPTIONS.filter((scope) => scope !== 'all');
}

/** 현재 탭. URL 값이 없거나 권한 밖이면 첫 탭(`pending`)으로 본다 */
function readScope(searchParams: URLSearchParams, canSeeAll: boolean) {
  return (
    pickOption(searchParams.get('scope'), scopesFor(canSeeAll)) ?? 'pending'
  );
}

/**
 * `최근 N일` 을 서버가 받는 `yyyy-MM-dd` 로 바꾼다.
 *
 * ⚠️ URL 값이라 아무 숫자나 들어올 수 있다 — **셀렉트에 있는 값만** 받는다.
 * 큰 수를 그대로 빼면 Invalid Date 가 되고 `toISOString()` 이 예외를 던져 목록이 통째로 죽는다.
 *
 * ⚠️ `toISOString()` 은 UTC 라 한국 시간 오전에는 **하루 이른 날짜**가 나온다.
 * 로컬 연·월·일을 직접 붙인다.
 */
function toFromDate(days: string | null) {
  const allowed = PERIOD_OPTIONS.find((option) => option.value === days);
  if (!allowed) return undefined;

  const date = new Date();
  date.setDate(date.getDate() - Number(allowed.value));

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * 결재 관리 목록 화면. (AP-072~076·080, .ai/API.md 결재 목록)
 *
 * 결재 블록은 프로젝트 곳곳에 흩어져 있어, 자기 차례를 확인하려면 이 화면이 필요하다.
 * 탭이 곧 서버의 `scope` 다 — 프론트가 걸러내지 않고 서버가 대상을 정한다.
 */
export default function ApprovalList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();

  /** `전체` 탭은 MASTER · ADMIN 만 쓸 수 있다 — 나머지는 403 이라 탭 자체를 감춘다 */
  const canSeeAll = user.role === 'MASTER' || user.role === 'ADMIN';
  const scopes = scopesFor(canSeeAll);
  const scope = readScope(searchParams, canSeeAll);

  /** URL 이 필터의 원본이다. 같은 쿼리면 같은 객체를 유지해 효과가 헛돌지 않게 한다 */
  const query = useMemo<ApprovalListQuery>(
    () => ({
      scope: readScope(searchParams, canSeeAll),
      status: pickOption(searchParams.get('status'), STATUS_OPTIONS),
      fromDate: toFromDate(searchParams.get('period')),
      keyword: searchParams.get('keyword') ?? undefined,
      // 백엔드와 같은 0-based. 값이 이상하면 첫 페이지로 본다
      page: pickInt(searchParams.get('page'), 0) ?? 0,
      size: PAGE_SIZE,
    }),
    [searchParams, canSeeAll],
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
    data?: ApprovalPage<ApprovalListItem>;
    hasFailed?: boolean;
  } | null>(null);

  const requestKey = `${reloadCount} ${scope} ${searchParams.toString()}`;
  const current = result?.key === requestKey ? result : null;
  /** 재조회 중에는 직전 결과를 유지한다 — 목록이 통째로 사라지면 스크롤이 튄다 */
  const page = current?.data ?? result?.data ?? null;
  const hasFailed = current?.hasFailed ?? false;
  const isLoading = current === null && !hasFailed;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getApprovals(query, signal)
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

  return (
    <>
      <div className="mb-6">
        <h2 className="text-heading-m font-bold">결재 관리</h2>
        <p className="mt-1.5 text-label break-keep text-text-secondary">
          내가 올린 결재와 처리할 결재를 한곳에서 확인합니다.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="결재 조회 범위"
        className="mb-4 flex gap-1 border-b border-border-default"
      >
        {scopes.map((option) => {
          const isActive = option === scope;

          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => applyFilter({ scope: option })}
              className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-label ${
                isActive
                  ? 'border-[#4F39F6] font-semibold text-[#4F39F6]'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {SCOPE_LABELS[option]}
              {/* 지금 보고 있는 탭의 건수만 안다 — 다른 탭은 따로 조회해야 알 수 있다 */}
              {isActive && page ? ` (${page.totalElements})` : ''}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilter({ keyword: keywordInput.trim() || undefined });
        }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <FilterSelect
          label="전체 상태"
          value={searchParams.get('status') ?? ''}
          onChange={(value) => applyFilter({ status: value })}
          options={STATUS_OPTIONS.map((option) => ({
            value: option,
            label: APPROVAL_STATUS_LABELS[option],
          }))}
        />
        <FilterSelect
          label="전체 기간"
          value={searchParams.get('period') ?? ''}
          onChange={(value) => applyFilter({ period: value })}
          options={PERIOD_OPTIONS}
        />

        <div className="relative w-64">
          <label htmlFor="approvalSearch" className="sr-only">
            결재 검색
          </label>
          <input
            id="approvalSearch"
            type="search"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="결재 제목 · 프로젝트명 검색"
            className="w-full rounded-lg border border-border-default py-2 pr-10 pl-3 text-label text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
          />
          <button
            type="submit"
            aria-label="검색"
            className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          >
            <SearchIcon />
          </button>
        </div>
      </form>

      {hasFailed ? (
        <Centered>
          <p className="text-label text-text-secondary">
            결재 목록을 불러오지 못했어요.
          </p>
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            className="mt-3 cursor-pointer rounded-lg border border-border-default px-3 py-1.5 text-label font-semibold text-text-primary hover:bg-bg-hover"
          >
            다시 시도
          </button>
        </Centered>
      ) : isLoading && !rows ? (
        <ApprovalListSkeleton rows={PAGE_SIZE} />
      ) : !rows || rows.length === 0 ? (
        <Centered>
          <p className="text-label text-text-secondary">
            {scope === 'pending'
              ? '처리할 결재가 없어요.'
              : '조회된 결재가 없어요.'}
          </p>
        </Centered>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <ApprovalRow
                key={row.approvalId}
                row={row}
                isMyTurn={row.currentApproverId === user.userId}
                // 내가 올린 결재는 내가 처리할 일이 없다 — 행 전체가 이미 상세 링크다
                showAction={scope !== 'drafted'}
              />
            ))}
          </ul>

          {page && (
            <Pagination
              page={query.page ?? 0}
              totalPages={page.totalPages}
              totalElements={page.totalElements}
              // 건수는 탭 옆에 이미 있다 — 아래에 또 적으면 같은 수가 두 번 나온다
              showTotal={false}
              onChange={(next) => applyFilter({ page: String(next) })}
            />
          )}
        </>
      )}
    </>
  );
}

/** 목록 한 줄. 카드 전체가 상세로 가는 링크다 */
function ApprovalRow({
  row,
  isMyTurn,
  showAction,
}: {
  row: ApprovalListItem;
  isMyTurn: boolean;
  showAction: boolean;
}) {
  const doneCount = row.lines.filter(
    (line) => line.status === 'APPROVED',
  ).length;

  return (
    <li>
      <Link
        href={APPROVAL_ROUTES.detail(row.approvalId)}
        className="flex items-center gap-4 rounded-base border border-border-default px-4 py-3.5 hover:bg-bg-surface"
      >
        <ApprovalStatusBadge status={row.status} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-semibold text-text-primary">
            {row.title || '제목 없음'}
          </p>
          <p className="mt-0.5 truncate text-detail text-text-secondary">
            {row.projectName} &gt; {row.stepName} · {row.drafterName}
          </p>
        </div>

        {/**
         * 아래 네 칸은 **너비를 고정한다** — 회차 배지가 있는 행과 없는 행,
         * 결재자가 1명인 행과 3명인 행에서 열이 어긋나면 목록이 훑기 어려워진다.
         */}
        <span className="w-12 shrink-0 text-center">
          {/* 재상신된 결재만 회차를 붙인다 — 1회차는 붙여봐야 정보가 없다 */}
          {row.currentRevisionNo > 1 && (
            <span className="rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-detail text-text-secondary">
              {row.currentRevisionNo}회차
            </span>
          )}
        </span>

        <span className="w-12 shrink-0 text-center text-detail text-text-secondary">
          {doneCount} / {row.lines.length}
        </span>

        <span className="w-24 shrink-0 text-right text-detail text-text-secondary">
          {formatDate(row.submittedAt ?? row.createdAt)}
        </span>

        <span className="flex w-20 shrink-0 justify-end -space-x-1.5 overflow-hidden">
          {row.lines.map((line) => (
            <span
              key={line.approverId}
              title={`${line.approverName} ${LINE_STATUS_LABELS[line.status]}`}
              className={`flex size-6 items-center justify-center rounded-pill border border-white text-caption font-semibold ${
                LINE_STATUS_CLASS[line.status]
              }`}
            >
              {line.approverName.slice(0, 1)}
            </span>
          ))}
        </span>

        {showAction && (
          <span
            className={`w-14 shrink-0 rounded-lg py-1.5 text-center text-detail font-semibold ${
              isMyTurn
                ? 'bg-[#4F39F6] text-text-white'
                : 'border border-border-default text-text-secondary'
            }`}
          >
            {isMyTurn ? '결재' : '상세'}
          </span>
        )}
      </Link>
    </li>
  );
}

/** `2026-08-06T18:06:26` → `2026.08.06` — 목록에선 시각까지 필요하지 않다 */
function formatDate(value: string) {
  return value.slice(0, 10).replaceAll('-', '.');
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer rounded-lg border border-border-default px-3 py-2 text-label text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 사원 목록(`EmployeeList`)과 같은 아이콘 — 검색바 모양을 화면마다 다르게 두지 않는다 */
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-base border border-border-default py-16">
      {children}
    </div>
  );
}
