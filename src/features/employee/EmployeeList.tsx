'use client';

import Link from 'next/link';

import Breadcrumb from '@/components/Breadcrumb';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import DataTable from '@/components/DataTable';
import PageTitle from '@/components/PageTitle';
import Pagination, { PaginationPlaceholder } from '@/components/Pagination';
import RowMenu from '@/components/RowMenu';
import { EMPLOYEE_STATUS_LABELS, ROLE_LABELS } from '@/constants/status';
import { getDepartments } from '@/features/department/api';

import { readCachedDepartments, writeCachedDepartments } from './optionCache';
import { toDepartmentOptions } from '@/features/department/options';
import type { Department } from '@/features/department/types';
import { useModal, useModalTarget } from '@/lib/useModal';

import { getEmployees } from './api';
import BulkUploadModal from './BulkUploadModal';
import EmployeeStatusBadge, { employeeStatusOf } from './EmployeeStatusBadge';
import PasswordResetModal from './PasswordResetModal';
import { EMPLOYEE_ROUTES } from './routes';
import type {
  EmployeeListQuery,
  EmployeePage,
  EmployeeSummary,
  EmployeeStatusFilter,
  ManagedRole,
} from './types';

const PAGE_SIZE = 20;

/** 셀렉트 옵션 — 값은 백엔드 enum 그대로 */
const ROLE_OPTIONS: ManagedRole[] = ['MASTER', 'MEMBER'];
const STATUS_OPTIONS: EmployeeStatusFilter[] = [
  'ACTIVE',
  'RESET_REQUIRED',
  'INACTIVE',
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

/**
 * 사원 관리 목록 화면. (ADMIN 전용, .ai/API.md 30)
 *
 * 필터는 URL 쿼리를 원본으로 삼는다 — 부서 관리의 '사원 보기' 로 들어오는 링크와
 * 새로고침 · 뒤로가기를 같은 방식으로 처리할 수 있다.
 */
export default function EmployeeList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** URL 이 필터의 원본이다. 같은 쿼리면 같은 객체를 유지해 효과가 헛돌지 않게 한다 */
  const query = useMemo<EmployeeListQuery>(
    () => ({
      keyword: searchParams.get('keyword') ?? undefined,
      departmentId: pickInt(searchParams.get('departmentId'), 1),
      role: pickOption(searchParams.get('role'), ROLE_OPTIONS),
      status: pickOption(searchParams.get('status'), STATUS_OPTIONS),
      resigned: searchParams.get('resigned') === 'true' || undefined,
      // 백엔드와 같은 0-based. 값이 이상하면 첫 페이지로 본다
      page: pickInt(searchParams.get('page'), 0) ?? 0,
      size: PAGE_SIZE,
    }),
    [searchParams],
  );

  /** 입력 중인 검색어 — 제출해야 URL 에 반영된다 */
  const [keywordInput, setKeywordInput] = useState(query.keyword ?? '');
  /** 입력값을 맞춰 둔 시점의 URL 검색어 — 아래 비교용 */
  const [syncedKeyword, setSyncedKeyword] = useState(query.keyword ?? '');

  // 뒤로가기 · 검색어가 담긴 링크로 들어오면 URL 만 바뀌고 입력값은 옛것이 남는다.
  // 렌더 중에 맞춰 두면 화면에 어긋난 상태가 한 번도 보이지 않는다 (효과로 하면 한 프레임 늦다)
  if (syncedKeyword !== (query.keyword ?? '')) {
    setSyncedKeyword(query.keyword ?? '');
    setKeywordInput(query.keyword ?? '');
  }
  // 직전 값을 먼저 깔아 셀렉트가 빈 채로 떴다 채워지지 않게 한다
  const [departments, setDepartments] = useState<Department[]>(
    () => readCachedDepartments() ?? [],
  );
  const [hasDepartmentFailed, setHasDepartmentFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [departmentReloadCount, setDepartmentReloadCount] = useState(0);
  /** 어떤 요청의 결과인지 `key` 로 들고 있는다 — 조건이 바뀌면 자동으로 로딩 상태가 된다 */
  const [result, setResult] = useState<{
    key: string;
    data?: EmployeePage;
    hasFailed?: boolean;
  } | null>(null);
  /** 체크한 사번. 페이지를 옮기면 비운다 — 안 보이는 대상까지 처리하면 위험하다 */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  /** 여러 명을 한 번에 초기화할 수 있어 대상이 배열이다 */
  const resetModal = useModalTarget<EmployeeSummary[]>();
  const bulkModal = useModal();

  const requestKey = `${reloadCount} ${searchParams.toString()}`;
  const current = result?.key === requestKey ? result : null;
  /** 재조회 중에는 직전 결과를 유지한다 — 표가 통째로 사라지면 스크롤이 튄다 */
  const page = current?.data ?? result?.data ?? null;
  const hasFailed = current?.hasFailed ?? false;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getEmployees(query, signal)
      .then((data) => setResult({ key: requestKey, data }))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
      });

    return () => controller.abort();
  }, [requestKey, query]);

  /** 부서 셀렉트 옵션. 목록과 달리 한 번만 받으면 된다 */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getDepartments(signal)
      .then((list) => {
        setDepartments(list);
        writeCachedDepartments(list);
        setHasDepartmentFailed(false);
      })
      .catch(() => {
        // 옵션이 없으면 부서 필터를 못 쓰므로 알려주고 다시 받을 길을 준다
        if (!signal.aborted) setHasDepartmentFailed(true);
      });

    return () => controller.abort();
  }, [departmentReloadCount]);

  /** 필터를 바꾸면 첫 페이지로 돌아간다 — 3페이지에서 조건을 바꾸면 빈 화면이 된다 */
  function applyFilter(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in patch)) next.delete('page');

    setSelectedIds([]);
    router.replace(next.toString() ? `?${next}` : '?');
  }

  const employees = page?.content ?? null;
  /** DB 콜레이션이 가나다 순이 아니라 화면에서 정렬한다 (지금 페이지 안에서만) */
  const rows = employees
    ? [...employees].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    : null;

  const selected =
    rows?.filter((row) => selectedIds.includes(row.userId)) ?? [];
  const isAllSelected =
    rows !== null && rows.length > 0 && selected.length === rows.length;

  function toggleAll() {
    if (!rows) return;
    setSelectedIds(isAllSelected ? [] : rows.map((row) => row.userId));
  }

  function toggleOne(userId: string) {
    setSelectedIds((ids) =>
      ids.includes(userId)
        ? ids.filter((id) => id !== userId)
        : [...ids, userId],
    );
  }

  function reload() {
    setReloadCount((count) => count + 1);
  }

  /**
   * 행 아무 곳이나 눌러도 상세로 간다.
   * 이메일을 드래그해 복사하는 중이면 이동하지 않는다 — 놓는 순간 화면이 바뀌면 곤란하다.
   */
  function openDetail(userId: string) {
    if (window.getSelection()?.toString()) return;
    router.push(EMPLOYEE_ROUTES.detail(userId));
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: '전사 관리', href: '/settings' },
          { label: '사원 관리' },
        ]}
      />

      <PageTitle
        title="사원 관리"
        description="사원 정보와 계정 상태를 관리합니다. 등록하면 로그인 계정이 함께 발급됩니다."
      >
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={bulkModal.open}
            className="btn btn-md btn-gray-outlined shrink-0"
          >
            일괄 등록
          </button>
          <Link
            href={EMPLOYEE_ROUTES.create}
            className="btn btn-md btn-primary shrink-0"
          >
            + 사원 등록
          </Link>
        </div>
      </PageTitle>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilter({ keyword: keywordInput.trim() || undefined });
        }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <div className="relative w-64">
          <label htmlFor="employeeSearch" className="sr-only">
            사원 검색
          </label>
          <input
            id="employeeSearch"
            type="search"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="이름 · 사번 검색"
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

        <FilterSelect
          label="부서"
          value={query.departmentId ? String(query.departmentId) : ''}
          onChange={(value) => applyFilter({ departmentId: value })}
          options={toDepartmentOptions(departments).map((option) => ({
            value: String(option.id),
            label: option.label,
          }))}
        />
        <FilterSelect
          label="권한"
          value={query.role ?? ''}
          onChange={(value) => applyFilter({ role: value })}
          options={ROLE_OPTIONS.map((role) => ({
            value: role,
            label: ROLE_LABELS[role],
          }))}
        />
        <FilterSelect
          label="상태"
          value={query.status ?? ''}
          onChange={(value) => applyFilter({ status: value })}
          options={STATUS_OPTIONS.map((status) => ({
            value: status,
            label: EMPLOYEE_STATUS_LABELS[status],
          }))}
        />

        <label className="flex cursor-pointer items-center gap-1.5 text-detail text-text-secondary">
          <input
            type="checkbox"
            checked={query.resigned ?? false}
            onChange={(event) =>
              applyFilter({
                resigned: event.target.checked ? 'true' : undefined,
              })
            }
            className="size-3.5 cursor-pointer accent-btn-primary"
          />
          {/*
            `퇴사자 포함` 은 재직자까지 함께 나오는 것처럼 읽혔다 —
            실제 동작(퇴사자만 조회)을 그대로 적는다.
          */}
          퇴사자만 조회
        </label>

        {hasDepartmentFailed && (
          <span role="alert" className="text-caption text-text-danger">
            부서 목록을 불러오지 못했습니다.{' '}
            <button
              type="button"
              onClick={() => setDepartmentReloadCount((count) => count + 1)}
              className="cursor-pointer font-semibold underline"
            >
              다시 시도
            </button>
          </span>
        )}
      </form>

      {selected.length > 0 && (
        <div className="mb-2 flex items-center justify-between gap-4 rounded-lg border border-border-primary/20 bg-blue-bg-soft px-4 py-2.5">
          <p className="text-detail font-medium text-text-primary">
            {selected.length}명 선택됨
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-card"
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={() => resetModal.open(selected)}
              className="btn btn-sm btn-primary"
            >
              비밀번호 초기화
            </button>
          </div>
        </div>
      )}

      <DataTable
        caption="사원 목록"
        loadingLabel="사원을 불러오는 중"
        columns={[
          {
            key: 'select',
            header: (
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleAll}
                aria-label="이 페이지 전체 선택"
                className="size-3.5 cursor-pointer accent-btn-primary"
              />
            ),
            width: '5%',
            skeletonWidth: 'w-4',
            // 체크박스는 그 자체가 동작이라 행 이동으로 새면 안 된다
            stopRowClick: true,
            cell: (employee) => (
              <input
                type="checkbox"
                checked={selectedIds.includes(employee.userId)}
                onChange={() => toggleOne(employee.userId)}
                aria-label={`${employee.name} 선택`}
                className="size-3.5 cursor-pointer accent-btn-primary"
              />
            ),
          },
          {
            key: 'name',
            header: '이름 · 사번',
            width: '22%',
            skeletonWidth: 'w-24',
            /*
              행 클릭과 별개로 링크를 남긴다 — 키보드 이동 · 새 탭 열기가 되어야 한다.
              전파를 막지 않으면 `Ctrl+클릭` 이 새 탭을 열면서 현재 탭까지 이동시킨다
            */
            stopRowClick: true,
            cell: (employee) => (
              <Link
                href={EMPLOYEE_ROUTES.detail(employee.userId)}
                className="block min-w-0"
              >
                <span className="block truncate font-bold text-text-primary group-hover:underline">
                  {employee.name}
                </span>
                <span className="mt-0.5 block truncate text-caption text-text-secondary">
                  {employee.userId}
                </span>
              </Link>
            ),
          },
          {
            key: 'department',
            header: '부서 · 직급',
            width: '20%',
            skeletonWidth: 'w-40',
            cell: (employee) => (
              <>
                <span className="block truncate text-text-primary">
                  {employee.departmentPath ?? '미지정'}
                </span>
                <span className="mt-0.5 block truncate text-caption text-text-secondary">
                  {employee.jobPositionName ?? '직급 없음'}
                </span>
              </>
            ),
          },
          {
            key: 'role',
            header: '권한',
            width: '11%',
            skeletonWidth: 'w-14',
            cell: (employee) => (
              <span className="text-text-secondary">
                {ROLE_LABELS[employee.role]}
              </span>
            ),
          },
          {
            key: 'email',
            header: '이메일',
            width: '25%',
            skeletonWidth: 'w-40',
            cell: (employee) =>
              employee.emailRegistered ? (
                <span className="block truncate text-text-secondary">
                  {employee.email}
                </span>
              ) : (
                <span className="tag tag-yellow">
                  ⚠ 이메일 미등록 · 로그인 불가
                </span>
              ),
          },
          {
            key: 'status',
            header: '상태',
            width: '11%',
            skeletonWidth: 'w-12',
            cell: (employee) => (
              <EmployeeStatusBadge status={employeeStatusOf(employee)} />
            ),
          },
          {
            key: 'menu',
            header: <span className="sr-only">관리</span>,
            width: '6%',
            align: 'right',
            skeletonWidth: 'w-6',
            stopRowClick: true,
            cell: (employee) => (
              <RowMenu
                label={employee.name}
                width={130}
                items={[
                  {
                    label: '상세 보기',
                    onSelect: () =>
                      router.push(EMPLOYEE_ROUTES.detail(employee.userId)),
                  },
                  {
                    label: '비밀번호 초기화',
                    onSelect: () => resetModal.open([employee]),
                  },
                ]}
              />
            ),
          },
        ]}
        rows={hasFailed ? [] : rows}
        rowKey={(employee) => employee.userId}
        // 열이 7개라 좁은 화면에서만 표가 가로로 흐른다
        dense
        skeletonRows={PAGE_SIZE}
        errorMessage={hasFailed ? '사원을 불러오지 못했습니다.' : undefined}
        onRetry={reload}
        onRowClick={(employee) => openDetail(employee.userId)}
        emptyState={
          <>
            <PeopleIcon />
            <p className="text-body-m font-bold text-text-primary">
              조건에 맞는 사원이 없습니다
            </p>
            <p className="text-label break-keep text-text-secondary">
              검색어나 필터를 바꿔주세요
            </p>
          </>
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
            page={page.page}
            totalPages={page.totalPages}
            onChange={(next) => applyFilter({ page: String(next) })}
          />
        </div>
      )}

      {bulkModal.isOpen && (
        <BulkUploadModal
          onClose={bulkModal.close}
          // 일부만 등록돼도 목록은 달라진다 — 모달을 닫기 전에 갱신해 둔다
          onRegistered={reload}
        />
      )}

      {resetModal.target && (
        <PasswordResetModal
          targets={resetModal.target}
          onClose={resetModal.close}
          onDone={() => {
            setSelectedIds([]);
            reload();
          }}
        />
      )}
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value?: string) => void;
  options: { value: string; label: string }[];
}) {
  /* 폭을 고정한다 — 선택지가 늦게 오면 칸이 넓어졌다 좁아져 필터바가 흔들린다 */
  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="w-36 shrink-0 cursor-pointer rounded-lg border border-border-default px-2.5 py-2 text-label text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary sm:w-40"
      >
        <option value="">{label} 전체</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

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

function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mb-2 size-10 text-text-muted"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20a7 7 0 0 1 14 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 6.5M18 20a5.5 5.5 0 0 0-2-4.2" />
    </svg>
  );
}
