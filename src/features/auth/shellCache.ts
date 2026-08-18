/**
 * 셸(사이드바 · 헤더)을 첫 페인트부터 그리기 위한 직전 값.
 * 서버 렌더에서도 읽어야 해서 쿠키를 쓰며 토큰류는 담지 않는다.
 */

import type { MyPage } from '@/features/pagePermission/types';

import type { CurrentUser } from './types';

export const SHELL_COOKIE = 'vitas.shell';

/** 다음 로그인 때 새로 쓰므로 하루면 충분하다 */
const MAX_AGE_SECONDS = 60 * 60 * 24;

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
  /** 안 읽은 알림 유무. 첫 페인트의 종 배지에만 쓴다 */
  hasUnread: boolean;
  /** 프로필 사진의 축소 사본(data URL). 첫 페인트에 바로 그리려고 그림 자체를 담는다 */
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

/** 쿠키 문자열을 스냅샷으로 바꾼다. 깨졌으면 없는 셈 친다 */
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

export function readShellCookie(): ShellSnapshot | null {
  if (typeof document === 'undefined') return null;

  const hit = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${SHELL_COOKIE}=`));

  return decodeShell(hit?.slice(SHELL_COOKIE.length + 1));
}

/**
 * 바뀐 부분만 덮어쓴다. 사용자 정보와 메뉴가 다른 응답으로 따로 도착해
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

/** 로그아웃 · 계정 전환에서 비운다 */
export function clearShellCookie() {
  if (typeof document === 'undefined') return;

  document.cookie = `${SHELL_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
