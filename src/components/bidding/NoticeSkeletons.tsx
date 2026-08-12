import { Skeleton, SkeletonTable } from '@/components/Skeleton';

/**
 * 목록 표의 열 구성을 실제 화면(`NoticeList` 의 `NOTICE_COLUMNS`)과 맞춘다 —
 * 다르면 로딩이 끝나며 열이 튄다.
 *
 * ℹ️ 화면 안에서의 로딩은 `DataTable` 이 `rows={null}` 로 직접 그린다.
 *    이 스켈레톤은 **`Suspense` 폴백 전용**이다 (`useSearchParams` 가 준비되기 전 단계).
 */
const COLUMNS = [
  { label: '공고명', width: 'w-64' },
  { label: '발주처', width: 'w-28' },
  { label: '기초금액', width: 'w-16' },
  { label: '추정가격', width: 'w-16' },
  { label: '공고일', width: 'w-20' },
  { label: '투찰 마감', width: 'w-24' },
  { label: '상태', width: 'w-12' },
  // 전환 배지와 버튼이 한 열에 들어간다 (`NoticeList` 와 같은 구성)
  { label: '전환', width: 'w-20' },
];

export function NoticeListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-default">
      <SkeletonTable
        label="입찰 공고를 불러오는 중입니다"
        rows={rows}
        wrapperClassName="min-w-[900px]"
        columns={COLUMNS.map((column) => ({
          label: column.label || ' ',
          render: () => <Skeleton className={`h-3 ${column.width}`} />,
        }))}
      />
    </div>
  );
}

/** 상세 로딩. 헤더 + 좌측 정보 카드 3장 + 우측 참여사 2단을 흉내 낸다 */
export function NoticeDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="공고를 불러오는 중입니다">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-6 w-[28rem]" />
      <Skeleton className="mt-2 h-3 w-64" />

      <div className="mt-6 flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {[0, 1, 2].map((card) => (
            <div
              key={card}
              className="rounded-xl border border-border-default p-4"
            >
              <Skeleton className="h-3 w-20" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((field) => (
                  <div key={field}>
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="mt-1.5 h-3 w-32" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full shrink-0 rounded-xl border border-border-default p-4 lg:w-80">
          <Skeleton className="h-3 w-16" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="mt-4 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
