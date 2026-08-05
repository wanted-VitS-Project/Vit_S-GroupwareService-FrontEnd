'use client';

import { useRouter } from 'next/navigation';
import { createContext, useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';

import { getMe } from './api';
import FirstLoginFlow from './FirstLoginFlow';
import type { CurrentUser } from './types';

/**
 * 로그인 사용자를 한 번만 불러와 사이드바 · 헤더가 나눠 쓴다.
 * 서버 상태 라이브러리 도입 전까지 컨텍스트로 둔다.
 *
 * 불러오기 전에는 children 을 그리지 않는다 —
 * 만료된 쿠키는 프록시를 통과하므로, 확인 전에 그리면 보호 화면이 잠깐 노출된다.
 */
export const CurrentUserContext = createContext<CurrentUser | null>(null);

export default function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isStale = false;

    getMe()
      .then((me) => {
        if (!isStale) setUser(me);
      })
      .catch((caught) => {
        if (isStale) return;

        // 401 = 쿠키는 남았는데 세션이 만료된 경우. 프록시가 못 걸러내므로 여기서 보낸다
        if (caught instanceof ApiError && caught.status === 401) {
          router.replace('/login');
          return;
        }
        // 네트워크 단절 · 서버 오류는 화면을 유지하고 재시도할 수 있게 둔다
        setHasFailed(true);
      });

    return () => {
      isStale = true;
    };
  }, [router, retryCount]);

  /** 다시 불러온다. 재시도와 비밀번호 변경 후 상태 갱신에 함께 쓴다. */
  function refetch() {
    setUser(null);
    setHasFailed(false);
    setRetryCount((count) => count + 1);
  }

  if (hasFailed) {
    return (
      <Centered>
        <p className="text-sm text-slate-500">
          내 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={refetch}
          className="cursor-pointer rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          다시 시도
        </button>
      </Centered>
    );
  }

  if (!user) {
    return (
      <Centered>
        <p className="text-sm text-slate-500">불러오는 중…</p>
      </Centered>
    );
  }

  // 어느 경로로 들어와도 막아야 해서 라우팅이 아니라 여기서 가둔다
  if (user.passwordStatus === 'RESET_REQUIRED') {
    return <FirstLoginFlow onDone={refetch} />;
  }

  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {children}
    </div>
  );
}
