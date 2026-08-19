'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import Breadcrumb from '@/components/Breadcrumb';
import DataTable from '@/components/DataTable';
import PageTitle from '@/components/PageTitle';
import Pagination from '@/components/Pagination';
import { PROJECT_ROUTES } from '@/features/project/routes';
import { messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { dateInputProps } from '@/lib/dateInput';

import { getSettlementClients, getSettlementProjects } from './api';
import { formatAmount, settlementProjectTags } from './display';
import { FINANCE_ROUTES } from './routes';
import SettlementRoundPanel from './SettlementRoundPanel';
import type { SettlementProjectPage, SettlementSort } from './types';

/** 한 페이지 20행 */
const PAGE_SIZE = 20;

const SORT_OPTIONS: { value: SettlementSort; label: string }[] = [
  { value: 'NEXT_PLANNED_DATE_ASC', label: '정산 예정일순' },
  { value: 'TOTAL_AMOUNT_DESC', label: '금액 많은순' },
];

/**
 * 정산 현황 — 프로젝트 단위 집계 화면. 행을 열면 회차 목록이 그 자리에서 펼쳐진다.
 * 조회 전용이고, 값을 고치는 곳은 프로젝트 스텝의 정산 블록이다.
 */
export default function SettlementStatusList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const startDate = searchParams.get('startDate') ?? '';
  const endDate = searchParams.get('endDate') ?? '';
  const client = searchParams.get('client') ?? '';
  const sort = sortOf(searchParams.get('sort'));
  const page = pageOf(searchParams.get('page'));

  const [reloadCount, setReloadCount] = useState(0);
  /** 어떤 조건의 결과인지 `key` 로 들고 있어 조건이 바뀌면 자동으로 로딩이 된다 */
  const [result, setResult] = useState<{
    key: string;
    data?: SettlementProjectPage;
    errorMessage?: string;
  } | null>(null);
  const [clients, setClients] = useState<string[]>([]);
  /** 회차를 펼친 프로젝트. 한 번에 하나만 연다 */
  const [openProjectId, setOpenProjectId] = useState<number | null>(null);

  const requestKey = `${reloadCount} ${startDate} ${endDate} ${client} ${sort} ${page}`;
  const current = result?.key === requestKey ? result : null;
  /**
   * 조건을 바꾸는 동안 직전 결과를 그대로 둔다 — 매번 자리표시로 되돌아가면 번쩍인다.
   */
  const projectPage = current?.data ?? result?.data ?? null;
  const rows = current?.errorMessage ? null : (projectPage?.projects ?? null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getSettlementProjects(
      {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        client: client || undefined,
        page,
        size: PAGE_SIZE,
        sort,
      },
      signal,
    )
      .then((data) => setResult({ key: requestKey, data }))
      .catch((caught) => {
        if (signal.aborted) return;

        setResult({
          key: requestKey,
          errorMessage: messageOf(caught, '정산 현황을 불러오지 못했습니다.'),
        });
      });

    return () => controller.abort();
  }, [requestKey, startDate, endDate, client, sort, page]);

  useEffect(() => {
    const controller = new AbortController();

    getSettlementClients(controller.signal)
      .then(setClients)
      // 선택지를 못 받아도 목록은 그대로 쓴다
      .catch(() => {});

    return () => controller.abort();
  }, []);

  /** 조건을 바꾸면 첫 페이지로 돌아간다 — 3페이지에서 거르면 빈 화면이 나온다 */
  function applyFilter(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');

    setOpenProjectId(null);
    router.replace(next.toString() ? `?${next}` : '?');
  }

  function movePage(nextPage: number) {
    const next = new URLSearchParams(searchParams.toString());

    if (nextPage > 0) next.set('page', String(nextPage));
    else next.delete('page');

    setOpenProjectId(null);
    router.replace(next.toString() ? `?${next}` : '?');
  }

  const hasFilter = startDate !== '' || endDate !== '' || client !== '';

  return (
    <>
      <Breadcrumb
        items={[
          { label: '재무 관리', href: FINANCE_ROUTES.hub },
          { label: '정산 현황' },
        ]}
      />

      <PageTitle
        title="정산 현황"
        description="프로젝트별 정산 진행 상황입니다. 행을 열면 회차별 내역을 볼 수 있습니다."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex w-full items-center gap-1.5 sm:w-auto">
          <label htmlFor="settlementStart" className="sr-only">
            정산 예정일 시작
          </label>
          <input
            id="settlementStart"
            type="date"
            {...dateInputProps('date')}
            value={startDate}
            max="2999-12-31"
            onChange={(event) =>
              applyFilter({ startDate: event.target.value || undefined })
            }
            className="input w-full sm:w-40"
          />
          <span aria-hidden className="text-caption text-text-muted">
            ~
          </span>
          <label htmlFor="settlementEnd" className="sr-only">
            정산 예정일 종료
          </label>
          <input
            id="settlementEnd"
            type="date"
            {...dateInputProps('date')}
            value={endDate}
            max="2999-12-31"
            onChange={(event) =>
              applyFilter({ endDate: event.target.value || undefined })
            }
            className="input w-full sm:w-40"
          />
        </div>

        {/* 폭을 고정한다 — 선택지가 늦게 오면 필터바가 넓어졌다 좁아진다 */}
        <FilterSelect
          id="settlementClient"
          label="발주처"
          allLabel="발주처 전체"
          value={client}
          onChange={(value) => applyFilter({ client: value || undefined })}
          options={clients.map((name) => ({ value: name, label: name }))}
        />

        <FilterSelect
          id="settlementSort"
          label="정렬"
          value={sort}
          onChange={(value) => applyFilter({ sort: value })}
          options={SORT_OPTIONS}
        />
      </div>

      <DataTable
        caption="프로젝트별 정산 현황"
        dense
        /* 열이 9개라 막대 폭이 값과 어긋난다 — 머리글만 남기고 스피너를 둔다 */
        loadingLabel="정산 현황 불러오는 중"
        rows={rows}
        rowKey={(row) => row.projectId}
        errorMessage={current?.errorMessage}
        onRetry={() => setReloadCount((count) => count + 1)}
        onRowClick={(row) =>
          setOpenProjectId((open) =>
            open === row.projectId ? null : row.projectId,
          )
        }
        rowClassName={(row) =>
          row.projectId === openProjectId ? 'bg-blue-bg-soft' : ''
        }
        /* 표 끝이 아니라 **누른 행 바로 아래**에 연다 — 끝에 열면 화면 밖이라 안 보인다 */
        renderExpanded={(row) =>
          row.projectId === openProjectId ? (
            <SettlementRoundPanel
              projectId={row.projectId}
              projectName={row.projectName}
            />
          ) : null
        }
        emptyMessage={
          hasFilter
            ? '조건에 맞는 프로젝트가 없습니다'
            : '정산 항목이 있는 프로젝트가 없습니다'
        }
        emptyAction={
          hasFilter ? (
            <button
              type="button"
              onClick={() => router.replace('?')}
              className="btn btn-sm btn-gray-outlined"
            >
              필터 초기화
            </button>
          ) : undefined
        }
        columns={[
          {
            /* 행 클릭만으로는 키보드로 펼칠 수 없어 단추를 따로 둔다 */
            key: 'toggle',
            header: '',
            width: '4%',
            stopRowClick: true,
            cell: (row) => {
              const isOpen = row.projectId === openProjectId;

              return (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={`${row.projectName} 정산 회차 ${isOpen ? '접기' : '펼치기'}`}
                  onClick={() =>
                    setOpenProjectId((open) =>
                      open === row.projectId ? null : row.projectId,
                    )
                  }
                  className="flex size-7 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className={`size-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              );
            },
          },
          {
            key: 'project',
            header: '과업명',
            width: '14%',
            cell: (row) => (
              <div className="min-w-0">
                {/* 행 클릭은 회차 펼치기라, 프로젝트로 가는 길은 이름에 둔다 */}
                <Link
                  href={PROJECT_ROUTES.detail(row.projectId)}
                  onClick={(event) => event.stopPropagation()}
                  className="block text-label font-semibold break-keep text-text-primary hover:underline"
                >
                  {row.projectName}
                </Link>

                {/* 손봐야 할 것만 배지로 남긴다 — 0 건은 적지 않는다 */}
                {(row.paymentUnlinkedCount > 0 ||
                  row.taxInvoiceUnlinkedCount > 0) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.paymentUnlinkedCount > 0 && (
                      <span className="rounded-button-sm bg-yellow-bg-soft px-1.5 py-0.5 text-caption text-yellow-text">
                        미연결 입금 {row.paymentUnlinkedCount}건
                      </span>
                    )}
                    {row.taxInvoiceUnlinkedCount > 0 && (
                      <span className="rounded-button-sm bg-yellow-bg-soft px-1.5 py-0.5 text-caption text-yellow-text">
                        미연결 계산서 {row.taxInvoiceUnlinkedCount}건
                      </span>
                    )}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'client',
            header: '발주처',
            width: '8%',
            cell: (row) => (
              <span className="block text-caption break-keep text-text-secondary">
                {row.clientName ?? '—'}
              </span>
            ),
          },
          {
            key: 'manager',
            header: '담당자',
            width: '6%',
            cell: (row) => (
              <span className="block truncate text-caption text-text-secondary">
                {row.projectManager}
              </span>
            ),
          },
          {
            key: 'nextPlannedDate',
            header: '예정일',
            width: '8%',
            cell: (row) => (
              <span className="text-caption whitespace-nowrap text-text-secondary">
                {row.nextPlannedDate ? formatDate(row.nextPlannedDate) : '—'}
              </span>
            ),
          },
          {
            key: 'planned',
            header: '예정 금액',
            width: '11%',
            align: 'right',
            cell: (row) => (
              <span className="text-label break-all text-text-primary tabular-nums">
                {formatAmount(row.totalPlannedAmount)}
              </span>
            ),
          },
          {
            key: 'income',
            header: '수입',
            width: '11%',
            align: 'right',
            cell: (row) => (
              <span className="text-label break-all text-text-primary tabular-nums">
                {formatAmount(row.totalIncome)}
              </span>
            ),
          },
          {
            key: 'outcome',
            header: '지출',
            width: '11%',
            align: 'right',
            cell: (row) => (
              <span className="text-label break-all text-text-primary tabular-nums">
                {formatAmount(row.totalOutcome)}
              </span>
            ),
          },
          {
            /* 수입 − 지출을 직접 계산하지 않는다 — 산식이 바뀌면 화면 값만 어긋난다 */
            key: 'total',
            header: '합계',
            width: '11%',
            align: 'right',
            cell: (row) => (
              <span className="text-label font-semibold break-all text-text-primary tabular-nums">
                {formatAmount(row.totalAmount)}
              </span>
            ),
          },
          {
            key: 'state',
            header: '상태',
            // 태그가 최대 네 개까지 붙어 다른 열보다 넉넉히 잡는다
            width: '16%',
            cell: (row) => (
              // 태그가 여러 개라 줄이 넘치면 아래로 접는다
              <span className="flex flex-wrap gap-1">
                {settlementProjectTags(row).map((tag) => (
                  <span key={tag.key} className={`badge ${tag.className}`}>
                    {tag.label}
                  </span>
                ))}
              </span>
            ),
          },
        ]}
      />

      {projectPage && projectPage.totalElements > 0 && (
        <div className="mt-3 overflow-hidden rounded-base border border-border-default bg-bg-card">
          <Pagination
            page={projectPage.page}
            totalPages={projectPage.totalPages}
            onChange={movePage}
          />
        </div>
      )}
    </>
  );
}

function FilterSelect({
  id,
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  /** 없으면 '전체' 선택지를 두지 않는다 (정렬처럼 항상 값이 있는 경우) */
  allLabel?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="shrink-0">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input w-full cursor-pointer sm:w-40"
      >
        {allLabel && <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** URL 값은 사용자가 손댈 수 있다 — 아는 값이 아니면 기본 정렬로 본다 */
function sortOf(value: string | null): SettlementSort {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SettlementSort)
    : 'NEXT_PLANNED_DATE_ASC';
}

function pageOf(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}
