'use client';

import { createContext, useCallback, useEffect, useState } from 'react';

import { isAbortError } from '@/lib/api';

import { getMyPages } from './api';
import type { MyPage } from './types';

export type MyPagesStatus = 'loading' | 'ready' | 'failed';

export interface MyPagesValue {
  pages: MyPage[];
  status: MyPagesStatus;
  refetch: () => void;
}

export const MyPagesContext = createContext<MyPagesValue | null>(null);

/**
 * 내 페이지 목록을 한 번만 불러와 사이드바 · 헤더 · 접근 가드가 나눠 쓴다.
 *
 * `CurrentUserProvider` 와 달리 **children 을 막지 않는다** —
 * 이 응답은 메뉴 노출 근거일 뿐이라, 못 불러왔다고 화면 전체를 세울 이유가 없다.
 * 대신 `status` 를 내려 사이드바가 로딩 · 실패를 스스로 표현한다.
 */
export default function MyPagesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pages, setPages] = useState<MyPage[]>([]);
  const [status, setStatus] = useState<MyPagesStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getMyPages(controller.signal)
      .then((next) => {
        setPages(next);
        setStatus('ready');
      })
      .catch((caught) => {
        // 401 · 403 은 `CurrentUserProvider` 가 전역으로 받아 화면을 옮긴다
        if (isAbortError(caught)) return;
        setStatus('failed');
      });

    return () => controller.abort();
  }, [retryCount]);

  /** 로딩 표시는 여기서 켠다 — 이펙트 안에서 켜면 렌더가 한 번 더 돈다 */
  const refetch = useCallback(() => {
    setStatus('loading');
    setRetryCount((count) => count + 1);
  }, []);

  return (
    <MyPagesContext.Provider value={{ pages, status, refetch }}>
      {children}
    </MyPagesContext.Provider>
  );
}
