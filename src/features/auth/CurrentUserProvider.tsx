'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AppShellSkeleton from '@/components/AppShellSkeleton';
import {
  ApiError,
  FORBIDDEN_EVENT,
  UNAUTHORIZED_EVENT,
} from '@/lib/api';

import { getMe } from './api';
import {
  captureAvatarThumbnail,
  clearAvatarThumbnail,
} from './avatarThumbnail';
import type { ShellSnapshot } from './shellCache';
import { toShellUser, writeShellCookie } from './shellCache';
import AuthGates from './AuthGates';
import {
  GATE_CODES,
  isGateCode,
  isPermissionCode,
  isUnauthenticatedCode,
} from './errorCodes';
import type { CurrentUser } from './types';

/**
 * 로그인 사용자를 한 번만 불러와 사이드바 · 헤더가 나눠 쓴다.
 * 세션 확인 전에는 children 을 그리지 않는다.
 */
export const CurrentUserContext = createContext<CurrentUser | null>(null);

/**
 * 세션이 실제로 확인됐는지 여부.
 * 셸은 쿠키의 직전 값으로 먼저 그리되 본문은 확인된 뒤에 그린다.
 */
const SessionConfirmedContext = createContext(false);

/**
 * 권한 부족 403 의 code. 값이 있으면 지금 화면의 본문을 그릴 수 없다.
 * 다른 메뉴로 옮겨갈 수 있도록 화면 전환 대신 본문 자리에서 안내한다.
 */
const PermissionDeniedContext = createContext<string | null>(null);

export function usePermissionDenied() {
  return useContext(PermissionDeniedContext);
}

/**
 * 세션이 확인된 뒤에만 자식을 그린다.
 * 셸은 한 번만 만들어지고 본문만 늦게 채워지도록 셸 전체를 막지 않는다.
 */
export function SessionConfirmedOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  return useContext(SessionConfirmedContext) ? <>{children}</> : null;
}

/**
 * 첫 페인트에 쓸 사진 사본(data URL).
 * 하이드레이션이 어긋나지 않도록 서버가 쿠키에서 읽어 넘긴 값을 나눠 쓴다.
 */
const ShellAvatarContext = createContext<string | null>(null);

export function useShellAvatar() {
  return useContext(ShellAvatarContext);
}

/**
 * 프로필 사진만 갈아끼운다.
 * refetch 는 children 을 통째로 다시 그리므로 여기서 쓰지 않는다.
 */
export const SetProfileImageContext = createContext<
  ((profileImageUrl: string | null) => void) | null
>(null);

