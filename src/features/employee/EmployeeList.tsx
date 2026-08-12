'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Pagination from '@/components/Pagination';
import RowMenu from '@/components/RowMenu';
import { EmployeeTableSkeleton } from '@/components/settings/SettingsSkeletons';
import { EMPLOYEE_STATUS_LABELS, ROLE_LABELS } from '@/constants/status';
import { getDepartments } from '@/features/department/api';
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
  const [departments, setDepartments] = useState<Department[]>([]);
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
      <p className="text-label text-text-secondary">
        <Link
          href="/settings"
          className="hover:text-text-primary hover:underline"
        >
          전사 관리
        </Link>{' '}
        &gt; 사원 관리
      </p>

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-heading-m font-bold">사원 관리</h2>
          <p className="mt-1.5 text-label break-keep text-text-secondary">
            사원 정보와 계정 상태를 관리합니다. 등록하면 로그인 계정이 함께
            발급됩니다.
          </p>
        </div>
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
      </div>

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
          퇴사자 포함
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

      <div className="rounded-base border border-border-default bg-bg-card">
        {hasFailed ? (
          <Centered>
            <p className="text-label text-text-secondary">
              사원을 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={reload}
              className="btn btn-sm btn-primary"
            >
              다시 시도
            </button>
          </Centered>
        ) : !rows || !page ? (
          <EmployeeTableSkeleton rows={20} />
        ) : rows.length === 0 ? (
          <Centered>
            <PeopleIcon />
            <p className="text-body-m font-bold text-text-primary">
              조건에 맞는 사원이 없습니다
            </p>
            <p className="text-label break-keep text-text-secondary">
              검색어나 필터를 바꿔보세요
            </p>
          </Centered>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border-default text-detail text-text-secondary">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAll}
                        aria-label="이 페이지 전체 선택"
                        className="size-3.5 cursor-pointer accent-btn-primary"
                      />
                    </th>
                    <th className="w-44 px-4 py-3 font-medium">이름 · 사번</th>
                    <th className="px-4 py-3 font-medium">부서 · 직급</th>
                    <th className="w-24 px-4 py-3 font-medium">권한</th>
                    <th className="w-56 px-4 py-3 font-medium">이메일</th>
                    <th className="w-24 px-4 py-3 font-medium">상태</th>
                    <th className="w-12 px-3 py-3">
                      <span className="sr-only">관리</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((employee) => (
                    <tr
                      key={employee.userId}
                      onClick={() => openDetail(employee.userId)}
                      className="group cursor-pointer border-b border-border-default last:border-b-0 hover:bg-bg-surface"
                    >
                      {/* 체크박스 · 케밥은 각자의 동작이 있다 — 행 이동으로 새지 않게 막는다 */}
                      <td
                        className="px-3 py-3.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(employee.userId)}
                          onChange={() => toggleOne(employee.userId)}
                          aria-label={`${employee.name} 선택`}
                          className="size-3.5 cursor-pointer accent-btn-primary"
                        />
                      </td>
                      {/*
                        행 클릭과 별개로 링크를 남긴다 — 키보드 이동 · 새 탭 열기가 되어야 한다.
                        전파를 막지 않으면 `Ctrl+클릭` 이 새 탭을 열면서 현재 탭까지 이동시킨다
                      */}
                      <td
                        className="px-4 py-3.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Link
                          href={EMPLOYEE_ROUTES.detail(employee.userId)}
                          className="block min-w-0"
                        >
                          <span className="block truncate text-label font-bold text-text-primary group-hover:underline">
                            {employee.name}
                          </span>
                          <span className="mt-0.5 block truncate text-caption text-text-secondary">
                            {employee.userId}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block truncate text-label text-text-primary">
                          {employee.departmentPath ?? '미지정'}
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-text-secondary">
                          {employee.jobPositionName ?? '직급 없음'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-label text-text-secondary">
                        {ROLE_LABELS[employee.role]}
                      </td>
                      <td className="px-4 py-3.5">
                        {employee.emailRegistered ? (
                          <span className="block truncate text-label text-text-secondary">
                            {employee.email}
                          </span>
                        ) : (
                          <span className="inline-block rounded-button-sm bg-yellow-bg-soft px-1.5 py-0.5 text-caption font-medium text-yellow-text">
                            ⚠ 이메일 미등록 · 로그인 불가
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <EmployeeStatusBadge
                          status={employeeStatusOf(employee)}
                        />
                      </td>
                      <td
                        className="px-3 py-3.5 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <RowMenu
                          label={employee.name}
                          width={130}
                          items={[
                            {
                              label: '상세 보기',
                              onSelect: () =>
                                router.push(
                                  EMPLOYEE_ROUTES.detail(employee.userId),
                                ),
                            },
                            {
                              label: '비밀번호 초기화',
                              onSelect: () => resetModal.open([employee]),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              totalElements={page.totalElements}
              onChange={(next) => applyFilter({ page: String(next) })}
            />
          </>
        )}
      </div>

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
  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="cursor-pointer rounded-lg border border-border-default px-2.5 py-2 text-label text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-20 text-center">
      {children}
    </div>
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
