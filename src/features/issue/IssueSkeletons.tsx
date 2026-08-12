import { Skeleton, SkeletonGroup } from '@/components/Skeleton';

/** 열마다 다른 장수를 두어 실제 보드와 높이가 비슷하게 보이게 한다 */
const CARDS_PER_COLUMN = [2, 3, 2];

/** 이슈 보드 로딩 — 열 머리 + 카드 자리를 지킨다 */
export function IssueBoardSkeleton() {
  return (
    <SkeletonGroup
      label="이슈 목록을 불러오는 중"
      className="grid grid-cols-3 items-start gap-3"
    >
      {CARDS_PER_COLUMN.map((count, column) => (
        <div key={column}>
          <div className="mb-2.5 flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-3 w-4" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: count }, (_, card) => (
              <div
                key={card}
                className="rounded-lg border border-border-default bg-white p-3"
              >
                <Skeleton className="mb-2 h-4 w-12" />
                <Skeleton className="mb-3 h-3 w-4/5" />
                <div className="flex items-center justify-between">
                  <Skeleton shape="circle" className="size-5" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
