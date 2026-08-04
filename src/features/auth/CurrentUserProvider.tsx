'use client';

import { useRouter } from 'next/navigation';
import { createContext, useEffect, useState } from 'react';

import { getMe } from './api';
import type { CurrentUser } from './types';

/**
 * 로그인 사용자를 한 번만 불러와 사이드바 · 헤더가 나눠 쓴다.
 * 서버 상태 라이브러리 도입 전까지 컨텍스트로 둔다.
 */
export const CurrentUserContext = createContext<CurrentUser | null>(null);

export default function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let isStale = false;

    getMe()
      .then((me) => {
        if (!isStale) setUser(me);
      })
      // 쿠키가 남아 있어도 세션이 만료됐을 수 있다. 미들웨어는 못 걸러내므로 여기서 처리한다
      .catch(() => router.replace('/login'));

    return () => {
      isStale = true;
    };
  }, [router]);

  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  );
}
