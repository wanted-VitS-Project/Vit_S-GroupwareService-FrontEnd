'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { logout } from '@/features/auth/api';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { ApiError } from '@/lib/api';

/**
 * 헤더 오른쪽 프로필. 누르면 `마이페이지` · `로그아웃` 이 드롭다운으로 열린다.
 *
 * 로그아웃을 헤더에 버튼으로 내놓으면 프로필과 한 덩어리로 붙어 보이고,
 * 자주 쓰지 않는 동작이 늘 자리를 차지한다 — 시안대로 프로필 안으로 넣었다.
 *
 * 글자 크기는 사이드바 프로필과 같다 — 이름 18/600 · 부가정보 14/400.
 *
 * `isDark` 는 프로젝트 화면의 어두운 헤더 위에 놓일 때만 켠다. **색만 갈아끼우고**
 * 구조 · 크기는 그대로다 — 드롭다운은 떠 있는 판이라 양쪽 모두 흰 배경을 쓴다.
 */
export default function ProfileMenu({ isDark = false }: { isDark?: boolean }) {
  const router = useRouter();
  const user = useCurrentUser();
  const boxRef = useRef<HTMLDivElement>(null);
  /** Esc 로 닫았을 때 포커스를 돌려놓을 곳 — 안 그러면 키보드 사용자가 위치를 잃는다 */
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  /**
   * 소속이 없는 계정(ADMIN 등)이 있다 — 직급 · 부서가 `null` 로 온다.
   * 그때 이름만 18px 로 남으면 60px 헤더 안에서 혼자 커 보인다 —
   * **한 줄짜리 이름은 16px** 로 떨어뜨려 무게를 맞춘다.
   */
  const hasSubInfo = Boolean(user.jobPositionName || user.departmentPath);

  /** 바깥을 누르거나 Esc 를 누르면 닫는다 (알림 종과 같은 규칙) */
  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutside = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  async function handleLogout() {
    if (isPending) return;

    setError('');
    setIsPending(true);

    try {
      await logout();
    } catch (caught) {
      // 401 은 세션이 이미 없다는 뜻이라 성공과 같게 본다
      const isGone = caught instanceof ApiError && caught.status === 401;

      if (!isGone) {
        // 쿠키가 살아 있으므로 이동하면 안 된다. 이동해도 프록시가 되돌려 보낸다
        setError('로그아웃하지 못했습니다.');
        setIsPending(false);
        return;
      }
    }

    // refresh 로 라우터 캐시를 비워야 프록시가 쿠키를 다시 판단한다
    router.replace('/login');
    router.refresh();
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        /**
         * `role="menu"` 도 `aria-haspopup` 도 쓰지 않는다 — 둘 다 **화살표 키 이동 ·
         * 항목 포커스 관리**를 함께 구현해야 하는 메뉴 규약이다. 여기는 링크 · 버튼
         * 하나씩 든 평범한 펼침(disclosure)이라 `aria-expanded` 만으로 충분하고,
         * 기본 Tab 이동이 더 잘 맞는다.
         */
        aria-expanded={isOpen}
        className={`flex max-w-60 cursor-pointer items-center gap-3 rounded-sidebar px-2 py-1 ${
          isDark ? 'hover:bg-bg-sidebar-hover' : 'hover:bg-bg-hover'
        }`}
      >
        {/* TODO: 프로필 이미지 자리 */}
        <span
          className={`size-9 shrink-0 rounded-pill ${
            isDark ? 'bg-bg-sidebar-hover' : 'bg-bg-hover-secondary'
          }`}
        />

        <span className="min-w-0 text-left">
          <span className="flex items-baseline gap-1.5">
            {/* `min-w-0` 이 없으면 flex 가 글자 폭 아래로 안 줄여 말줄임이 안 걸린다 */}
            <span
              className={`min-w-0 truncate font-semibold ${
                hasSubInfo ? 'text-heading-m' : 'text-body-l'
              } ${isDark ? 'text-text-white' : 'text-text-primary'}`}
            >
              {user.name}
            </span>
            {user.jobPositionName && (
              <span
                className={`shrink-0 text-body-m ${
                  isDark ? 'text-text-muted' : 'text-text-secondary'
                }`}
              >
                {user.jobPositionName}
              </span>
            )}
          </span>
          {user.departmentPath && (
            <span
              className={`block truncate text-body-m ${
                isDark ? 'text-text-muted' : 'text-text-secondary'
              }`}
            >
              {user.departmentPath}
            </span>
          )}
        </span>

        <ChevronIcon isOpen={isOpen} isDark={isDark} />
      </button>

      {isOpen && (
        // 어두운 헤더 위에서도 떠 있는 판이라 흰 배경을 유지한다
        <div
          aria-label="내 계정"
          className="absolute top-full right-0 z-20 mt-2 min-w-45 overflow-hidden rounded-base border border-border-default bg-bg-card shadow-lg"
        >
          <Link
            href="/mypage"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2.5 text-body-m text-text-primary hover:bg-bg-hover"
          >
            마이페이지
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="block w-full cursor-pointer border-t border-border-default px-4 py-2.5 text-left text-body-m text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
          >
            {isPending ? '로그아웃 중…' : '로그아웃'}
          </button>

          {error !== '' && (
            <p
              role="alert"
              className="border-t border-border-default px-4 py-2 text-label break-keep text-text-danger"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** 열림 상태를 방향으로 알린다. 장식이라 보조기술에는 읽히지 않는다 */
function ChevronIcon({ isOpen, isDark }: { isOpen: boolean; isDark: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 shrink-0 transition-transform ${
        isDark ? 'text-text-muted' : 'text-text-secondary'
      } ${isOpen ? 'rotate-180' : ''}`}
    >
      <path d="m3 6 5 5 5-5" />
    </svg>
  );
}
