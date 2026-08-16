'use client';

import Link from 'next/link';

import Breadcrumb from '@/components/Breadcrumb';
import { useEffect, useState } from 'react';

import DataTable, { type DataTableColumn } from '@/components/DataTable';
import RowMenu, { type RowMenuItem } from '@/components/RowMenu';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { useModalTarget } from '@/lib/useModal';

import { getDepartments } from './api';
import DeleteDepartmentModal from './DeleteDepartmentModal';
import DepartmentFormModal from './DepartmentFormModal';
import type { Department } from './types';

/**
 * 폼 모달 대상. 그대로 모달 props 로 넘긴다.
 * `department` 가 있으면 수정, 없으면 추가 — `parent` 가 있으면 그 아래 하위 부서로 만든다.
 */
type FormTarget = { department?: Department; parent?: Department };

/** 트리를 표 한 줄씩으로 편다. 2단이 끝이라 깊이는 0 · 1 뿐이다 */
function flatten(departments: Department[]) {
  return departments.flatMap((department) => [
    { department, depth: 0 },
    ...department.children.map((child) => ({ department: child, depth: 1 })),
  ]);
}

/**
 * 부서 관리 화면. (.ai/API.md 22~25)
 *
 * 조회는 전체 사용자, 추가 · 수정 · 삭제는 ADMIN 만 할 수 있다.
 * 상위 부서 이동 API 가 없어 메뉴에도 넣지 않는다.
 */
export default function DepartmentList() {
  const { role } = useCurrentUser();
  const canManage = role === 'ADMIN';

  const [reloadCount, setReloadCount] = useState(0);
  /** 어떤 요청의 결과인지 `key` 로 들고 있는다 — 재조회하면 자동으로 로딩 상태가 된다 */
  const [result, setResult] = useState<{
    key: string;
    list?: Department[];
    hasFailed?: boolean;
  } | null>(null);
  const formModal = useModalTarget<FormTarget>();
  const deleteModal = useModalTarget<Department>();

  const requestKey = String(reloadCount);
  const current = result?.key === requestKey ? result : null;
  /** 재조회 중에는 직전 목록을 유지한다 — 표가 통째로 사라지면 스크롤이 튄다 */
  const departments = current?.list ?? result?.list ?? null;
  const hasFailed = current?.hasFailed ?? false;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getDepartments(signal)
      .then((list) => setResult({ key: requestKey, list }))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
      });

    return () => controller.abort();
  }, [requestKey]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  function menuItems(department: Department, depth: number): RowMenuItem[] {
    return [
      {
        label: '부서명 수정',
        onSelect: () => formModal.open({ department }),
      },
      // 2단이 끝이라 하위 부서에는 또 하위를 붙일 수 없다 (DEPT_MAX_DEPTH_EXCEEDED)
      ...(depth === 0
        ? [
            {
              label: '하위 부서 추가',
              onSelect: () => formModal.open({ parent: department }),
            },
          ]
        : []),
      {
        label: '삭제',
        danger: true,
        onSelect: () => deleteModal.open(department),
      },
    ];
  }

  const rows = departments ? flatten(departments) : null;

  return (
    <>
      <Breadcrumb
        items={[
          { label: '전사 관리', href: '/settings' },
          { label: '부서 관리' },
        ]}
      />

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-heading-m font-bold">부서 관리</h2>
          <p className="mt-1.5 text-label break-keep text-text-secondary">
            조직 부서를 관리합니다.
          </p>
        </div>
        {canManage && <AddButton onClick={() => formModal.open({})} />}
      </div>

      <DataTable
        caption="부서 목록"
        columns={departmentColumns(canManage, menuItems)}
        rows={hasFailed ? [] : rows}
        rowKey={({ department }) => department.departmentId}
        // 목록이 길어지면 표 영역만 스크롤된다 (헤더는 `DataTable` 이 고정한다)
        maxHeight="60vh"
        errorMessage={hasFailed ? '부서를 불러오지 못했습니다.' : undefined}
        onRetry={reload}
        emptyState={
          <>
            <TreeIcon />
            <p className="text-body-m font-bold text-text-primary">
              등록된 부서가 없습니다
            </p>
            <p className="text-label break-keep text-text-secondary">
              부서를 추가하면 사원 등록 시 선택할 수 있습니다
            </p>
            {canManage && (
              <AddButton subtle onClick={() => formModal.open({})} />
            )}
          </>
        }
      />

      {formModal.target && (
        <DepartmentFormModal
          {...formModal.target}
          onClose={formModal.close}
          onSaved={reload}
        />
      )}

      {deleteModal.target && (
        <DeleteDepartmentModal
          department={deleteModal.target}
          onClose={deleteModal.close}
          onDeleted={reload}
        />
      )}
    </>
  );
}

