'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import MenuIcon from '@/components/MenuIcon';
import { findActiveMenu, MENU_BY_ROLE } from '@/constants/menu';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

export default function Sidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const activeHref = findActiveMenu(pathname, user.role)?.href;
  /** 소속이 없는 계정(ADMIN 등)은 직급 · 부서가 `null` 로 온다 */
  const hasSubInfo = Boolean(user.jobPositionName || user.departmentPath);

  return (
    // 셸이 화면 높이에 고정돼 있어, 메뉴가 길면 사이드바 안에서 굴러야 한다
    <aside className="no-scrollbar w-70 shrink-0 overflow-y-auto bg-bg-sidebar">
      {/*
        로고 줄 — 헤더와 같은 60px(`h-15`) 라 두 영역의 밑줄이 한 선으로 이어진다.
        프로젝트 화면에는 이 사이드바가 없어 `Header` 가 같은 로고를 대신 그린다 —
        모양을 바꿀 때는 두 곳을 함께 고친다.
      */}
      <div className="flex h-15 items-center border-b border-bg-sidebar-hover px-6">
        <span className="text-heading-l font-bold tracking-tight text-text-white">
          Vita<span className="text-text-primary-blue">S</span>
        </span>
      </div>

      <Link
        href="/mypage"
        className="flex h-20 items-center gap-3 border-b border-bg-sidebar-hover px-6 hover:bg-bg-sidebar-hover"
      >
        {/* TODO: 프로필 이미지 자리 */}
        <div className="size-10 shrink-0 rounded-pill bg-bg-hover-secondary" />

        <div className="min-w-0 flex-1">
          {/*
            헤더 프로필과 같은 크기다 — 이름 18/600 · 부가정보 14/400 (명세).
            소속이 없는 계정(ADMIN 등)은 이름 한 줄만 남아 혼자 커 보인다 — 16px 로 떨어뜨린다.
          */}
          {/* 줄이는 쪽(이름)에 `min-w-0` 이 없으면 flex 가 글자 폭 아래로 안 줄여 말줄임이 안 걸린다 */}
          <p className="flex items-baseline gap-1.5">
            <span
              className={`min-w-0 truncate font-semibold text-text-white ${
                hasSubInfo ? 'text-heading-m' : 'text-body-l'
              }`}
            >
              {user.name}
            </span>
            {/*
              `shrink-0` 로 이름이 먼저 줄어들게 두되, 상한 없이 두면 긴 직급명이
              `ChevronIcon` 까지 밀어낸다 — 45% 에서 잘리게 한다.
            */}
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

        <ChevronIcon />
      </Link>

      <nav aria-label="주 메뉴" className="p-4">
        <ul className="flex flex-col gap-1">
          {MENU_BY_ROLE[user.role].map((item) => {
            const isActive = item.href === activeHref;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  /**
                   * 선택된 메뉴만 파란 배경 · 흰 글씨다.
                   * 나머지는 배경 없이 보조색이라, 지금 어디에 있는지가 한눈에 갈린다.
                   *
                   * 보조색은 `text-secondary`(#6B7280) 가 아니라 `text-muted`(#9CA3AF) 다 —
                   * 어두운 사이드바 위에서 앞엣것은 대비 4.1:1 로 WCAG AA(4.5:1)에 못 미친다.
                   */
                  className={`flex h-11 items-center gap-3 rounded-sidebar px-3 text-body-l font-medium ${
                    isActive
                      ? 'bg-btn-primary text-text-white'
                      : 'text-text-muted hover:bg-bg-sidebar-hover hover:text-text-white'
                  }`}
                >
                  <MenuIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/** 마이페이지로 들어간다는 표시. 장식이라 보조기술에는 읽히지 않는다 */
function ChevronIcon() {
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
