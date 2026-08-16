'use client';

import type { BusinessCategory } from './types';

/**
 * 사업 카테고리 목록의 **직전 응답**.
 *
 * ⭐ 왜 두는가 — 카테고리는 전사 설정이라 하루에도 거의 바뀌지 않는데, 화면을 열 때마다
 *    새로 받느라 `불러오는 중` 이 잠깐 떴다가 칩이 채워졌다. 직전 값을 먼저 그려 두고
 *    응답이 오면 조용히 갈아치우면 기다리는 구간이 보이지 않는다.
 *
 * ⚠️ 카테고리를 **관리하는 화면**(전사 관리 → 사업 카테고리)에서는 쓰지 않는다 —
 *    방금 고친 값이 곧바로 보여야 하는 자리라 캐시가 오히려 방해가 된다.
 * ⚠️ 탭이 살아 있는 동안만 남는다(`sessionStorage`). 삭제된 카테고리가 잠깐 남을 수 있으나,
 *    고르면 서버가 404 로 막고 응답이 도착하면 목록에서 사라진다.
 */

const CACHE_KEY = 'vitas:business-categories';

export function readCachedCategories(): BusinessCategory[] | null {
  if (typeof sessionStorage === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as BusinessCategory[])
      : null;
  } catch {
    // 저장소를 못 쓰거나 형식이 깨진 경우 — 캐시 없이 간다
    return null;
  }
}

export function writeCachedCategories(categories: BusinessCategory[]) {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(categories));
  } catch {
    // 저장에 실패해도 화면은 그대로 동작한다
  }
}
