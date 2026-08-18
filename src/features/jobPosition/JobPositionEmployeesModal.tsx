'use client';

import { useEffect, useState } from 'react';

import PanelModal from '@/components/PanelModal';
import LoadingSpinner from '@/components/Spinner';
import { isAbortError } from '@/lib/api';

import { getJobPositionEmployees } from './api';
import type { JobPosition, JobPositionEmployee } from './types';

/**
 * 직급별 사원 목록 패널. (.ai/API.md 90)
 *
 * 목록의 `employeeCount` 와 **같은 기준**이다 — 재직자만 세고 시스템 계정 · 퇴사자는
 * 빠진다. 그래서 숫자와 목록 길이가 어긋나지 않는다.
 *
 * ℹ️ 0명이어도 404 가 아니라 빈 배열이라, 없는 직급과 빈 직급을 구분할 수 있다.
 */
export default function JobPositionEmployeesModal({
  position,
  onClose,
}: {
  position: JobPosition;
  onClose: () => void;
}) {
  const [employees, setEmployees] = useState<JobPositionEmployee[] | null>(
    null,
  );
  const [hasFailed, setHasFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getJobPositionEmployees(position.jobPositionId, signal)
      .then((data) => setEmployees(data.content))
      .catch((caught) => {
        // 취소는 실패가 아니다
        if (!isAbortError(caught)) setHasFailed(true);
      });

    return () => controller.abort();
  }, [position.jobPositionId, reloadCount]);

  function reload() {
    setHasFailed(false);
    setEmployees(null);
    setReloadCount((count) => count + 1);
  }

  return (
    <PanelModal title={`${position.name} 사원 목록`} onClose={onClose}>
      <div className="p-5">
        <div className="max-h-[min(60dvh,420px)] overflow-auto rounded-lg border border-border-default">
          {hasFailed ? (
            <Centered>
              <p className="text-detail text-text-secondary">
                사원을 불러오지 못했습니다.
              </p>
              <button
                type="button"
                onClick={reload}
                className="btn btn-sm btn-gray-outlined mt-2"
              >
                다시 시도
              </button>
            </Centered>
          ) : employees === null ? (
            <LoadingSpinner label="사원 목록을 불러오는 중" className="py-16" />
          ) : employees.length === 0 ? (
            <Centered>
              <p className="text-detail break-keep text-text-secondary">
                이 직급인 사원이 없습니다.
              </p>
            </Centered>
          ) : (
            <ul className="divide-y divide-border-default">
              {employees.map((employee) => (
                <li key={employee.userId} className="px-3 py-2.5">
                  <span className="block truncate text-detail font-semibold text-text-primary">
                    {employee.name}
                    <span className="ml-1.5 font-normal text-text-secondary">
                      {employee.userId}
                    </span>
                  </span>
                  <span
                    /* 긴 경로는 잘리므로 전체를 tooltip 으로 남긴다 */
                    title={
                      employee.departmentPath ??
                      employee.departmentName ??
                      '소속 없음'
                    }
                    className="mt-0.5 block truncate text-caption text-text-secondary"
                  >
                    {/* 경로가 있으면 상위 부서까지 보여야 같은 이름의 팀을 가릴 수 있다 */}
                    {employee.departmentPath ??
                      employee.departmentName ??
                      '소속 없음'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PanelModal>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {children}
    </div>
  );
}
