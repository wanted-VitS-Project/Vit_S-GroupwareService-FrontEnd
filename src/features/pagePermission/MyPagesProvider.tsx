'use client';

import { createContext, useCallback, useEffect, useState } from 'react';

import { writeShellCookie } from '@/features/auth/shellCache';
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
 * 메뉴 노출 근거일 뿐이라 children 을 막지 않고 status 만 내려준다.
 */
export default function MyPagesProvider({
  children,
  initialPages,
}: {
  children: React.ReactNode;
  /**
   * 서버가 쿠키에서 읽어 넘긴 직전 메뉴.
   * 첫 페인트부터 채워져 있어야 새로고침해도 메뉴가 나타났다 사라지지 않는다.
   */
  initialPages: MyPage[];
}) {
  /** 이번 세션에서 실제로 받아온 결과. failed 는 못 받았다는 뜻이다 */
  const [received, setReceived] = useState<MyPage[] | 'failed' | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const cached = initialPages.length > 0 ? initialPages : null;
  const pages = Array.isArray(received) ? received : (cached ?? []);
  /** 직전 메뉴가 있으면 이미 쓸 수 있는 상태다. 실패 안내로 갈아치우지 않는다 */
  const status: MyPagesStatus = Array.isArray(received)
    ? 'ready'
    : cached
      ? 'ready'
      : received === 'failed'
        ? 'failed'
        : 'loading';

  useEffect(() => {
    const controller = new AbortController();

    getMyPages(controller.signal)
      .then((next) => {
        setReceived(next);
        // 다음 새로고침의 첫 페인트가 이 목록으로 그려진다
        writeShellCookie({ pages: next });

        /**
         * 내려온 페이지를 코드 · 이름 · 등급까지 남긴다 (개발 모드, 조회당 1회).
         * console.info 는 기본 필터에 걸려 warn 으로 남긴다.
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
        // 401 · 403 은 CurrentUserProvider 가 전역으로 받아 화면을 옮긴다
        if (isAbortError(caught)) return;
        setReceived('failed');
      });

    return () => controller.abort();
  }, [retryCount]);

  /** 다시 불러오기. 결과를 비우면 status 가 다시 loading 으로 돌아간다 */
  const refetch = useCallback(() => {
    setReceived(null);
    setRetryCount((count) => count + 1);
  }, []);

  return (
    <MyPagesContext.Provider value={{ pages, status, refetch }}>
      {children}
    </MyPagesContext.Provider>
  );
}
