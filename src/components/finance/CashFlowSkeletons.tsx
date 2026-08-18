import { Skeleton, SkeletonGroup } from '@/components/Skeleton';

/**
 * 입출금 화면 로딩 껍데기. 권한 판단 대기와 Suspense 폴백이 함께 쓴다.
 * 결과 건수를 몰라 화면이 튀므로 표는 그리지 않고 제목 · 필터 바만 잡아 둔다.
 */
export function CashFlowListSkeleton() {
  return (
    <SkeletonGroup label="입출금 내역 불러오는 중">
      <div className="mb-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-6 w-40" />
        <Skeleton className="mt-2.5 h-3 w-72" />
      </div>

      {/* 필터 바 자리 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* 같은 폭이 두 번 나오므로 key 에 자리를 함께 쓴다 */}
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
