import { Skeleton, SkeletonGroup } from '@/components/Skeleton';

/**
 * 결재 관리 목록 로딩. 표가 아니라 **카드 행**이라 `SkeletonTable` 을 쓰지 않는다.
 * 행 높이를 실제와 맞춰 두어야 목록이 뜨는 순간 화면이 튀지 않는다.
 */
export function ApprovalListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonGroup
      label="결재 목록을 불러오는 중입니다"
      className="flex flex-col gap-2"
    >
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 rounded-xl border border-[#1C1F2A]/10 px-4 py-3.5"
        >
          <Skeleton className="h-5 w-12 rounded-full" />

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-64" />
            <Skeleton className="h-2.5 w-40" />
          </div>

          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-24" />

          <div className="flex gap-1">
            <Skeleton shape="circle" className="size-6" />
            <Skeleton shape="circle" className="size-6" />
            <Skeleton shape="circle" className="size-6" />
          </div>

          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      ))}
    </SkeletonGroup>
  );
}
