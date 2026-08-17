'use client';

import { usePathname } from 'next/navigation';

import Logo from '@/components/Logo';
import MemberAvatar from '@/components/MemberAvatar';
import MenuIcon from '@/components/MenuIcon';
import { findActiveMenu, MENU_ORDER } from '@/constants/menu';
import type { ShellSnapshot } from '@/features/auth/shellCache';
import { buildMenuItems } from '@/features/pagePermission/useMyPages';

/**
 * 세션을 확인하는 동안 그리는 셸.
 *
 * ⭐ **직전 값(쿠키)이 있으면 그대로 그린다.** 서버가 HTML 에 이미 담아 내려주므로
 *    첫 페인트부터 프로필 · 메뉴가 제자리에 있고, 세션이 확인돼도 같은 값이라 바뀌는 게 없다.
 *    처음 들어온 사람만 빈 셸을 본다 — 그때도 **회색 막대는 깔지 않는다.** 자리만 잡아 두면
 *    어두운 사이드바가 그대로 있다가 글자만 채워져, 번쩍이지 않는다.
 *
 * ⚠️ 본문은 비워 둔다. 이 값은 셸의 겉모습일 뿐이고, 세션이 확인되기 전에 보호 화면을
 *    그리면 만료된 쿠키로도 내용이 잠깐 보인다.
 * ⚠️ 사이드바 폭(`w-70`) · 헤더 높이(`h-13`)는 `AppShell` 과 **같은 값**이다 —
 *    어긋나면 세션이 확인되는 순간 폭 · 높이가 튄다.
 */
export default function AppShellSkeleton({
  shell,
}: {
  shell?: ShellSnapshot | null;
}) {
  const pathname = usePathname();
  const user = shell?.user ?? null;
  const items = user ? buildMenuItems(user.role, shell?.pages ?? []) : [];
  const hasSubInfo = Boolean(user?.jobPositionName || user?.departmentPath);
  /** 지금 보고 있는 메뉴도 함께 칠한다 — 나중에 칠해지면 파란 칸이 툭 튀어나온다 */
  const activeHref = findActiveMenu(pathname, items)?.href;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="화면을 불러오는 중입니다"
      className="flex h-full overflow-hidden"
    >
      <aside className="w-70 shrink-0 bg-bg-sidebar">
        <div className="flex h-13 items-center border-b border-bg-sidebar-hover px-6">
          <Logo />
        </div>

        {/* 프로필 줄 — 실제 사이드바(`Sidebar`)와 같은 골격이다 (`h-20` · 아바타 `size-10`) */}
        <div className="flex h-20 items-center gap-3 border-b border-bg-sidebar-hover px-6">
          {user ? (
            <>
              <MemberAvatar
                userId={user.userId}
                name={user.name}
                size="lg"
                withRing={false}
                decorative
                imageUrl={user.profileImageUrl}
                thumbnail={shell?.avatar}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-1.5">
                  <span
                    className={`min-w-0 truncate font-semibold text-text-white ${
                      hasSubInfo ? 'text-heading-m' : 'text-body-l'
                    }`}
                  >
                    {user.name}
                  </span>
                  {user.jobPositionName && (
                    <span className="max-w-[45%] shrink-0 truncate text-body-m text-text-muted">
                      {user.jobPositionName}
                    </span>
                  )}
                </p>
                {user.departmentPath && (
                  <p className="truncate text-body-m text-text-muted">
                    {user.departmentPath}
                  </p>
                )}
              </div>
            </>
          ) : (
            <span className="size-10 shrink-0" />
          )}
          {/* 마이페이지로 가는 화살표 — 자리만 비워 두면 이 표시가 나중에 툭 나타난다 */}
          <ChevronRight />
        </div>

        <nav className="p-4">
          <ul className="flex flex-col gap-1">
            {items.length > 0
              ? items.map((item) => (
                  <li
                    key={item.href}
                    className={`flex h-11 items-center gap-3 rounded-sidebar px-3 text-body-l font-medium ${
                      item.href === activeHref
                        ? 'bg-btn-primary text-text-white'
                        : 'text-text-muted'
                    }`}
                  >
                    <MenuIcon name={item.icon} />
                    {item.label}
                  </li>
                ))
              : MENU_ORDER.map((href) => <li key={href} className="h-11" />)}
          </ul>
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* 헤더 — 알림 종 · 프로필 자리 (오른쪽 여백 `pr-8` 은 실제 헤더와 같다) */}
        <div className="flex h-13 shrink-0 items-center justify-end gap-3 border-b border-border-default bg-bg-header pr-8">
          {/*
            종 · 프로필은 `Header` 의 오른쪽 묶음과 **같은 골격**이다 (`gap-3`).
            아이콘 · 이름 · 소속 · 화살표 중 하나라도 빠지면 세션이 확인되는 순간
            그 부분만 툭 나타나 헤더가 흔들린다.
            ℹ️ 안 읽은 알림 배지는 그리지 않는다 — 개수를 모르는 채로 빨간 점을 찍으면
               있지도 않은 알림을 알리게 된다.
          */}
          <span className="relative flex items-center p-1.5 text-text-secondary">
            <BellIcon />
            {/* 직전에 안 읽은 알림이 있었다면 점도 함께 — 나중에 붙으면 종 옆이 튄다 */}
            {shell?.hasUnread && (
              <span
                aria-hidden
                className="absolute top-0 right-0 size-2.5 rounded-pill border-2 border-bg-header bg-red-text"
              />
            )}
          </span>

          <span className="flex max-w-60 items-center gap-3 px-2 py-1">
            {user ? (
              <>
                <MemberAvatar
                  userId={user.userId}
                  name={user.name}
                  size="md"
                  withRing={false}
                  decorative
                  imageUrl={user.profileImageUrl}
                  thumbnail={shell?.avatar}
                />
                <span className="min-w-0 text-left">
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className={`min-w-0 truncate font-semibold text-text-primary ${
                        hasSubInfo ? 'text-label' : 'text-caption'
                      }`}
                    >
                      {user.name}
                    </span>
                    {user.jobPositionName && (
                      <span className="shrink-0 text-caption text-text-secondary">
                        {user.jobPositionName}
                      </span>
                    )}
                  </span>
                  {user.departmentPath && (
                    <span className="block truncate text-caption text-text-secondary">
                      {user.departmentPath}
                    </span>
                  )}
                </span>
              </>
            ) : (
              <span className="size-9" />
            )}
            <ChevronDown />
          </span>
        </div>

        <div className="min-h-0 flex-1 bg-bg-surface" />
      </div>
    </div>
  );
}

/** 사이드바 프로필 오른쪽 화살표 (`Sidebar` 와 같은 모양) */
function ChevronRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-text-muted"
    >
      <path d="m6 3 5 5-5 5" />
    </svg>
  );
}

/** 헤더 프로필 오른쪽 화살표 (`ProfileMenu` 닫힌 상태와 같은 모양) */
function ChevronDown() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-text-secondary"
    >
      <path d="m3 6 5 5 5-5" />
    </svg>
  );
}

/** 알림 종 (`NotificationBell` 과 같은 모양) */
function BellIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
