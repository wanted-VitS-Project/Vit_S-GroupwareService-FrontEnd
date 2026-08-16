'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import ProjectListSkeleton from '@/components/project/ProjectListSkeleton';
import { getProjects } from '@/features/project/api';
import ProjectCard from '@/features/project/ProjectCard';
import { PROJECT_ROUTES } from '@/features/project/routes';
import type { ProjectListItem } from '@/features/project/types';

/**
 * 대시보드에 세우는 프로젝트 수.
 *
 * ⭐ **최대 3건**이다 — 목록을 다 보여주는 자리가 아니라 `내 프로젝트` 로 넘어가는 입구다.
 *    서버에 `size=3` 으로 물어 필요 없는 건은 애초에 받지 않는다.
 */
const LIMIT = 3;

/**
 * 대시보드 `내 프로젝트`.
 *
 * 카드는 `내 프로젝트` 화면의 `ProjectCard` 를 **그대로** 쓴다 —
 * 두 화면이 같은 프로젝트를 다른 모양으로 보이면 같은 것으로 읽히지 않는다.
 * (정렬도 목록과 같다 — `created_at DESC` 고정이라 정렬 파라미터가 없다)
 */
export default function DashboardProjects() {
  const [rows, setRows] = useState<ProjectListItem[] | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  /** 몇 번째 시도가 실패했는지 — `다시 시도` 를 누르면 자동으로 실패가 풀린다 */
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const hasFailed = failedAt === reloadCount;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjects({ page: 0, size: LIMIT }, signal)
      .then((page) => setRows(page.content))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setFailedAt(reloadCount);
      });

    return () => controller.abort();
  }, [reloadCount]);

  return (
    <section aria-labelledby="dashboardProjects">
      <div className="mb-3 flex items-end justify-between">
        <h2
          id="dashboardProjects"
          className="text-logo leading-8 font-semibold text-gray-text-soft"
        >
          내 프로젝트
        </h2>

        <Link
          href={PROJECT_ROUTES.list}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[15px] font-semibold text-text-secondary hover:bg-bg-hover"
        >
          전체보기
          <ChevronIcon />
        </Link>
      </div>

      {hasFailed ? (
        <p
          role="alert"
          className="flex items-center justify-center gap-3 rounded-base border border-border-default bg-bg-card py-12 text-[13px] text-text-secondary"
        >
          프로젝트를 불러오지 못했습니다.
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            className="cursor-pointer rounded-lg border border-border-default px-2.5 py-1 text-label font-semibold text-text-primary hover:bg-bg-hover"
          >
            다시 시도
          </button>
        </p>
      ) : rows === null ? (
        <ProjectListSkeleton rows={LIMIT} />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-base border border-border-default bg-bg-card py-12">
          <p className="text-[13px] text-text-secondary">
            참여 중인 프로젝트가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <ProjectCard key={row.projectId} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
