import { Skeleton, SkeletonGroup } from '@/components/Skeleton';

/**
 * 입출금 화면 로딩 껍데기.
 *
 * **두 곳이 같은 것을 쓴다** —
 * - `PageAccessGate` 의 권한 판단 대기 (`/finance` 는 권한이 걸린 경로다)
 * - `/finance/payments` 의 `Suspense` 폴백
 *
 * ⚠️ **표는 그리지 않는다.** 몇 줄이 올지 모르는 채로 10줄을 깔면, 결과가 2건일 때
 *    표가 떴다가 줄어들어 화면이 튄다. 자리가 확실한 제목 · 필터 바만 잡아 두고
 *    표 자리는 비워 둔다 (`CashFlowList` 도 첫 조회 중에는 같은 방식이다).
 */
export function CashFlowListSkeleton() {
  return (
    <SkeletonGroup label="입출금 내역 불러오는 중">
      <div className="mb-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-6 w-40" />
        <Skeleton className="mt-2.5 h-3 w-72" />
      </div>

      {/* 필터 바 — 날짜 2개 · 셀렉트 3개 · 토글 · 검색 · 버튼 2개 자리 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* 같은 폭이 두 번 나오므로 key 에 자리(index)를 함께 쓴다 */}
        {['w-36', 'w-36', 'w-32', 'w-32', 'w-44', 'w-24'].map(
          (width, index) => (
            <Skeleton
              key={`${width}-${index}`}
              className={`h-9 ${width} rounded-lg`}
            />
          ),
        )}
        <Skeleton className="h-9 w-56 rounded-lg" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <p className="py-20 text-center text-caption text-text-secondary">
        입출금 내역을 불러오는 중입니다.
      </p>
    </SkeletonGroup>
  );
}
