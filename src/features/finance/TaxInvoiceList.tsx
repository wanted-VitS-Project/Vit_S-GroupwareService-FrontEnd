'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Breadcrumb from '@/components/Breadcrumb';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { notifyToast } from '@/components/Toast';
import { messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';

import {
  deleteTaxInvoices,
  getTaxInvoiceFilterOptions,
  getTaxInvoices,
  updateTaxInvoiceExclusion,
} from './api';
import { CASH_FLOW_LINK_BADGE, formatAmount } from './display';
import { FINANCE_ROUTES } from './routes';
import {
  CASH_FLOW_LINK_STATUS_LABELS,
  TAX_INVOICE_TYPE_BADGE,
  TAX_INVOICE_TYPE_LABELS,
  type ProjectOption,
  type TaxInvoiceItem,
  type TaxInvoiceListQuery,
  type TaxInvoiceSkippedItem,
} from './types';

/** 한 화면에 담는 줄 수 — 서버가 페이징을 하므로 값을 우리가 정한다 */
const PAGE_SIZE = 20;

/**
 * 세금계산서 목록. (#17)
 *
 * 입출금 목록과 하는 일은 같지만 **다른 점이 셋** 있다.
 * 1. **페이징이 있다** — 배열 하나가 통째로 오지 않는다
 * 2. **직접 등록이 없다** — CSV 로만 들어와 `등록` 버튼 대신 `CSV 수집` 을 둔다
 * 3. **수정은 메모만** 된다 — 나머지는 파일이 원본이라 상세에서만 고친다
 */
export default function TaxInvoiceList() {
  const router = useRouter();

  const [query, setQuery] = useState<TaxInvoiceListQuery>({
    page: 0,
    size: PAGE_SIZE,
  });
  const [rows, setRows] = useState<TaxInvoiceItem[] | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  /** 고른 줄 — 삭제 · 제외는 다건이다 */
  const [picked, setPicked] = useState<Set<number>>(new Set());
  /** 검색어는 **누를 때만** 반영한다 — 글자마다 요청하면 목록이 깜빡인다 */
  const [keywordInput, setKeywordInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  /** 목록을 다시 읽게 만드는 값 — 삭제 · 제외 뒤에 올린다 */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getTaxInvoices(query, signal)
      .then((data) => {
        setRows(data.taxInvoices);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        // 페이지가 바뀌면 지난 선택은 화면에 없다 — 남겨 두면 안 보이는 것이 지워진다
        setPicked(new Set());
        setError('');
      })
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;

        setRows([]);
        setError(messageOf(caught, '목록을 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [query, reloadKey]);

  /** 필터 옵션은 한 번만 받는다 — 실패해도 목록은 그대로 쓴다 */
  useEffect(() => {
    const controller = new AbortController();

    getTaxInvoiceFilterOptions(controller.signal)
      .then((data) => setProjects(data.projects))
      .catch(() => {});

    return () => controller.abort();
  }, []);

  /** 조건을 바꾸면 **첫 페이지로 되돌린다** — 3페이지에서 걸러 0건이 되면 빈 화면이다 */
  function patchQuery(next: Partial<TaxInvoiceListQuery>) {
    setQuery((prev) => ({ ...prev, ...next, page: 0 }));
  }

  function toggle(taxId: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(taxId)) next.add(taxId);
      return next;
    });
  }

  /** 다건 처리의 결과는 **부분 성공이 정상**이라 건너뛴 건을 함께 알린다 */
  function report(
    done: string,
    count: number,
    skippedItems: TaxInvoiceSkippedItem[],
  ) {
    notifyToast(
      skippedItems.length > 0
        ? `${count}건 ${done}. ${skippedItems.length}건은 제외됐어요 (${skippedItems[0]?.reason ?? ''})`
        : `${count}건 ${done}`,
    );
    setPicked(new Set());
    setReloadKey((key) => key + 1);
  }

  async function remove() {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      const { count, skippedItems } = await deleteTaxInvoices([...picked]);
      report('삭제했어요', count, skippedItems);
    } catch (caught) {
      notifyToast(messageOf(caught, '삭제하지 못했습니다.'));
    } finally {
      setIsDeleting(false);
    }
  }

  async function exclude(isExcluded: boolean) {
    try {
      const { count, skippedItems } = await updateTaxInvoiceExclusion(
        [...picked],
        isExcluded,
      );
      report(isExcluded ? '연결 대상에서 뺐어요' : '연결 대상에 넣었어요', count, skippedItems);
    } catch (caught) {
      notifyToast(messageOf(caught, '처리하지 못했습니다.'));
    }
  }

  const columns = buildColumns(picked, toggle);
  const page = query.page ?? 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Breadcrumb
            items={[
              { label: '재무 관리', href: FINANCE_ROUTES.hub },
              { label: '세금계산서' },
            ]}
          />
          <h2 className="mt-1 text-heading-m font-bold">세금계산서</h2>
          <p className="mt-1.5 text-caption break-keep text-text-secondary">
            수집한 세금계산서를 정산 블록에 연결합니다. 총 {totalElements}건.
          </p>
        </div>

        {/**
         * 직접 등록이 없어 **버튼이 하나뿐**이다 — 입출금은 `CSV 등록`(보조) 옆에
         * `입출금 등록`(주)이 있어 아웃라인이지만, 여기서는 이것이 주 동작이다.
         */}
        <Link
          href={FINANCE_ROUTES.taxInvoiceImport}
          className="btn btn-sm btn-primary shrink-0"
        >
          CSV 수집
        </Link>
      </div>

      <Filters
        query={query}
        projects={projects}
        keywordInput={keywordInput}
        onKeywordChange={setKeywordInput}
        onChange={patchQuery}
      />

      {picked.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-base border border-border-primary bg-blue-bg-soft px-5 py-3">
          <span className="text-caption font-semibold text-text-primary">
            {picked.size}건 선택됨
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exclude(true)}
              className="btn btn-sm btn-gray-outlined"
            >
              연결 대상 제외
            </button>
            <button
              type="button"
              onClick={() => exclude(false)}
              className="btn btn-sm btn-gray-outlined"
            >
              제외 취소
            </button>
            <DeleteButton count={picked.size} onConfirm={remove} />
          </div>
        </div>
      )}

      {/**
       * ⚠️ **첫 조회 중에는 표를 아예 그리지 않는다** (입출금 목록과 같은 판단).
       *    스켈레톤을 깔면 결과가 2건일 때 표가 떴다가 줄어들어 화면이 튄다.
       */}
      {rows === null && !error ? (
        <p className="py-20 text-center text-caption text-text-secondary">
          세금계산서를 불러오는 중입니다.
        </p>
      ) : (
        <DataTable
          caption="세금계산서 목록"
          columns={columns}
          rows={error ? [] : rows}
          rowKey={(row) => row.taxId}
          // 줄 어디를 눌러도 상세로 — 고르는 칸만 `stopRowClick` 으로 뺀다
          onRowClick={(row) =>
            router.push(FINANCE_ROUTES.taxInvoiceDetail(row.taxId))
          }
          dense
          skeletonRows={10}
          rowClassName={(row) => (row.isExcluded ? 'opacity-60' : '')}
          errorMessage={error || undefined}
          onRetry={() => setReloadKey((key) => key + 1)}
          emptyMessage="세금계산서가 없습니다. CSV 로 수집해주세요."
          minWidth={1000}
        />
      )}

      {totalPages > 1 && (
        <Pager
          page={page}
          totalPages={totalPages}
          onChange={(next) => setQuery((prev) => ({ ...prev, page: next }))}
        />
      )}
    </>
  );
}

