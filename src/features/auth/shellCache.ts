/**
 * 셸(사이드바 · 헤더)을 **첫 페인트부터** 그리기 위한 직전 값.
 *
 * ⭐ 쿠키인 이유 — `sessionStorage` 는 서버 렌더에서 못 읽어, 첫 HTML 이 늘 빈 셸이었다.
 *    쿠키는 요청에 실려 가므로 루트 레이아웃이 읽어 HTML 에 담아 내려준다.
 * ⚠️ 담는 것은 **화면에 이미 보이는 내 정보**뿐이다. 권한 판단은 매 요청 서버가 다시 한다.
 * ⚠️ 인증 쿠키와 별개이며 토큰류는 넣지 않는다.
 */

import type { MyPage } from '@/features/pagePermission/types';

import type { CurrentUser } from './types';

export const SHELL_COOKIE = 'vitas.shell';

/** 하루면 충분하다 — 다음 로그인 때 어차피 새로 쓴다 */
const MAX_AGE_SECONDS = 60 * 60 * 24;

/** 셸이 그리는 데 필요한 최소한의 값만 추린다 */
export interface ShellUser {
  userId: string;
  name: string;
  role: CurrentUser['role'];
  jobPositionName: string | null;
  departmentPath: string | null;
  profileImageUrl: string | null;
}

export interface ShellSnapshot {
  user: ShellUser | null;
  pages: MyPage[];
  /** 안 읽은 알림이 있었는지 — 첫 페인트의 종 배지를 위해 **있고 없고만** 남긴다 */
  hasUnread: boolean;
  /**
   * 프로필 사진의 아주 작은 사본(data URL).
   * 첫 페인트에 바로 그릴 수 있어야 해서 주소가 아니라 **그림 자체**를 담는다.
   */
  avatar: string | null;
}

export function toShellUser(user: CurrentUser): ShellUser {
  return {
    userId: user.userId,
    name: user.name,
    role: user.role,
    jobPositionName: user.jobPositionName ?? null,
    departmentPath: user.departmentPath ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
  };
}

/** 쿠키 문자열 → 스냅샷. 깨졌으면 없는 셈 친다 (셸은 빈 채로 그려진다) */
export function decodeShell(raw: string | undefined): ShellSnapshot | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));

    if (!parsed || typeof parsed !== 'object') return null;

    const snapshot = parsed as Partial<ShellSnapshot>;

    return {
      user: snapshot.user ?? null,
      pages: Array.isArray(snapshot.pages) ? snapshot.pages : [],
      hasUnread: snapshot.hasUnread === true,
      avatar: typeof snapshot.avatar === 'string' ? snapshot.avatar : null,
    };
  } catch {
    return null;
  }
}

/** 브라우저에서 지금 쿠키에 들어 있는 값 */
export function readShellCookie(): ShellSnapshot | null {
  if (typeof document === 'undefined') return null;

  const hit = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${SHELL_COOKIE}=`));

  return decodeShell(hit?.slice(SHELL_COOKIE.length + 1));
}

/**
 * 바뀐 부분만 덮어쓴다 — 사용자 정보와 메뉴는 **다른 응답**으로 따로 도착한다.
 * 통째로 쓰면 나중에 온 쪽이 먼저 온 쪽을 지운다.
 */
export function writeShellCookie(patch: Partial<ShellSnapshot>) {
  if (typeof document === 'undefined') return;

  const current = readShellCookie();
  const next: ShellSnapshot = {
    user: patch.user !== undefined ? patch.user : (current?.user ?? null),
    pages: patch.pages !== undefined ? patch.pages : (current?.pages ?? []),
    hasUnread:
      patch.hasUnread !== undefined
        ? patch.hasUnread
        : (current?.hasUnread ?? false),
    avatar:
      patch.avatar !== undefined ? patch.avatar : (current?.avatar ?? null),
  };

  const value = encodeURIComponent(JSON.stringify(next));

  document.cookie = `${SHELL_COOKIE}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** 로그아웃 · 계정 전환에서 비운다 — 남의 이름이 잠깐 비치지 않게 */
export function clearShellCookie() {
  if (typeof document === 'undefined') return;

  document.cookie = `${SHELL_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
