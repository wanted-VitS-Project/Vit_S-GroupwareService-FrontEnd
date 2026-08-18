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
 * 서버 상태 라이브러리 도입 전까지 컨텍스트로 둔다.
 *
 * 불러오기 전에는 children 을 그리지 않는다 —
 * 만료된 쿠키는 프록시를 통과하므로, 확인 전에 그리면 보호 화면이 잠깐 노출된다.
 */
export const CurrentUserContext = createContext<CurrentUser | null>(null);

/**
 * 세션이 **실제로 확인됐는지**. 쿠키에 남아 있던 직전 값으로 셸을 그리는 동안은 `false` 다.
 *
 * 셸(사이드바 · 헤더)은 직전 값으로 먼저 그리되, 본문은 이 값이 `true` 가 될 때까지
 * 그리지 않는다 — 만료된 쿠키도 프록시를 통과하므로 확인 전에 그리면 보호 화면이
 * 잠깐 노출된다.
 */
const SessionConfirmedContext = createContext(false);

/**
 * 권한 부족 403 의 `code`. 값이 있으면 지금 화면의 본문을 그릴 수 없다.
 *
 * ⚠️ `/forbidden` 으로 보내지 않는다 — 그 경로는 셸이 벗겨져 사이드바까지 사라진다.
 *    본문 자리(`PageAccessGate`)에서 그려 다른 메뉴로 옮겨갈 수 있게 한다.
 */
const PermissionDeniedContext = createContext<string | null>(null);

export function usePermissionDenied() {
  return useContext(PermissionDeniedContext);
}

/**
 * 세션이 확인된 뒤에만 자식을 그린다.
 *
 * ⚠️ 셸 전체를 막지 않는 것이 요점이다 — 예전에는 확인될 때까지 셸을 통째로 자리표시로
 *    그렸다가 확인되면 **다시 만들어**, 사이드바 · 헤더가 두 번 그려지며 깜빡였다.
 *    이제 셸은 한 번만 만들어지고 본문만 늦게 채워진다.
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
 *
 * ⚠️ 화면에서 `document.cookie` 를 **직접 읽지 않는다** — 셸(사이드바 · 헤더)은 서버에서도
 *    그려지는데 그쪽엔 `document` 가 없어 사본이 늘 `null` 이 된다. 브라우저는 값을 읽으니
 *    첫 렌더 결과가 서버 HTML 과 어긋나 하이드레이션이 깨졌다 (2026-08-18).
 *    서버가 쿠키에서 읽어 넘긴 값 하나를 여기서 나눠 쓴다.
 */
const ShellAvatarContext = createContext<string | null>(null);

export function useShellAvatar() {
  return useContext(ShellAvatarContext);
}

/**
 * 프로필 사진만 갈아끼운다.
 *
 * ⚠️ `refetch` 를 쓰면 안 된다 — 그쪽은 `user` 를 `null` 로 돌려 **children 을 통째로
 *    내렸다가 다시 그린다**. 사진 한 장 바꾸는데 앱 전체가 `불러오는 중…` 으로 깜빡인다.
 */
export const SetProfileImageContext = createContext<
  ((profileImageUrl: string | null) => void) | null
>(null);

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
  initialShell,
}: {
  children: React.ReactNode;
  /**
   * 서버가 쿠키에서 읽어 넘긴 직전 값. **셸의 겉모습에만** 쓴다.
   *
   * ⚠️ 이것으로 children 을 열지는 않는다 — 만료된 쿠키도 프록시를 통과하므로,
   *    확인 전에 본문을 그리면 보호 화면이 잠깐 노출된다.
   */
  initialShell?: ShellSnapshot | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  /** 권한 403 을 받은 화면. 어느 화면에서 받았는지를 함께 담는다 */
  const [denied, setDenied] = useState<{
    pathname: string;
    code: string;
  } | null>(null);

  /*
    화면을 옮기면 **지운다.** 가리기만 하면 A → B → A 로 돌아왔을 때 지난 거부가
    되살아나고, 본문이 막혀 있어 그것을 풀 요청조차 나가지 않는다 — 권한을 새로 받아도
    새로고침 전까지 영영 막힌 화면이 된다.
    ℹ️ 효과가 아니라 **렌더 중에 되돌린다** — 한 번 더 그리는 대신 이번 렌더에서 바로 잡는다.
  */
  if (denied !== null && denied.pathname !== pathname) setDenied(null);
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
        // 다음 새로고침의 첫 페인트가 이 값으로 그려진다
        writeShellCookie({ user: toShellUser(me) });
        /**
         * 사진의 작은 사본도 떠 둔다 — 다음 새로고침의 **첫 프레임**에 쓰인다.
         * 사진이 없는 계정은 사본도 지운다 (없는 얼굴이 계속 비치면 안 된다).
         */
        if (me.profileImageUrl) {
          // 같은 오리진 창구로 받아야 `<canvas>` 가 오염되지 않는다 (`/api/avatar`)
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

  /** 쿠키의 셸 값 → 셸이 읽는 칸만 채운 사용자. 나머지는 확인 뒤 진짜 값으로 덮인다 */
  const shellUser = useMemo<CurrentUser | null>(() => {
    const cached = initialShell?.user;

    if (!cached) return null;

    return {
      userId: cached.userId,
      name: cached.name,
      role: cached.role,
      // 게이트는 확인된 응답으로만 판단한다 — 여기 값은 쓰이지 않는다
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

      // 권한 부족은 다시 불러도 결과가 같다 — 화면을 옮기지 않고 본문에만 알린다
      if (code !== undefined && isPermissionCode(code)) {
        setDenied({ pathname, code });
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
  }, [pathname, refetch]);

  // 어느 API 에서 401 이 오든 세션이 끊긴 것이다 — /me 만 처리하면 다른 요청은 조용히 실패한다
  useEffect(() => {
    function handleUnauthorized(event: Event) {
      const code = (event as CustomEvent<string | undefined>).detail;

      // 로그인 실패(AUTH_LOGIN_FAILED)는 로그인 화면이 직접 문구를 띄운다
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

  // 어느 경로로 들어와도 막아야 해서 라우팅이 아니라 여기서 가둔다
  const gates = gatesOf(blockedBy, user);

  if (gates) {
    return <AuthGates {...gates} onDone={refetch} />;
  }

  /**
   * 세션 확인 중 — 화면 한가운데 문구 대신 **셸 모양 자리표시**를 그린다.
   * 문구만 띄우면 응답이 오는 순간 사이드바 · 헤더가 통째로 나타나 화면이 한 번 뒤집힌다.
   */
  /**
   * 확인 전에는 **쿠키에 남아 있던 직전 값**으로 셸을 그린다.
   * 게이트 판단(`gatesOf`)에는 쓰이지 않는다 — 아래 자리표시 값들은 셸이 읽지 않는 칸이다.
   */
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
