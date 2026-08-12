import { Skeleton, SkeletonGroup } from '@/components/Skeleton';

/**
 * 내 프로젝트 목록 로딩. 표가 아니라 **카드 행**이라 `SkeletonTable` 을 쓰지 않는다.
 * 행 높이(74px)를 실제 카드와 맞춰 두어야 목록이 뜨는 순간 화면이 튀지 않는다.
 */
export default function ProjectListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonGroup
      label="프로젝트 목록을 불러오는 중입니다"
      className="flex flex-col gap-3"
    >
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex h-[74px] items-center gap-4 rounded-base border border-border-default bg-bg-card px-5"
        >
          <Skeleton className="h-[21px] w-11 rounded-button-md" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-[15px] w-56" />
            <Skeleton className="mt-2 h-3 w-72" />
          </div>
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map((avatar) => (
              <Skeleton key={avatar} shape="circle" className="size-6" />
            ))}
          </div>
          <Skeleton className="h-1.5 w-30 rounded-pill" />
          <Skeleton className="h-[21px] w-14 rounded-button-md" />
        </div>
      ))}
    </SkeletonGroup>
  );
}
