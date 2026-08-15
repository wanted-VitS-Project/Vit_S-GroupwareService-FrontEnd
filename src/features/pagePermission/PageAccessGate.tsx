'use client';

import { usePathname } from 'next/navigation';

import {
  ErrorStateOneButton,
  ErrorStateTwoButton,
} from '@/components/ErrorState';
import { NoticeListSkeleton } from '@/components/bidding/NoticeSkeletons';
import { CashFlowListSkeleton } from '@/components/finance/CashFlowSkeletons';

import { Skeleton, SkeletonGroup } from '@/components/Skeleton';

import { isPageDenied, isPageGated } from './catalog';
import { useMyPages } from './useMyPages';

/**
 * 권한 판단 대기 중에 그 화면 **자신의 골격**을 그릴 수 있는 경로.
 *
 * 여기 없으면 아래 범용 골격(제목 줄 + 목록 상자)이 나가는데, 그러면 새로고침할 때
 * `회색 상자 → 표` 로 모양이 한 번 갈아엎힌다. 화면의 `Suspense` 폴백과 **같은 것**을
 * 쓰는 경로만 등록한다 — 다르면 깜빡임을 옮기기만 할 뿐이다.
 *
 * ⚠️ **목록만 그리는 껍데기는 여기 넣지 않는다.** 표가 화면 맨 위에 붙었다가
 *    실제 화면이 뜨면서 머리글 · 필터 바 높이만큼 내려앉는다.
 *    `SkeletonPageHeader` · `SkeletonFilterBar` 로 화면 골격까지 잡은 뒤에 등록한다.
 *    (입찰 `/notices` 는 2026-08-14 에 골격을 맞추고 함께 등록했다)
 */
const ROUTE_SKELETONS: {
  prefix: string;
  /**
   * 하위 경로에는 쓰지 않는다.
   *
   * 목록 껍데기는 **목록 화면에만** 맞는다 — `/notices/new`(등록 폼) ·
   * `/notices/{id}`(상세)는 머리글도 본문도 달라, 하위까지 물려주면
   * 껍데기와 실제 화면이 어긋나 깜빡임을 되살린다.
   */
  exact?: boolean;
  render: () => React.ReactNode;
}[] = [
  { prefix: '/finance/payments', render: () => <CashFlowListSkeleton /> },
  { prefix: '/notices', exact: true, render: () => <NoticeListSkeleton /> },
];

/**
 * 권한 판단 대기 화면.
 *
 * 등록된 경로면 그 화면의 골격을, 아니면 **표 · 카드 공통 골격**(제목 줄 + 목록 상자)을
 * 그린다. 실제 표 스켈레톤은 화면이 그려진 뒤 `DataTable` 이 맡는다.
 */
function GateLoading({ pathname }: { pathname: string }) {
  // `/finance/payments-archive` 같은 다른 경로가 걸리지 않게 경계까지 본다
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

      <div className="mt-6 overflow-hidden rounded-xl border border-border-default bg-bg-card">
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
 * `permission: NONE` 인 페이지 진입을 막는다.
 *
 * 노출과 접근은 분리돼 있다 — 메뉴 버튼은 보이지만(`GET /my/pages` 가 내려주니까)
 * 눌러서 들어오면 여기서 막는다.
 *
 * ⚠️ `/forbidden` 으로 **보내지 않는다** — 그 경로는 `BARE_LAYOUT_PATHS` 라 셸이 벗겨져
 *    사이드바까지 사라진다. 사이드바에서 누른 결과가 전체 화면 오류면 길을 잃으므로,
 *    **본문 자리에 그대로** 안내를 그려 다른 메뉴로 바로 옮겨갈 수 있게 한다.
 *    (`/forbidden` 라우트 자체는 셸 밖에서 403 을 받는 경로가 계속 쓴다)
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
  const { pages, status, refetch } = useMyPages();

  /**
   * 권한이 걸린 경로인지 먼저 본다 (`requiresPermission` 이 붙은 경로만).
   * 대시보드 · 마이페이지처럼 판단 대상이 아닌 화면까지 목록을 기다리게 하면,
   * **모든 화면의 첫 렌더가 `/my/pages` 응답 속도에 묶인다.**
   */
  const isGated = isPageGated(pathname);
  const isDenied =
    isGated && status === 'ready' && isPageDenied(pathname, pages);

  /**
   * 다시 시도해도 결과가 같아 버튼은 홈으로 하나뿐이다 —
   * 권한은 사용자가 이 화면에서 바꿀 수 있는 것이 아니다 (`/forbidden` 과 같은 문구).
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
   * 판단 전에 그리면 권한 없는 화면이 한 번 번쩍이고, 그 화면의 API 호출까지 나간다.
   * 그래서 `/my/pages` 가 오는 동안은 본문을 그리지 않는다.
   *
   * ⚠️ 예전에는 `불러오는 중…` **글자 한 줄**이었다. 권한이 걸린 화면(입찰 · 재무)은
   *    이 단계가 먼저 지나가므로, 정작 표 스켈레톤은 그 뒤에 잠깐 스쳐 **로딩이 두 번 다른 모양**
   *    으로 보였다. 표 골격을 흉내 낸 덩어리로 바꿔 한 흐름으로 읽히게 한다.
   */
  if (isGated && status === 'loading') {
    return <GateLoading pathname={pathname} />;
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
