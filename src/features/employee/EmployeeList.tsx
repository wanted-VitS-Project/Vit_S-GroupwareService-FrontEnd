'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Pagination from '@/components/Pagination';
import RowMenu from '@/components/RowMenu';
import { EMPLOYEE_STATUS_LABELS, ROLE_LABELS } from '@/constants/status';
import { getDepartments } from '@/features/department/api';
import type { Department } from '@/features/department/types';

import { getEmployees } from './api';
import EmployeeStatusBadge, { employeeStatusOf } from './EmployeeStatusBadge';
import PasswordResetModal from './PasswordResetModal';
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
/** 2단 트리를 셀렉트용 한 줄 목록으로 편다 */
function toDepartmentOptions(departments: Department[]) {
  return departments.flatMap((department) => [
    { id: department.departmentId, label: department.name },
    ...department.children.map((child) => ({
      id: child.departmentId,
      label: `— ${child.name}`,
    })),
  ]);
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
      departmentId: Number(searchParams.get('departmentId')) || undefined,
      role: (searchParams.get('role') as ManagedRole | null) ?? undefined,
      status:
        (searchParams.get('status') as EmployeeStatusFilter | null) ??
        undefined,
      resigned: searchParams.get('resigned') === 'true' || undefined,
      page: Number(searchParams.get('page')) || 0,
      size: PAGE_SIZE,
    }),
    [searchParams],
  );

  /** 입력 중인 검색어 — 제출해야 URL 에 반영된다 */
  const [keywordInput, setKeywordInput] = useState(query.keyword ?? '');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reloadCount, setReloadCount] = useState(0);
  /** 어떤 요청의 결과인지 `key` 로 들고 있는다 — 조건이 바뀌면 자동으로 로딩 상태가 된다 */
  const [result, setResult] = useState<{
    key: string;
    data?: EmployeePage;
    hasFailed?: boolean;
  } | null>(null);
  /** 체크한 사번. 페이지를 옮기면 비운다 — 안 보이는 대상까지 처리하면 위험하다 */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resetTargets, setResetTargets] = useState<EmployeeSummary[] | null>(
    null,
  );

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

    getDepartments(controller.signal)
      .then(setDepartments)
      .catch(() => {
        // 옵션을 못 받아도 나머지 필터는 쓸 수 있다
      });

    return () => controller.abort();
  }, []);

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

  return (
    <>
      <p className="text-xs text-slate-500">
        <Link href="/settings" className="hover:text-[#1C1F2A] hover:underline">
          설정
        </Link>{' '}
        &gt; 사원 관리
      </p>

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">사원 관리</h2>
          <p className="mt-1.5 text-xs break-keep text-[#6C7389]">
            사원 정보와 계정 상태를 관리합니다. 등록하면 로그인 계정이 함께
            발급됩니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <BulkUploadButton />
          <Link
            href="/settings/employees/new"
            className="shrink-0 rounded-lg bg-[#2B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#22305a]"
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
            className="w-full rounded-lg border border-[#1C1F2A]/10 py-2 pr-10 pl-3 text-xs text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB]"
          />
          <button
            type="submit"
            aria-label="검색"
            className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[#6C7389] hover:bg-[#ECEEF4] hover:text-[#1C1F2A]"
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

        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#6C7389]">
          <input
            type="checkbox"
            checked={query.resigned ?? false}
            onChange={(event) =>
              applyFilter({
                resigned: event.target.checked ? 'true' : undefined,
              })
            }
            className="size-3.5 cursor-pointer accent-[#2B3A67]"
          />
          퇴사자 포함
        </label>
      </form>

      {selected.length > 0 && (
        <div className="mb-2 flex items-center justify-between gap-4 rounded-lg border border-[#3B5BDB]/20 bg-[#3B5BDB]/5 px-4 py-2.5">
          <p className="text-[11px] font-medium text-[#1C1F2A]">
            {selected.length}명 선택됨
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-white"
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={() => setResetTargets(selected)}
              className="cursor-pointer rounded-lg bg-[#2B3A67] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#22305a]"
            >
              비밀번호 초기화
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#1C1F2A]/10 bg-white">
        {hasFailed ? (
          <Centered>
            <p className="text-xs text-[#6C7389]">
              사원을 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={reload}
              className="cursor-pointer rounded-lg bg-[#2B3A67] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#22305a]"
            >
              다시 시도
            </button>
          </Centered>
        ) : !rows || !page ? (
          <Centered>
            <p className="text-xs text-[#6C7389]">불러오는 중…</p>
          </Centered>
        ) : rows.length === 0 ? (
          <Centered>
            <PeopleIcon />
            <p className="text-sm font-bold text-[#1C1F2A]">
              조건에 맞는 사원이 없습니다
            </p>
            <p className="text-xs break-keep text-[#6C7389]">
              검색어나 필터를 바꿔보세요
            </p>
          </Centered>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#1C1F2A]/10 text-[11px] text-[#6C7389]">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAll}
                        aria-label="이 페이지 전체 선택"
                        className="size-3.5 cursor-pointer accent-[#2B3A67]"
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
                      className="border-b border-[#1C1F2A]/5 last:border-b-0"
                    >
                      <td className="px-3 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(employee.userId)}
                          onChange={() => toggleOne(employee.userId)}
                          aria-label={`${employee.name} 선택`}
                          className="size-3.5 cursor-pointer accent-[#2B3A67]"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/settings/employees/${employee.userId}`}
                          className="block min-w-0"
                        >
                          <span className="block truncate text-xs font-bold text-[#1C1F2A] hover:underline">
                            {employee.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-[#6C7389]">
                            {employee.userId}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block truncate text-xs text-[#1C1F2A]">
                          {employee.departmentPath ?? '미지정'}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-[#6C7389]">
                          {employee.jobPositionName ?? '직급 없음'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#6C7389]">
                        {ROLE_LABELS[employee.role]}
                      </td>
                      <td className="px-4 py-3.5">
                        {employee.emailRegistered ? (
                          <span className="block truncate text-xs text-[#6C7389]">
                            {employee.email}
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-[#F59E0B]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#92400E]">
                            ⚠ 이메일 미등록 · 로그인 불가
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <EmployeeStatusBadge
                          status={employeeStatusOf(employee)}
                        />
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <RowMenu
                          label={employee.name}
                          width={130}
                          items={[
                            {
                              label: '상세 보기',
                              onSelect: () =>
                                router.push(
                                  `/settings/employees/${employee.userId}`,
                                ),
                            },
                            {
                              label: '비밀번호 초기화',
                              onSelect: () => setResetTargets([employee]),
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

      {resetTargets && (
        <PasswordResetModal
          targets={resetTargets}
          onClose={() => setResetTargets(null)}
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
        className="cursor-pointer rounded-lg border border-[#1C1F2A]/10 px-2.5 py-2 text-xs text-[#1C1F2A] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB]"
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

/** 엑셀 일괄 등록은 백엔드 준비 중 — 진입점만 두고 안내한다 */
function BulkUploadButton() {
  return (
    <span
      title="백엔드 준비 중입니다"
      className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-[#1C1F2A]/10 px-3 py-2 text-xs font-medium text-[#C7CCD9]"
    >
      일괄 등록
      <span className="rounded bg-[#ECEEF4] px-1.5 py-0.5 text-[10px] text-[#6C7389]">
        준비 중
      </span>
    </span>
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
      className="mb-2 size-10 text-[#C7CCD9]"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20a7 7 0 0 1 14 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 6.5M18 20a5.5 5.5 0 0 0-2-4.2" />
    </svg>
  );
}
