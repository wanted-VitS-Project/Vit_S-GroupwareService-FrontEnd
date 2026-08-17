'use client';

// CSR - 대시보드 내 프로젝트: 상위 3건만 조회해 보여주고 전체는 내 프로젝트 화면으로 넘긴다.
import Link from 'next/link';
import { useEffect, useState } from 'react';

import ProjectListHeader from '@/components/project/ProjectListHeader';
import ProjectListSkeleton from '@/components/project/ProjectListSkeleton';
import { getProjects } from '@/features/project/api';
import ProjectCard from '@/features/project/ProjectCard';
import { PROJECT_ROUTES } from '@/features/project/routes';
import type { ProjectListItem } from '@/features/project/types';

// 입구 역할이라 3건까지만 — 서버에 size=3 으로 물어 나머지는 아예 받지 않는다.
const LIMIT = 3;

export default function DashboardProjects() {
  const [rows, setRows] = useState<ProjectListItem[] | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  // 몇 번째 시도가 실패했는지 — 다시 시도를 누르면 reloadCount 가 올라가 실패가 자동으로 풀린다.
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
          className="flex items-center justify-center gap-3 rounded-base border border-border-default bg-bg-card py-12 text-detail text-text-secondary"
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
          <p className="text-detail text-text-secondary">
            참여 중인 프로젝트가 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ProjectListHeader />

          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <ProjectCard key={row.projectId} row={row} />
            ))}
          </ul>
        </div>
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
