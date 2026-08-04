'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import MenuIcon from '@/components/MenuIcon';
import { MENU_BY_ROLE } from '@/constants/menu';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

export default function Sidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();

  return (
    <aside className="w-70 shrink-0 bg-slate-950 text-slate-300">
      <div className="p-6 text-xl font-bold text-white">VitaS</div>

      <Link
        href="/mypage"
        className="flex items-center gap-3 border-y border-white/10 p-6 text-sm hover:bg-white/5"
      >
        {/* TODO: 프로필 이미지 자리 */}
        <div className="size-10 shrink-0 rounded-full bg-slate-700" />
        <div>
          <div className="text-white">
            <b>{user.name}</b> {user.rank}
          </div>
          <div className="text-xs text-slate-500">{user.team}</div>
        </div>
      </Link>

      <nav aria-label="주 메뉴" className="p-3">
        <ul>
          {MENU_BY_ROLE[user.role].map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

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
