'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import RowMenu, { type RowMenuItem } from '@/components/RowMenu';
import { DepartmentTableSkeleton } from '@/components/settings/SettingsSkeletons';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

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
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

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
        onSelect: () => setFormTarget({ department }),
      },
      // 2단이 끝이라 하위 부서에는 또 하위를 붙일 수 없다 (DEPT_MAX_DEPTH_EXCEEDED)
      ...(depth === 0
        ? [
            {
              label: '하위 부서 추가',
              onSelect: () => setFormTarget({ parent: department }),
            },
          ]
        : []),
      {
        label: '삭제',
        danger: true,
        onSelect: () => setDeleteTarget(department),
      },
    ];
  }

  const rows = departments ? flatten(departments) : null;

  return (
    <>
      <p className="text-xs text-text-secondary">
        <Link
          href="/settings"
          className="hover:text-text-primary hover:underline"
        >
          설정
        </Link>{' '}
        &gt; 부서 관리
      </p>

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">부서 관리</h2>
          <p className="mt-1.5 text-xs break-keep text-text-secondary">
            조직 구조를 2단까지 관리합니다. 사원이 있거나 하위 부서가 있는
            부서는 삭제할 수 없습니다.
          </p>
        </div>
        {canManage && <AddButton onClick={() => setFormTarget({})} />}
      </div>

      <div className="rounded-xl border border-border-default bg-white">
        {hasFailed ? (
          <Centered>
            <p className="text-xs text-text-secondary">
              부서를 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={reload}
              className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-btn-primary-hover"
            >
              다시 시도
            </button>
          </Centered>
        ) : !rows ? (
          <DepartmentTableSkeleton />
        ) : rows.length === 0 ? (
          <Centered>
            <TreeIcon />
            <p className="text-sm font-bold text-text-primary">
              등록된 부서가 없습니다
            </p>
            <p className="text-xs break-keep text-text-secondary">
              부서를 추가하면 사원 등록 시 선택할 수 있어요
            </p>
            {canManage && (
              <AddButton subtle onClick={() => setFormTarget({})} />
            )}
          </Centered>
        ) : (
          // 목록이 길어지면 이 영역만 스크롤된다
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-border-default text-[11px] text-text-secondary">
                  <th className="px-5 py-3 font-medium">부서명</th>
                  <th className="w-28 px-5 py-3 font-medium">인원</th>
                  <th className="w-32 px-5 py-3 font-medium">소속 사원</th>
                  <th className="w-14 px-5 py-3">
                    <span className="sr-only">관리</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ department, depth }) => (
                  <tr
                    key={department.departmentId}
                    className="border-b border-border-default last:border-b-0"
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={`flex min-w-0 items-center gap-1.5 ${depth === 1 ? 'pl-6' : ''}`}
                      >
                        {depth === 1 && (
                          <span aria-hidden className="text-text-muted">
                            └
                          </span>
                        )}
                        <span
                          className={`truncate text-xs ${
                            depth === 0
                              ? 'font-bold text-text-primary'
                              : 'text-text-secondary'
                          }`}
                        >
                          {department.name}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {/* 하위 포함 인원. 삭제 가능 여부는 직속 인원으로 따로 판단한다 */}
                      {department.totalEmployeeCount > 0 ? (
                        <span className="text-xs text-text-secondary">
                          {department.totalEmployeeCount}명
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">없음</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/settings/employees?departmentId=${department.departmentId}`}
                        className="text-[11px] font-medium text-text-primary-blue hover:underline"
                      >
                        사원 보기
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canManage && (
                        <RowMenu
                          label={department.name}
                          width={120}
                          items={menuItems(department, depth)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formTarget && (
        <DepartmentFormModal
          {...formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={reload}
        />
      )}

      {deleteTarget && (
        <DeleteDepartmentModal
          department={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={reload}
        />
      )}
    </>
  );
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
      className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold ${
        subtle
          ? 'border border-border-default text-text-primary hover:bg-bg-hover'
          : 'bg-btn-primary text-white hover:bg-btn-primary-hover'
      }`}
    >
      + 부서 추가
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-20 text-center">
      {children}
    </div>
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
