'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ErrorStateTwoButton } from '@/components/ErrorState';

import { isPageDenied, isPageGated } from './catalog';
import { useMyPages } from './useMyPages';

/**
 * `permission: NONE` 인 페이지 진입을 막는다.
 *
 * 노출과 접근은 분리돼 있다 — 메뉴 버튼은 보이지만(`GET /my/pages` 가 내려주니까)
 * 눌러서 들어오면 여기서 `/forbidden` 으로 보낸다.
 *
 * ⚠️ 이건 통제가 아니다 — 실제 차단은 백엔드가 403 으로 한다. 다만 **판단이 서지 않은
 * 상태로 권한 대상 본문을 그리지는 않는다.** 목록을 못 불러왔으면(`failed`) 통과시키는
 * 대신 다시 시도하게 둔다. 권한 없는 화면이 한 번 떴다 사라지는 편보다 낫다.
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
  const { pages, status, refetch } = useMyPages();

  /**
   * 권한이 걸린 경로인지 먼저 본다 (`requiresPermission` 이 붙은 경로만).
   * 대시보드 · 마이페이지처럼 판단 대상이 아닌 화면까지 목록을 기다리게 하면,
   * **모든 화면의 첫 렌더가 `/my/pages` 응답 속도에 묶인다.**
   */
  const isGated = isPageGated(pathname);
  const isDenied =
    isGated && status === 'ready' && isPageDenied(pathname, pages);

  useEffect(() => {
    if (isDenied) router.replace('/forbidden');
  }, [isDenied, router]);

  /**
   * 판단 전에 그리면 권한 없는 화면이 한 번 번쩍이고, 그 화면의 API 호출까지 나간다.
   * 목록이 오는 사이는 비워 둔다.
   */
  if (isDenied || (isGated && status === 'loading')) {
    return <p className="p-6 text-body-m text-text-secondary">불러오는 중…</p>;
  }

  /**
   * 조회 실패는 **권한 없음이 아니라 알 수 없음**이다.
   * 임의로 통과시키면 판단 근거 없이 권한 대상 본문이 그려진다 — 다시 시도하게 둔다.
   */
  if (isGated && status === 'failed') {
    return (
      <ErrorStateTwoButton
        title="접근 권한을 확인하지 못했습니다."
        description="잠시 후 다시 시도해주세요."
        retryLabel="다시 시도"
        onRetry={refetch}
      />
    );
  }

  return <>{children}</>;
}
