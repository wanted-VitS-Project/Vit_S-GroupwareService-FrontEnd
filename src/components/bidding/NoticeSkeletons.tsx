import DataTable, {
  type DataTableSkeletonColumn,
} from '@/components/DataTable';
import { Skeleton, SkeletonFilterBar } from '@/components/Skeleton';

/**
 * 목록 로딩 껍데기. Suspense 폴백 전용이다.
 * 열이 튀지 않도록 표를 따로 짜지 않고 같은 DataTable 에 rows={null} 을 넘긴다.
 */
const COLUMNS: DataTableSkeletonColumn[] = [
  { key: 'noticeName', header: '공고명', width: '30%', skeletonWidth: 'w-64' },
  {
    key: 'noticeAgency',
    header: '발주처',
    width: '16%',
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
  {
    key: 'announcedAt',
    header: '공고일',
    width: '10%',
    skeletonWidth: 'w-20',
  },
  {
    key: 'bidDeadlineAt',
    header: '투찰 마감',
    width: '18%',
    skeletonWidth: 'w-24',
  },
  {
    key: 'noticeStatus',
    header: '상태',
    width: '10%',
    skeletonWidth: 'w-12',
  },
];

/** 표만 그리는 껍데기. 머리글 · 필터 바가 이미 있는 자리에서 쓴다 */
export function NoticeTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <DataTable
      caption="입찰 공고"
      columns={COLUMNS}
      rows={null}
      dense
      skeletonRows={rows}
    />
  );
}

/**
 * 화면 전체 껍데기. Suspense 폴백 · 권한 판단 대기가 쓴다.
 * 표만 그리면 실제 화면이 뜰 때 머리글 · 필터 바 높이만큼 내려앉아 함께 흉내 낸다.
 */
export function NoticeListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {/*
        제목 · 설명은 회색 막대가 아니라 진짜 글자다. 화면마다 정해진 문구라 기다릴 이유가 없다.
        NoticeList 의 머리글과 같은 마크업이어야 높이가 튀지 않는다.
      */}
      <div className="mb-6">
        <h2 className="text-heading-m font-bold">공고 조회</h2>
        <p className="mt-1.5 text-caption break-keep text-text-secondary">
          수집된 입찰 공고를 확인합니다.
        </p>
      </div>

      <SkeletonFilterBar
        widths={['w-36', 'w-4', 'w-36', 'w-28', 'w-20', 'w-56']}
        trailing={
          <>
            <Skeleton className="h-7 w-20 rounded-button-sm" />
            <Skeleton className="h-7 w-20 rounded-button-sm" />
          </>
        }
      />

      <NoticeTableSkeleton rows={rows} />
    </>
  );
}

/** 공고 등록 · 수정 폼 껍데기. 구획 5개를 그대로 흉내 낸다 */
export function NoticeFormSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="공고를 불러오는 중입니다"
      className="mx-auto w-full max-w-[820px]"
    >
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-6 w-40" />

      <div className="mt-6 flex flex-col gap-4">
        {[0, 1, 2, 3, 4].map((section) => (
          <div
            key={section}
            className="rounded-base border border-border-default p-4"
          >
            <Skeleton className="h-3 w-24" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              {[0, 1].map((field) => (
                <div key={field}>
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="mt-1.5 h-8 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
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
              className="rounded-base border border-border-default p-4"
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
              className="rounded-base border border-border-default p-4"
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
