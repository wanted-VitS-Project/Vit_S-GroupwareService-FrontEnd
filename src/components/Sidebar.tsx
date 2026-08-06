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

  return (
    // 셸이 화면 높이에 고정돼 있어, 메뉴가 길면 사이드바 안에서 굴러야 한다
    <aside className="no-scrollbar w-70 shrink-0 overflow-y-auto bg-slate-950 text-slate-300">
      <div className="p-6 text-xl font-bold text-white">VitaS</div>

      <Link
        href="/mypage"
        className="flex items-center gap-3 border-y border-white/10 p-6 text-sm hover:bg-white/5"
      >
        {/* TODO: 프로필 이미지 자리 */}
        <div className="size-10 shrink-0 rounded-full bg-slate-700" />
        <div className="min-w-0">
          <div className="truncate text-white">
            <b>{user.name}</b> {user.jobPositionName}
          </div>
          <div className="truncate text-xs text-slate-500">
            {user.departmentPath}
          </div>
        </div>
      </Link>

      <nav aria-label="주 메뉴" className="p-3">
        <ul>
          {MENU_BY_ROLE[user.role].map((item) => {
            const isActive = item.href === activeHref;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded p-3 text-sm hover:bg-white/5 ${
                    isActive ? 'bg-white/10 font-bold text-white' : ''
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