/**
 * 기간 · 프로젝트 · 미연결 · 검색어.
 *
 * ⚠️ 입출금 필터 바와 **같은 부품 · 같은 높이(`h-9`)** 를 쓴다 — 두 목록을 오가며
 *    쓰는 자리라 칸 크기가 다르면 화면이 어긋나 보인다.
 * ℹ️ 검색어만 폼 제출로 적용한다 — 글자마다 요청을 보내면 목록이 계속 깜빡인다.
 */
function Filters({
  query,
  projects,
  keywordInput,
  onKeywordChange,
  onChange,
}: {
  query: TaxInvoiceListQuery;
  projects: ProjectOption[];
  keywordInput: string;
  onKeywordChange: (value: string) => void;
  onChange: (next: Partial<TaxInvoiceListQuery>) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onChange({ keyword: keywordInput.trim() || undefined });
      }}
      className="mb-4 flex flex-wrap items-center gap-2"
    >
      <DateInput
        label="발행일 시작"
        value={query.startDate ?? ''}
        onChange={(value) => onChange({ startDate: value })}
      />
      <span className="text-caption text-text-muted">~</span>
      <DateInput
        label="발행일 종료"
        value={query.endDate ?? ''}
        onChange={(value) => onChange({ endDate: value })}
      />

      {/* 옵션이 오기 전에는 고를 게 없다 — 빈 셀렉트를 띄우지 않는다 */}
      {projects.length > 0 && (
        <SelectFilter
          label="프로젝트"
          value={query.projectId === undefined ? '' : String(query.projectId)}
          options={projects.map((project) => ({
            value: String(project.projectId),
            label: project.projectName,
          }))}
          placeholder="프로젝트 전체"
          width="w-44"
          onChange={(value) =>
            onChange({ projectId: value ? Number(value) : undefined })
          }
        />
      )}

      {/* 토글은 값이 하나뿐이라 켜면 `true`, 끄면 조건 자체를 뺀다 */}
      <button
        type="button"
        aria-pressed={query.unlinked ?? false}
        onClick={() => onChange({ unlinked: query.unlinked ? undefined : true })}
        className={`h-9 shrink-0 cursor-pointer rounded-lg border px-3 text-caption font-semibold ${
          query.unlinked
            ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
            : 'border-border-default text-text-secondary hover:bg-bg-hover'
        }`}
      >
        미연결만
      </button>

      <div className="relative w-56 shrink-0">
        <label htmlFor="taxInvoiceSearch" className="sr-only">
          상호명 · 승인번호 검색
        </label>
        <input
          id="taxInvoiceSearch"
          type="search"
          value={keywordInput}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="상호명 · 승인번호 검색"
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
    </form>
  );
}

