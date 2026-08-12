import { Skeleton, SkeletonGroup } from '@/components/Skeleton';

/**
 * 프로젝트 전체 화면의 로딩 자리.
 *
 * 문구 한 줄이 아니라 **최종 높이와 비슷한 뼈대**를 세운다 —
 * 높이가 급변하면 그 자체가 깜빡임으로 읽힌다. (프로젝트 화면 공통 방침)
 */

/** 전체 이슈 — 요약 카드 + 스텝 아코디언 머리 */
export function ProjectIssuesSkeleton() {
  return (
    <SkeletonGroup
      label="프로젝트 이슈를 불러오는 중입니다"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-3 rounded-base border border-border-default bg-bg-card p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-2 w-full rounded-pill" />
      </div>

      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex items-center gap-3 rounded-base border border-border-default bg-bg-card px-4 py-3.5"
          >
            <Skeleton className="size-4" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="ml-auto h-2 w-28 rounded-pill" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** 문서함 — 스텝 묶음 + 문서 행 */
export function ProjectFilesSkeleton() {
  return (
    <SkeletonGroup
      label="프로젝트 문서를 불러오는 중입니다"
      className="flex flex-col gap-4"
    >
      {[0, 1].map((group) => (
        <div
          key={group}
          className="overflow-hidden rounded-base border border-border-default bg-bg-card"
        >
          <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
            <Skeleton className="size-4" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-button-sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** 이미지 모아보기 — 정사각 타일 그리드 */
export function ProjectImagesSkeleton() {
  return (
    <SkeletonGroup
      label="프로젝트 이미지를 불러오는 중입니다"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7].map((tile) => (
        <Skeleton key={tile} className="aspect-square w-full rounded-base" />
      ))}
    </SkeletonGroup>
  );
}
