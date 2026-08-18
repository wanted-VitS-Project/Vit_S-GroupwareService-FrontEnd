'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';

import Logo from '@/components/Logo';
import MemberAvatar from '@/components/MemberAvatar';
import MenuIcon from '@/components/MenuIcon';
import { mobileSidebarClasses } from '@/components/mobileSidebarClasses';
import MobileSidebarToggle from '@/components/MobileSidebarToggle';
import { useNarrowScreen } from '@/components/useNarrowScreen';
import { findActiveMenu, MENU_ORDER } from '@/constants/menu';
import { useShellAvatar } from '@/features/auth/CurrentUserProvider';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { useMenuItems } from '@/features/pagePermission/useMyPages';

export default function Sidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const { items, status, refetch } = useMenuItems();
  /** 셸 자리표시의 사진 사본을 이어받는다 — 안 받으면 전환 순간 사진이 한 번 빈다 */
  const thumbnail = useShellAvatar();
  const isLoading = status === 'loading';
  const activeHref = findActiveMenu(pathname, items)?.href;
  /** 소속이 없는 계정(ADMIN 등)은 직급 · 부서가 `null` 로 온다 */
  const hasSubInfo = Boolean(user.jobPositionName || user.departmentPath);

  /** 좁은 화면(1024px 미만)에서만 쓰이는 열림 상태 */
  const [isOpen, setIsOpen] = useState(false);
  /** 판이 실제로 떠 있는 상태 — 이때만 모달로 알린다 (넓은 화면에서는 제자리 사이드바다) */
  const isNarrow = useNarrowScreen();
  const isModal = isOpen && isNarrow;
  const panelRef = useRef<HTMLElement>(null);

  return (
    <>
      {/* 좁은 화면에서 사이드바를 여는 버튼 + 뒤를 덮는 판 (넓어지면 둘 다 사라진다) */}
      <MobileSidebarToggle
        isOpen={isOpen}
        onToggle={() => setIsOpen((open) => !open)}
        onClose={() => setIsOpen(false)}
        label="메뉴"
        panelRef={panelRef}
      />

      {/* 셸이 화면 높이에 고정돼 있어, 메뉴가 길면 사이드바 안에서 굴러야 한다 */}
      <aside
        ref={panelRef}
        /* 떠 있는 동안에는 모달로 알린다 — 안 그러면 보조기술이 배경을 훑는다 */
        role={isModal ? 'dialog' : undefined}
        aria-modal={isModal || undefined}
        aria-label={isModal ? '주 메뉴' : undefined}
        /* 좁은 화면의 판은 본문을 덮으므로 링크를 누르면 함께 닫는다 */
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest('a')) setIsOpen(false);
        }}
        className={`no-scrollbar w-70 shrink-0 overflow-y-auto bg-bg-sidebar ${
          isOpen
            ? mobileSidebarClasses.asideOpen
            : mobileSidebarClasses.asideClosed
        }`}
      >
        {/* 로고 줄 — 헤더와 같은 52px 라 밑줄이 이어진다. 프로젝트 화면은 `Header` 가 그린다 */}
        <div className="flex h-13 items-center border-b border-bg-sidebar-hover px-6">
          {/* 로고는 어느 화면에서나 **홈으로 가는 길**이다 (프로젝트 화면은 `Header` 참고) */}
          <Link href="/" aria-label="홈으로 이동" className="flex items-center">
            <Logo />
          </Link>
        </div>

        <Link
          href="/mypage"
          className="flex h-20 items-center gap-3 border-b border-bg-sidebar-hover px-6 hover:bg-bg-sidebar-hover"
        >
          {/* 이름이 바로 옆에 있으므로 장식으로 숨긴다 */}
          <MemberAvatar
            userId={user.userId}
            name={user.name}
            size="lg"
            withRing={false}
            /* 어두운 바탕이라 옅은 테두리가 링처럼 도드라진다 */
            withBorder={false}
            decorative
            imageUrl={user.profileImageUrl}
            thumbnail={thumbnail}
          />

          <div className="min-w-0 flex-1">
            {/* 헤더 프로필과 같은 크기. 소속이 없는 계정은 이름만 남아 커 보여 16px 로 낮춘다 */}
            {/* 줄이는 쪽(이름)에 `min-w-0` 이 없으면 flex 가 글자 폭 아래로 안 줄여 말줄임이 안 걸린다 */}
            <p className="flex items-baseline gap-1.5">
              <span
                className={`min-w-0 truncate font-semibold text-text-white ${
                  hasSubInfo ? 'text-heading-m' : 'text-body-l'
                }`}
              >
                {user.name}
              </span>
              {/* 이름이 먼저 줄어들되, 긴 직급명이 아이콘을 밀어내지 않게 45% 에서 자른다 */}
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
            {/* 불러오는 중에는 고정 항목도 그리지 않는다 — 동적 항목이 끼어들며 줄을 밀어낸다 */}
            {isLoading && <MenuPlaceholder />}

            {!isLoading &&
              items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={item.href === activeHref ? 'page' : undefined}
                    /**
                     * 선택된 메뉴만 파란 배경이다. 보조색은 어두운 바탕에서 대비가 모자라
                     * `text-secondary` 가 아니라 `text-muted` 를 쓴다.
                     */
                    className={`flex h-11 items-center gap-3 rounded-sidebar px-3 text-body-l font-medium ${
                      item.href === activeHref
                        ? 'bg-btn-primary text-text-white'
                        : 'text-text-muted hover:bg-bg-sidebar-hover hover:text-text-white'
                    }`}
                  >
                    <MenuIcon name={item.icon} />
                    {item.label}
                  </Link>
                </li>
              ))}

            {status === 'failed' && <MenuRetry onRetry={refetch} />}
          </ul>
        </nav>
      </aside>
    </>
  );
}

/* 여닫기 버튼 · 아이콘은 `MobileSidebarToggle` 로 옮겼다 — `ProjectSidebar` 와 함께 쓴다 */

/** 불러오는 동안 메뉴 자리를 잡아둔다. 줄 수는 `MENU_ORDER` 를 따른다 */
function MenuPlaceholder() {
  return (
    <li aria-hidden className="flex flex-col gap-1">
      {MENU_ORDER.map((href) => (
        <span
          key={href}
          className="block h-11 animate-pulse rounded-sidebar bg-bg-sidebar-hover"
        />
      ))}
    </li>
  );
}

/** 메뉴를 못 불러온 상태. 권한 없음이 아니라 알 수 없음이라 다시 시도하게 둔다 */
function MenuRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <li className="rounded-sidebar bg-bg-sidebar-hover px-3 py-3">
      <p className="text-body-m text-text-muted">메뉴를 불러오지 못했습니다.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1.5 cursor-pointer text-body-m font-medium text-text-white underline underline-offset-2 hover:text-text-muted"
      >
        다시 시도
      </button>
    </li>
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
