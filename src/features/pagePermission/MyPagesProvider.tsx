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

        /**
         * 내려온 페이지를 코드 · 이름 · 등급까지 한 줄로 남긴다 (개발 모드, 조회당 1회).
         * `pageCode` 만으로는 어느 화면인지 알 수 없어 — 이름을 봐야 매핑을 정할 수 있다.
         *
         * ⚠️ `console.info` 는 터미널로 전달되지 않고 DevTools 기본 필터에도 걸린다 —
         *    개발 중 눈으로 확인하려는 로그라 `warn` 으로 남긴다.
         */
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[pagePermission] /my/pages →',
            next
              .map(
                (page) =>
                  `${page.pageCode}(${page.name}) ${page.permission}/${page.source}`,
              )
              .join(' · '),
          );
        }
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