/** 2단 트리를 평면 행으로 편 것 — 들여쓰기는 `depth` 로만 표현한다 */
interface DepartmentRow {
  department: Department;
  depth: number;
}

/**
 * 부서 표의 열 정의.
 * 권한(`canManage`)에 따라 관리 열이 붙었다 빠지므로 함수로 만든다.
 */
function departmentColumns(
  canManage: boolean,
  menuItems: (department: Department, depth: number) => RowMenuItem[],
): DataTableColumn<DepartmentRow>[] {
  return [
    {
      key: 'name',
      header: '부서명',
      skeletonWidth: 'w-40',
      /**
       * 하위 부서는 **들여쓰기 + 잇는 선 + 같은 글자색**으로 보인다.
       *
       * 예전에는 들여쓰고 글자를 흐리게(`text-secondary`) 두었는데, 흐린 글자가 비활성으로
       * 읽혀 하위 부서가 눈에 잘 들어오지 않았다. 계층은 **자리**로 말하고 글자는 또렷하게 둔다.
       */
      cell: ({ department, depth }) => (
        <span className="flex min-w-0 items-center gap-2">
          {depth === 1 && (
            <span
              aria-hidden
              className="ml-3 flex h-5 w-4 shrink-0 items-end justify-start"
            >
              <span className="h-3 w-full rounded-bl-[4px] border-b border-l border-border-default" />
            </span>
          )}
          <span
            className={`truncate ${
              depth === 0 ? 'font-bold text-text-primary' : 'text-text-primary'
            }`}
          >
            {department.name}
          </span>
        </span>
      ),
    },
    {
      key: 'count',
      header: '인원',
      width: '7rem',
      skeletonWidth: 'w-12',
      // 하위 포함 인원. 삭제 가능 여부는 직속 인원으로 따로 판단한다
      cell: ({ department }) =>
        department.totalEmployeeCount > 0 ? (
          <span className="text-text-secondary">
            {department.totalEmployeeCount}명
          </span>
        ) : (
          <span className="text-text-muted">없음</span>
        ),
    },
    {
      key: 'employees',
      header: '소속 사원',
      width: '8rem',
      skeletonWidth: 'w-16',
      cell: ({ department }) => (
        <Link
          href={`/settings/employees?departmentId=${department.departmentId}`}
          className="font-medium text-text-primary-blue hover:underline"
        >
          사원 보기
        </Link>
      ),
    },
    {
      key: 'menu',
      header: <span className="sr-only">관리</span>,
      width: '3.5rem',
      align: 'right',
      skeletonWidth: 'w-6',
      cell: ({ department, depth }) =>
        canManage ? (
          <RowMenu
            label={department.name}
            width={120}
            items={menuItems(department, depth)}
          />
        ) : null,
    },
  ];
}

function AddButton({
  subtle,
  onClick,
}: {
  subtle?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 text-label font-semibold ${
        subtle
          ? 'border border-border-default text-text-primary hover:bg-bg-hover'
          : 'bg-btn-primary text-text-white hover:bg-btn-primary-hover'
      }`}
    >
      + 부서 추가
    </button>
  );
}

function TreeIcon() {
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
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </svg>
  );
}
