'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { findPageCode, isPageDenied } from './catalog';
import { useMyPages } from './useMyPages';

/**
 * `permission: NONE` 인 페이지 진입을 막는다.
 *
 * 노출과 접근은 분리돼 있다 — 메뉴 버튼은 보이지만(`GET /my/pages` 가 내려주니까)
 * 눌러서 들어오면 여기서 `/forbidden` 으로 보낸다.
 *
 * ⚠️ 이건 **편의**이지 통제가 아니다. 실제 차단은 백엔드가 403 으로 한다 —
 * 목록을 못 불러왔거나(`failed`) 매핑이 없는 경로는 그냥 통과시키고 백엔드에 맡긴다.
 *
 * 사이드바 · 헤더는 감싸지 않는다 — 본문만 가려 셸이 깜빡이지 않게 한다.
 */
export default function PageAccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { pages, status } = useMyPages();

  /**
   * 권한이 걸린 경로인지 먼저 본다.
   * 대시보드 · 마이페이지처럼 판단 대상이 아닌 화면까지 목록을 기다리게 하면,
   * **모든 화면의 첫 렌더가 `/my/pages` 응답 속도에 묶인다.**
   */
  const isGated = findPageCode(pathname) !== undefined;
  const isDenied =
    isGated && status === 'ready' && isPageDenied(pathname, pages);

  useEffect(() => {
    if (isDenied) router.replace('/forbidden');
  }, [isDenied, router]);

  /**
   * 판단 전에 그리면 권한 없는 화면이 한 번 번쩍이고, 그 화면의 API 호출까지 나간다.
   * 목록이 오는 사이만 비워 둔다 (실패면 통과라 여기서 멈추지 않는다).
   */
  if (isDenied || (isGated && status === 'loading')) {
    return <p className="p-6 text-body-m text-text-secondary">불러오는 중…</p>;
  }

  return <>{children}</>;
}
