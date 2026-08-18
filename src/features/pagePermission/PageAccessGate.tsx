'use client';

import { usePathname } from 'next/navigation';

import {
  ErrorStateOneButton,
  ErrorStateTwoButton,
} from '@/components/ErrorState';
import { NoticeListSkeleton } from '@/components/bidding/NoticeSkeletons';
import { CashFlowListSkeleton } from '@/components/finance/CashFlowSkeletons';

import { Skeleton, SkeletonGroup } from '@/components/Skeleton';
import { usePermissionDenied } from '@/features/auth/CurrentUserProvider';

import { isPageDenied, isPageGated } from './catalog';
import { useMyPages } from './useMyPages';

/**
 * 권한 판단 대기 중에 그 화면 자신의 골격을 그릴 수 있는 경로.
 * 화면의 Suspense 폴백과 같은 것을 쓰는 경로만 등록한다. 다르면 깜빡임만 옮긴다.
 */
const ROUTE_SKELETONS: {
  prefix: string;
  /**
   * 하위 경로에는 쓰지 않는다.
   * 등록 폼 · 상세는 머리글도 본문도 달라 껍데기가 어긋난다.
   */
  exact?: boolean;
  render: () => React.ReactNode;
}[] = [
  { prefix: '/finance/payments', render: () => <CashFlowListSkeleton /> },
  { prefix: '/notices', exact: true, render: () => <NoticeListSkeleton /> },
];

/**
 * 권한 판단 대기 화면.
 * 등록된 경로면 그 화면의 골격을, 아니면 제목 줄과 목록 상자 공통 골격을 그린다.
 */
function GateLoading({ pathname }: { pathname: string }) {
  // 다른 경로가 걸리지 않게 경계까지 본다
  const matched = ROUTE_SKELETONS.find((route) =>
    route.exact
      ? pathname === route.prefix
      : pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );

  if (matched) return <>{matched.render()}</>;

  return (
    <SkeletonGroup label="화면을 준비하는 중입니다">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-3 w-64" />

      <div className="mt-6 overflow-hidden rounded-base border border-border-default bg-bg-card">
        <div className="border-b border-border-default bg-bg-surface px-5 py-3">
          <Skeleton className="h-3 w-24" />
        </div>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="border-b border-border-default px-5 py-3.5">
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

/**
 * permission 이 NONE 인 페이지 진입을 막는다. 메뉴는 보이지만 눌러 들어오면 막힌다.
 * /forbidden 으로 보내면 셸이 벗겨져 길을 잃으므로 본문 자리에 안내를 그린다.
 */
export default function PageAccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { pages, status, refetch } = useMyPages();

  /**
   * 권한이 걸린 경로인지 먼저 본다.
   * 판단 대상이 아닌 화면까지 기다리면 모든 화면의 첫 렌더가 응답에 묶인다.
   */
  const isGated = isPageGated(pathname);
  /**
   * 두 갈래가 같은 자리에 그려진다.
   * /my/pages 로 미리 아는 경우와 호출이 403 을 받고 나서야 아는 경우다.
   */
  const deniedCode = usePermissionDenied();
  const isDenied =
    deniedCode !== null ||
    (isGated && status === 'ready' && isPageDenied(pathname, pages));

  /**
   * 다시 시도해도 결과가 같아 버튼은 홈으로 하나뿐이다.
   * 권한은 사용자가 이 화면에서 바꿀 수 있는 것이 아니다.
   */
  if (isDenied) {
    return (
      <ErrorStateOneButton
        title="접근 권한이 없습니다."
        description={
          '이 페이지를 볼 수 있는 권한이 없습니다.\n담당자에게 문의해주세요.'
        }
      />
    );
  }

  /**
   * 판단 전에 그리면 권한 없는 화면이 번쩍이고 그 화면의 API 호출까지 나간다.
   * 글자 한 줄 대신 표 골격을 흉내 내 로딩이 두 모양으로 보이지 않게 한다.
   */
  if (isGated && status === 'loading') {
    return <GateLoading pathname={pathname} />;
  }

  /**
   * 조회 실패는 권한 없음이 아니라 알 수 없음이다.
   * 임의로 통과시키지 않고 다시 시도하게 둔다.
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
