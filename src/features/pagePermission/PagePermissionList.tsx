'use client';

import Breadcrumb from '@/components/Breadcrumb';
import { useEffect, useState } from 'react';

import DataTable from '@/components/DataTable';
import RowMenu from '@/components/RowMenu';
import { ROLE_LABELS } from '@/constants/status';

import { getPageAccessors, getPages } from './api';
import {
  NOT_REVOCABLE_REASON,
  PERMISSION_BADGE,
  PERMISSION_LABEL,
  SOURCE_LABEL,
} from './display';
import GrantPermissionModal from './GrantPermissionModal';
import RevokePermissionModal from './RevokePermissionModal';
import type { PageAccessor, PageAccessorList, PageSummary } from './types';

/**
 * 페이지 권한 관리 화면. (ADMIN 전용, .ai/API.md 99~102)
 *
 * 부여 대상은 `BIDDING` · `FINANCE` 둘뿐이라 목록을 따로 두지 않고 탭으로 고른다.
 * 표에는 **명시 부여자 + 전역 권한 열람자**가 함께 나온다 —
 * "3명 줬는데 왜 5명이 보나" 를 화면에서 미리 답하기 위해서다.
 */
export default function PagePermissionList() {
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [hasPagesFailed, setHasPagesFailed] = useState(false);
  const [pagesReload, setPagesReload] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const [accessorReload, setAccessorReload] = useState(0);
  /**
   * 어떤 요청의 결과인지 `key` 로 들고 있는다 —
   * 페이지를 바꾸거나 재조회하면 키가 어긋나 **자동으로 로딩 상태**가 된다.
   * (이펙트 안에서 `setState(null)` 로 비우면 렌더가 한 번 더 돈다)
   */
  const [accessorResult, setAccessorResult] = useState<{
    key: string;
    data?: PageAccessorList;
    hasFailed?: boolean;
  } | null>(null);

  /** 부여 결과 요약 — 표만 갱신되면 뭐가 바뀌었는지 알 수 없다 */
  const [notice, setNotice] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [editTarget, setEditTarget] = useState<PageAccessor | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PageAccessor | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getPages(signal)
      .then((list) => {
        setPages(list);
        setHasPagesFailed(false);
        // 첫 페이지를 자동으로 연다 — 탭이 둘뿐이라 한 번 더 고르게 할 이유가 없다
        setSelectedCode((current) => current ?? list[0]?.pageCode ?? null);
      })
      .catch(() => {
        if (!signal.aborted) setHasPagesFailed(true);
      });

    return () => controller.abort();
  }, [pagesReload]);

  const requestKey = `${selectedCode}:${accessorReload}`;
  const currentAccessors =
    accessorResult?.key === requestKey ? accessorResult : null;
  /**
   * 부여 · 회수 뒤 재조회에서는 **직전 목록을 그대로 둔다** —
   * 스켈레톤으로 되돌리면 표 높이가 확 줄었다 늘면서 화면이 출렁인다.
   * 다른 페이지 탭으로 옮길 때는 남의 목록이라 비운다 (앞부분 키가 다르다).
   */
  const staleAccessors = accessorResult?.key.startsWith(`${selectedCode}:`)
    ? accessorResult.data
    : undefined;
  const accessors = currentAccessors?.data ?? staleAccessors ?? null;
  const hasAccessorsFailed = currentAccessors?.hasFailed ?? false;

  useEffect(() => {
    if (!selectedCode) return;

    const controller = new AbortController();
    const { signal } = controller;

    getPageAccessors(selectedCode, signal)
      .then((data) => setAccessorResult({ key: requestKey, data }))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) {
          setAccessorResult({ key: requestKey, hasFailed: true });
        }
      });

    return () => controller.abort();
  }, [selectedCode, requestKey]);

  const selectedPage = pages?.find((page) => page.pageCode === selectedCode);

  /** 부여 · 회수 뒤에는 집계(`accessCount`)도 바뀐다 — 탭 숫자까지 함께 갱신한다 */
  function reload() {
    setPagesReload((count) => count + 1);
    setAccessorReload((count) => count + 1);
  }

  function selectPage(pageCode: string) {
    setSelectedCode(pageCode);
    setNotice('');
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: '전사 관리', href: '/settings' },
          { label: '페이지 권한' },
        ]}
      />

      <div className="mt-2 mb-6">
        <h2 className="text-heading-m font-bold">페이지 권한</h2>
        <p className="mt-1.5 text-label break-keep text-text-secondary">
          페이지별 접근 권한을 사원에게 부여합니다. 관리자 권한으로 열람하는
          사원은 회수할 수 없습니다.
        </p>
      </div>

      {hasPagesFailed ? (
        <Centered>
          <p className="text-label text-text-secondary">
            페이지 목록을 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={() => setPagesReload((count) => count + 1)}
            className="btn btn-sm btn-primary"
          >
            다시 시도
          </button>
        </Centered>
      ) : !pages ? (
        <TabsSkeleton />
      ) : pages.length === 0 ? (
        <Centered>
          <p className="text-body-m font-bold text-text-primary">
            부여할 수 있는 페이지가 없습니다
          </p>
          <p className="text-label break-keep text-text-secondary">
            페이지 카탈로그는 개발자가 코드로 제공합니다
          </p>
        </Centered>
      ) : (
        <>
          {/* 탭 — 부여 대상이 둘뿐이라 목록 화면을 따로 두지 않는다 */}
          <div
            role="tablist"
            aria-label="페이지 선택"
            className="mb-4 flex gap-2"
          >
            {pages.map((page) => {
              const isSelected = page.pageCode === selectedCode;

              return (
                <button
                  key={page.pageCode}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => selectPage(page.pageCode)}
                  className={`btn btn-md ${
                    isSelected ? 'btn-primary' : 'btn-gray-outlined'
                  }`}
                >
                  {page.name}
                  <span
                    className={`text-label ${
                      isSelected ? 'text-text-white/80' : 'text-text-secondary'
                    }`}
                  >
                    {page.accessCount}명
                  </span>
                </button>
              );
            })}
          </div>

          {selectedPage && (
            <div className="mb-4 flex items-start justify-between gap-4 rounded-base border border-border-default bg-bg-card px-5 py-4">
              <div className="min-w-0">
                <p className="text-label font-bold text-text-primary">
                  {selectedPage.name}
                </p>
                {selectedPage.description && (
                  <p className="mt-1 text-label break-keep text-text-secondary">
                    {selectedPage.description}
                  </p>
                )}
                <p className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="tag tag-blue">
                    명시 부여 {selectedPage.grantedCount}명
                  </span>
                  <span className="tag tag-gray">
                    전역 권한 {selectedPage.globalRoleCount}명
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGranting(true)}
                className="btn btn-md btn-primary shrink-0"
              >
                + 권한 부여
              </button>
            </div>
          )}

          <p
            role="status"
            className="mb-2 text-detail break-keep text-text-primary-blue empty:hidden"
          >
            {notice}
          </p>

          {/*
            `overflow-hidden` 이 없으면 안쪽 표의 **각진 흰 배경**(sticky thead 포함)이
            둥근 모서리 위로 그대로 튀어나온다 — 모서리를 여기서 잘라낸다.
          */}
          <div className="overflow-hidden rounded-base border border-border-default bg-bg-card">
            <DataTable
              caption="접근 가능자 목록"
              columns={[
                {
                  key: 'name',
                  header: '이름 · 사번',
                  width: '11rem',
                  skeletonWidth: 'w-24',
                  cell: (accessor) => (
                    <>
                      <span className="block truncate font-bold text-text-primary">
                        {accessor.name}
                      </span>
                      <span className="mt-0.5 block truncate text-caption text-text-secondary">
                        {accessor.userId}
                      </span>
                    </>
                  ),
                },
                {
                  key: 'department',
                  header: '부서 · 직급',
                  skeletonWidth: 'w-40',
                  cell: (accessor) => (
                    <span className="block truncate text-text-secondary">
                      {[accessor.departmentPath, accessor.jobPositionName]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  ),
                },
                {
                  key: 'role',
                  header: '전역 권한',
                  width: '7rem',
                  skeletonWidth: 'w-16',
                  // 원값(`MASTER`)이 아니라 화면 이름으로 보여준다
                  cell: (accessor) => (
                    <span className="text-text-secondary">
                      {ROLE_LABELS[accessor.role]}
                    </span>
                  ),
                },
                {
                  key: 'permission',
                  header: '등급',
                  width: '6rem',
                  skeletonWidth: 'w-12',
                  cell: (accessor) => (
                    <span
                      className={`badge ${PERMISSION_BADGE[accessor.permission]}`}
                    >
                      {PERMISSION_LABEL[accessor.permission]}
                    </span>
                  ),
                },
                {
                  key: 'source',
                  header: '권한 출처',
                  width: '8rem',
                  skeletonWidth: 'w-20',
                  /*
                    한 줄로 둔다 — 배지 · 태그를 또 얹으면 옆 `등급` 배지와 싸운다.
                    회수할 수 없는 권한만 자물쇠를 달아 케밥에 회수가 없는 이유를 알린다.
                  */
                  cell: (accessor) => (
                    <span
                      title={NOT_REVOCABLE_REASON[accessor.source] || undefined}
                      className={`flex items-center gap-1 whitespace-nowrap ${
                        accessor.revocable
                          ? 'text-text-primary'
                          : 'text-text-muted'
                      }`}
                    >
                      {!accessor.revocable && <LockMarkIcon />}
                      {SOURCE_LABEL[accessor.source]}
                    </span>
                  ),
                },
                {
                  key: 'menu',
                  header: <span className="sr-only">관리</span>,
                  width: '3.5rem',
                  align: 'right',
                  skeletonWidth: 'w-6',
                  /*
                    전역 권한 사용자도 **등급은 줄 수 있다** (부여 API 는 ADMIN 만 막는다).
                    회수만 빠지므로 케밥 자체를 없애지 않는다 — 없애면 누를 것이 사라진다.
                  */
                  cell: (accessor) =>
                    accessor.source === 'ADMIN_ONLY' ? null : (
                      <RowMenu
                        label={accessor.name}
                        items={[
                          {
                            label: '등급 변경',
                            onSelect: () => setEditTarget(accessor),
                          },
                          ...(accessor.revocable
                            ? [
                                {
                                  label: '권한 회수',
                                  danger: true,
                                  onSelect: () => setRevokeTarget(accessor),
                                },
                              ]
                            : []),
                        ]}
                      />
                    ),
                },
              ]}
              rows={hasAccessorsFailed ? [] : (accessors?.content ?? null)}
              rowKey={(accessor) => accessor.userId}
              maxHeight="60vh"
              errorMessage={
                hasAccessorsFailed
                  ? '접근 가능자를 불러오지 못했습니다.'
                  : undefined
              }
              onRetry={() => setAccessorReload((count) => count + 1)}
              emptyState={
                <>
                  <LockIcon />
                  <p className="text-body-m font-bold text-text-primary">
                    접근 가능한 사원이 없습니다
                  </p>
                  <p className="text-label break-keep text-text-secondary">
                    권한을 부여하면 이 페이지의 메뉴로 들어갈 수 있어요
                  </p>
                </>
              }
            />
          </div>
        </>
      )}

      {selectedPage && (isGranting || editTarget) && (
        <GrantPermissionModal
          page={selectedPage}
          target={editTarget ?? undefined}
          accessorIds={accessors?.content.map((item) => item.userId) ?? []}
          onClose={() => {
            setIsGranting(false);
            setEditTarget(null);
          }}
          onGranted={(summary) => {
            setNotice(summary);
            reload();
          }}
        />
      )}

      {selectedPage && revokeTarget && (
        <RevokePermissionModal
          page={selectedPage}
          accessor={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onRevoked={() => {
            setNotice(`${revokeTarget.name} 님의 권한을 회수했습니다.`);
            reload();
          }}
        />
      )}
    </>
  );
}

function TabsSkeleton() {
  return (
    <div aria-hidden className="mb-4 flex gap-2">
      {[0, 1].map((index) => (
        <span
          key={index}
          className="block h-8.5 w-28 animate-pulse rounded-button-md bg-bg-hover"
        />
      ))}
    </div>
  );
}

/** 회수할 수 없는 권한 표시 — 글자 옆에 붙는 작은 자물쇠 */
function LockMarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3 shrink-0"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-20 text-center">
      {children}
    </div>
  );
}

function LockIcon() {
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
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