/**
 * 통과해야 하는 게이트. 약관 · 비밀번호는 서로 독립이다.
 * /me 가 막혔으면 403 code 로, 열렸으면 응답 값으로 판단한다.
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
  initialShell,
}: {
  children: React.ReactNode;
  /** 서버가 쿠키에서 읽어 넘긴 직전 값. 셸의 겉모습에만 쓴다 */
  initialShell?: ShellSnapshot | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  /** 권한 403 을 받은 화면. 어느 경로에서 받았는지 함께 담는다 */
  const [denied, setDenied] = useState<{
    pathname: string;
    code: string;
  } | null>(null);

  /* 화면을 옮기면 지난 거부를 지운다. 효과 대신 렌더 중에 바로 되돌린다 */
  if (denied !== null && denied.pathname !== pathname) setDenied(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  /** /me 를 막은 게이트 403 의 code */
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  /** children 이 그려지는 중인지. 핸들러가 최신 값을 봐야 해서 ref 로 둔다 */
  const hasUser = useRef(false);
  /** 403 으로 이미 재조회한 게이트 코드. 무한 재요청 방지용 */
  const handledGates = useRef(new Set<string>());

  useEffect(() => {
    let isStale = false;

    getMe()
      .then((me) => {
        if (isStale) return;

        hasUser.current = true;
        // 세션 도중 같은 code 가 다시 올 수 있어 통과 시점에 기록을 비운다
        handledGates.current.clear();
        setBlockedBy(null);
        setUser(me);
        // 다음 새로고침의 첫 페인트가 이 값으로 그려진다
        writeShellCookie({ user: toShellUser(me) });
        // 사진의 축소 사본도 저장한다. 사진이 없으면 사본도 지운다
        if (me.profileImageUrl) {
          // 캔버스가 오염되지 않도록 같은 오리진 경로로 받는다
          captureAvatarThumbnail(
            `/api/avatar/${encodeURIComponent(me.userId)}`,
          );
        } else {
          clearAvatarThumbnail();
        }
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
          // 게이트를 넘기지 못하면 /me 도 403 으로 막힌다
          if (isGateCode(caught.code)) {
            setBlockedBy(caught.code);
            return;
          }
        }
        // 네트워크 · 서버 오류는 화면을 유지하고 재시도할 수 있게 둔다
        setHasFailed(true);
      });

    return () => {
      isStale = true;
    };
  }, [router, retryCount]);

  /** 쿠키의 셸 값으로 채운 임시 사용자. 확인 뒤 실제 값으로 덮인다 */
  const shellUser = useMemo<CurrentUser | null>(() => {
    const cached = initialShell?.user;

    if (!cached) return null;

    return {
      userId: cached.userId,
      name: cached.name,
      role: cached.role,
      // 게이트는 확인된 응답으로만 판단하므로 이 값은 쓰이지 않는다
      termsStatus: 'AGREED',
      passwordStatus: 'NORMAL',
      departmentName: null,
      departmentPath: cached.departmentPath,
      jobPositionName: cached.jobPositionName,
      email: null,
      phone: null,
      hiredAt: null,
      lastLoginAt: null,
      profileImageUrl: cached.profileImageUrl,
    };
  }, [initialShell]);

  const setProfileImage = useCallback((profileImageUrl: string | null) => {
    setUser((current) => (current ? { ...current, profileImageUrl } : current));
  }, []);

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

      // 권한 부족은 재요청해도 같으므로 화면을 옮기지 않고 본문에만 알린다
      if (code !== undefined && isPermissionCode(code)) {
        setDenied({ pathname, code });
        return;
      }

      // /me 가 막힌 경우는 위 catch 가 처리한다. 여기는 children 의 호출만 본다
      if (!hasUser.current || !isGateCode(code)) return;

      // 같은 게이트가 반복되면 무한 재요청이 되므로 한 번만 반응한다
      if (handledGates.current.has(code)) return;

      handledGates.current.add(code);
      refetch();
    }

    window.addEventListener(FORBIDDEN_EVENT, handleForbidden);
    return () => window.removeEventListener(FORBIDDEN_EVENT, handleForbidden);
  }, [pathname, refetch]);

  // 어느 API 에서 401 이 오든 세션이 끊긴 것으로 보고 여기서 함께 처리한다
  useEffect(() => {
    function handleUnauthorized(event: Event) {
      const code = (event as CustomEvent<string | undefined>).detail;

      // 로그인 실패는 로그인 화면이 직접 문구를 띄운다
      if (!isUnauthenticatedCode(code)) return;

      router.replace('/login');
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [router]);

  if (hasFailed) {
    return (
      <Centered>
        <p className="text-body-m text-text-secondary">
          내 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={refetch}
          className="cursor-pointer rounded-lg bg-text-primary px-5 py-2.5 text-body-m font-bold text-text-white transition-colors hover:bg-bg-sidebar-hover"
        >
          다시 시도
        </button>
      </Centered>
    );
  }

  // 어느 경로로 들어와도 막아야 해서 라우팅이 아니라 여기서 처리한다
  const gates = gatesOf(blockedBy, user);

  if (gates) {
    return <AuthGates {...gates} onDone={refetch} />;
  }

  /* 세션 확인 중에는 문구 대신 셸 모양 자리표시를 그린다 */
  /** 확인 전에는 쿠키에 남아 있던 직전 값으로 셸을 그린다 */
  const shownUser = user ?? shellUser;

  if (!shownUser) return <AppShellSkeleton shell={initialShell} />;

  const deniedCode = denied?.code ?? null;

  return (
    <CurrentUserContext.Provider value={shownUser}>
      <SessionConfirmedContext.Provider value={user !== null}>
        <PermissionDeniedContext.Provider value={deniedCode}>
          <SetProfileImageContext.Provider value={setProfileImage}>
            <ShellAvatarContext.Provider value={initialShell?.avatar ?? null}>
              {children}
            </ShellAvatarContext.Provider>
          </SetProfileImageContext.Provider>
        </PermissionDeniedContext.Provider>
      </SessionConfirmedContext.Provider>
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