/** 조건 셀렉트. 빈 값은 '전체' 라 조건 자체를 뺀다 (입출금 목록과 같은 모양) */
function SelectFilter({
  label,
  value,
  options,
  placeholder,
  width = 'w-32',
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  width?: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value || undefined)}
        className={`h-9 ${width} cursor-pointer rounded-lg border border-border-default px-2 text-caption text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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

/** 목록 화면끼리 검색바 모양을 다르게 두지 않는다 */
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

/** ⚠️ 삭제는 되돌릴 수 없다 — 한 번 묻는다 */
function DeleteButton({
  count,
  onConfirm,
}: {
  count: number;
  onConfirm: () => void;
}) {
  const [isAsking, setIsAsking] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsAsking(true)}
        className="btn btn-sm btn-danger"
      >
        삭제
      </button>

      {isAsking && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="선택한 세금계산서를 삭제할까요?"
          description={`${count}건이 삭제됩니다. 정산 블록에 연결된 건은 삭제되지 않아요.`}
          confirmLabel="삭제"
          cancelLabel="취소"
          onConfirm={() => {
            setIsAsking(false);
            onConfirm();
          }}
          onCancel={() => setIsAsking(false)}
        />
      )}
    </>
  );
}

/** 서버 페이징 — `page` 는 0부터다 */
function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        disabled={page <= 0}
        onClick={() => onChange(page - 1)}
        className="btn btn-sm btn-gray-outlined"
      >
        이전
      </button>
      <span className="text-caption text-text-secondary">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        className="btn btn-sm btn-gray-outlined"
      >
        다음
      </button>
    </div>
  );
}

function buildColumns(
  picked: Set<number>,
  onToggle: (taxId: number) => void,
): DataTableColumn<TaxInvoiceItem>[] {
  return [
    {
      key: 'pick',
      header: '',
      width: '3rem',
      // ⚠️ 고르는 칸은 상세로 넘어가면 안 된다 — 체크하려다 화면이 바뀐다
      stopRowClick: true,
      cell: (row) => (
        <input
          type="checkbox"
          aria-label={`${row.approvalNo} 선택`}
          checked={picked.has(row.taxId)}
          onChange={() => onToggle(row.taxId)}
          className="size-4 accent-btn-primary"
        />
      ),
    },
    {
      key: 'issuedNo',
      header: '발행일',
      width: '8rem',
      cell: (row) => (
        <span className="block text-text-secondary">
          {formatDate(row.issuedNo) || row.issuedNo || '-'}
        </span>
      ),
    },
    {
      key: 'type',
      header: '구분',
      width: '5rem',
      cell: (row) => (
        <span className={TAX_INVOICE_TYPE_BADGE[row.type] ?? 'badge badge-gray'}>
          {TAX_INVOICE_TYPE_LABELS[row.type] ?? row.type}
        </span>
      ),
    },
    {
      key: 'buyerName',
      header: '공급받는자',
      width: '14rem',
      // 줄 전체가 눌리므로 여기에 링크를 겹치지 않는다
      cell: (row) => (
        <span className="block truncate font-semibold text-text-primary">
          {row.buyerName || '-'}
        </span>
      ),
    },
    {
      key: 'approvalNo',
      header: '승인번호',
      width: '12rem',
      cell: (row) => (
        <span className="block truncate text-text-secondary">
          {row.approvalNo || '-'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: '합계',
      width: '9rem',
      cell: (row) => (
        <span className="block text-right font-semibold text-text-primary">
          {formatAmount(row.totalAmount)}
        </span>
      ),
    },
    {
      key: 'linkStatus',
      header: '연결',
      width: '7rem',
      cell: (row) => (
        <span className={CASH_FLOW_LINK_BADGE[row.linkStatus]}>
          {CASH_FLOW_LINK_STATUS_LABELS[row.linkStatus] ?? row.linkStatus}
        </span>
      ),
    },
    {
      key: 'roundName',
      header: '연결 대상',
      width: '14rem',
      cell: (row) => (
        <span className="block truncate text-text-secondary">
          {/* 제외된 건은 연결 대상이 아니라는 것부터 알려야 한다 */}
          {row.isExcluded
            ? '연결 대상 제외'
            : (row.roundName ?? '-')}
        </span>
      ),
    },
  ];
}
