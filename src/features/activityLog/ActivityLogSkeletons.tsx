import { Skeleton, SkeletonGroup } from '@/components/Skeleton';

// 날짜 그룹마다 다른 줄 수를 두어 실제 목록과 높이가 비슷하게 보이게 한다.
const ROWS_PER_GROUP = [3, 2];

// 활동 기록 첫 로딩 — 날짜 머리 + 타임라인 자리를 지킨다.
export function ActivityLogSkeleton() {
  return (
    <SkeletonGroup
      label="활동 기록을 불러오는 중"
      className="flex flex-col gap-6"
    >
      {ROWS_PER_GROUP.map((count, group) => (
        <div key={group}>
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="h-3 w-12" />
            <span className="h-px flex-1 bg-bg-sidebar/10" />
          </div>
          <div className="flex flex-col gap-5">
            {Array.from({ length: count }, (_, row) => (
              <div key={row} className="flex gap-3">
                <Skeleton shape="circle" className="size-[27px] shrink-0" />
                <div className="flex-1">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Skeleton shape="circle" className="size-5" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-28 rounded-button-sm" />
                  </div>
                  <Skeleton className="h-7 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

// 다음 페이지 로딩 — 목록 아래에 줄 두 개만 덧댄다.
export function ActivityLogMoreSkeleton() {
  return (
    <SkeletonGroup
      label="다음 기록을 불러오는 중"
      className="flex flex-col gap-5"
    >
      {[0, 1].map((row) => (
        <div key={row} className="flex gap-3">
          <Skeleton shape="circle" className="size-[27px] shrink-0" />
          <div className="flex-1">
            <Skeleton className="mb-1.5 h-3 w-24" />
            <Skeleton className="h-7 w-full" />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
