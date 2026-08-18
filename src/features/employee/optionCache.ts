'use client';

import type { Department } from '@/features/department/types';
import type { JobPosition } from '@/features/jobPosition/types';

/**
 * 부서 · 직급 목록의 직전 응답. 거의 바뀌지 않아 먼저 깔고 응답이 오면 갈아치운다.
 * 관리 화면에서는 쓰지 않는다. 방금 고친 값이 바로 보여야 한다.
 */

const DEPARTMENT_KEY = 'vitas:departments';
const POSITION_KEY = 'vitas:job-positions';

function read<T>(key: string): T[] | null {
  if (typeof sessionStorage === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T[]) {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장에 실패해도 화면은 그대로 동작한다
  }
}

export const readCachedDepartments = () => read<Department>(DEPARTMENT_KEY);
export const writeCachedDepartments = (list: Department[]) =>
  write(DEPARTMENT_KEY, list);

export const readCachedJobPositions = () => read<JobPosition>(POSITION_KEY);
export const writeCachedJobPositions = (list: JobPosition[]) =>
  write(POSITION_KEY, list);
