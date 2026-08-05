'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, FORBIDDEN_EVENT } from '@/lib/api';

import { getMe } from './api';
import AuthGates from './AuthGates';
import { ADMIN_REQUIRED_CODE, GATE_CODES, isGateCode } from './errorCodes';
import type { CurrentUser } from './types';

/**
 * 로그인 사용자를 한 번만 불러와 사이드바 · 헤더가 나눠 쓴다.
 * 서버 상태 라이브러리 도입 전까지 컨텍스트로 둔다.
 *
 * 불러오기 전에는 children 을 그리지 않는다 —
 * 만료된 쿠키는 프록시를 통과하므로, 확인 전에 그리면 보호 화면이 잠깐 노출된다.
 */
export const CurrentUserContext = createContext<CurrentUser | null>(null);

/**
 * 통과해야 하는 게이트. 두 게이트는 독립이다 —
 * 약관만 남은 계정, 비밀번호만 남은 계정(관리자 재설정)이 각각 있다.
 * /me 가 막혔으면 403 의 code 로, 열렸으면 응답 값으로 판단한다.
 */
function gatesOf(blockedBy: string | null, user: CurrentUser | null) {
  const needsTerms = blockedBy
    ? blockedBy === GATE_CODES.terms
    : user?.termsStatus === 'REQUIRED';
  const needsPassword = blockedBy
    ? blockedBy === GATE_CODES.password
    : user?.passwordStatus === 'RESET_REQUIRED';

  return needsTerms || needsPassword ? { needsTerms, needsPassword } : null;
}

export default function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  /** /me 를 막은 게이트 403 의 code. 사용자 정보 없이도 어느 게이트인지 알 수 있다 */
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  /** children 이 그려지는 중인지 — 이벤트 핸들러가 최신 값을 봐야 해서 ref 로 둔다 */
  const hasUser = useRef(false);
  /** 403 으로 이미 재조회한 게이트 코드 — 무한 재요청 방지용 */
  const handledGates = useRef(new Set<string>());

  useEffect(() => {
    let isStale = false;

    getMe()
      .then((me) => {
        if (isStale) return;

        hasUser.current = true;
        // 게이트를 통과했으니 기록을 비운다 —
        // 세션 도중 관리자가 비밀번호를 다시 재설정하면 같은 code 가 또 올 수 있다
        handledGates.current.clear();
        setBlockedBy(null);
        setUser(me);
      })
      .catch((caught) => {
        if (isStale) return;

        hasUser.current = false;

        if (caught instanceof ApiError) {
          // 만료된 쿠키는 프록시를 통과하므로 401 은 여기서 걸러낸다
          if (caught.status === 401) {
            router.replace('/login');
            return;
          }
          // 게이트를 안 넘기면 /me 도 403 으로 막힌다
          if (isGateCode(caught.code)) {
            setBlockedBy(caught.code);
            return;
          }
        }
        // 네트워크 단절 · 서버 오류는 화면을 유지하고 재시도할 수 있게 둔다
        setHasFailed(true);
      });

    return () => {
      isStale = true;
    };
  }, [router, retryCount]);

  /** 재시도와 게이트 통과 후 상태 갱신에 함께 쓴다 */
  const refetch = useCallback(() => {
    hasUser.current = false;
    setUser(null);
    setBlockedBy(null);
    setHasFailed(false);
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    function handleForbidden(event: Event) {
      const code = (event as CustomEvent<string | undefined>).detail;

      // 권한 부족은 다시 불러도 결과가 같다
      if (code === ADMIN_REQUIRED_CODE) {
        router.replace('/forbidden');
        return;
      }

      // /me 가 막힌 경우는 위 catch 가 처리한다. 여기는 children 의 호출만 본다
      if (!hasUser.current || !isGateCode(code)) return;

      // 같은 게이트가 두 번 오면 /me 와 백엔드 판단이 어긋난 상태다.
      // 계속 다시 부르면 무한 재요청이 되므로 한 번만 반응한다
      if (handledGates.current.has(code)) return;

      handledGates.current.add(code);
      refetch();
    }

    window.addEventListener(FORBIDDEN_EVENT, handleForbidden);
    return () => window.removeEventListener(FORBIDDEN_EVENT, handleForbidden);
  }, [router, refetch]);

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

  // 어느 경로로 들어와도 막아야 해서 라우팅이 아니라 여기서 가둔다
  const gates = gatesOf(blockedBy, user);

  if (gates) {
    return <AuthGates {...gates} onDone={refetch} />;
  }

  if (!user) {
    return (
      <Centered>
        <p className="text-sm text-slate-500">불러오는 중…</p>
      </Centered>
    );
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
