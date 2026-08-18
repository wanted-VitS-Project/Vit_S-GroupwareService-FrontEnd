'use client';

import type { BusinessCategory } from './types';

/**
 * 사업 카테고리 목록의 직전 응답. 거의 바뀌지 않아 먼저 그려 두고 응답이 오면 갈아치운다.
 * 관리 화면에서는 쓰지 않는다. 방금 고친 값이 곧바로 보여야 한다.
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
    // 저장소를 못 쓰거나 형식이 깨진 경우. 캐시 없이 간다
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
