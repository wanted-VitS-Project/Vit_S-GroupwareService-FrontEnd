import DataTable, {
  type DataTableSkeletonColumn,
} from '@/components/DataTable';
import { Skeleton } from '@/components/Skeleton';

/**
 * 목록 로딩 껍데기 — **`Suspense` 폴백 전용**이다.
 * (화면 안에서의 로딩은 `NoticeList` 가 `DataTable` 에 `rows={null}` 로 그린다)
 *
 * ⚠️ 폭 · 순서 · 최소폭이 실제 표와 다르면 폴백이 실제 표로 바뀌는 순간 열이 튄다.
 *    그래서 `<table>` 을 따로 짜지 않고 **같은 `DataTable`** 에 `rows={null}` 을 넘긴다 —
 *    여백 · 헤더 배경 · 테두리가 어긋날 여지를 없앤다. 맞춰야 할 값은 폭뿐이다.
 */
const COLUMNS: DataTableSkeletonColumn[] = [
  { key: 'noticeName', header: '공고명', width: '37%', skeletonWidth: 'w-64' },
  {
    key: 'noticeAgency',
    header: '발주처',
    width: '14%',
    skeletonWidth: 'w-28',
  },
  {
    key: 'baseAmount',
    header: '기초금액',
    width: '8%',
    align: 'right',
    skeletonWidth: 'w-16',
  },
  {
    key: 'estimatedAmount',
    header: '추정가격',
    width: '8%',
    align: 'right',
    skeletonWidth: 'w-16',
  },
  { key: 'announcedAt', header: '공고일', width: '6%', skeletonWidth: 'w-20' },
  {
    key: 'bidDeadlineAt',
    header: '투찰 마감',
    width: '12%',
    skeletonWidth: 'w-24',
  },
  { key: 'noticeStatus', header: '상태', width: '5%', skeletonWidth: 'w-12' },
  { key: 'projectId', header: '전환', width: '10%', skeletonWidth: 'w-20' },
];

/** ⚠️ `NoticeList` 의 `minWidth` 와 같은 값이어야 한다 */
const MIN_WIDTH = 960;

export function NoticeListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <DataTable
      caption="입찰 공고"
      columns={COLUMNS}
      rows={null}
      minWidth={MIN_WIDTH}
      skeletonRows={rows}
    />
  );
}

/** 상세 로딩. 헤더 + 좌측 정보 카드 3장 + 우측 카드 2단을 흉내 낸다 */
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

        <div className="flex w-full flex-col gap-4 lg:w-80">
          {[0, 1].map((card) => (
            <div
              key={card}
              className="rounded-xl border border-border-default p-4"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
