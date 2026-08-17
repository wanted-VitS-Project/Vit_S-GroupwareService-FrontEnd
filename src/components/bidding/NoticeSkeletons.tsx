import DataTable, {
  type DataTableSkeletonColumn,
} from '@/components/DataTable';
import { Skeleton, SkeletonFilterBar } from '@/components/Skeleton';

/**
 * 목록 로딩 껍데기 — **`Suspense` 폴백 전용**이다.
 * (화면 안에서의 로딩은 `NoticeList` 가 `DataTable` 에 `rows={null}` 로 그린다)
 *
 * ⚠️ 폭 · 순서 · 최소폭이 실제 표와 다르면 폴백이 실제 표로 바뀌는 순간 열이 튄다.
 *    그래서 `<table>` 을 따로 짜지 않고 **같은 `DataTable`** 에 `rows={null}` 을 넘긴다 —
 *    여백 · 헤더 배경 · 테두리가 어긋날 여지를 없앤다. 맞춰야 할 값은 폭뿐이다.
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
 * 화면 전체 껍데기 — `Suspense` 폴백 · 권한 판단 대기(`PageAccessGate`)가 쓴다.
 *
 * ⚠️ 표만 그리면 안 된다 — 실제 화면(`NoticeList`)은 `머리글(mb-6) → 필터 바(mb-4) → 표`
 *    순서라, 표만 그린 폴백은 표가 맨 위에 붙었다가 실제 화면이 뜨는 순간
 *    **머리글 + 필터 바 높이만큼 아래로 내려앉는다.** 아래 값은 전부 `NoticeList` ·
 *    `NoticeFilterBar` 에서 그대로 가져온 것이다.
 *
 * | 자리        | 실제 값                                     |
 * | ----------- | ------------------------------------------- |
 * | 제목        | `text-heading-m`(18px × 1.45 ≈ 26px)         |
 * | 설명        | `text-caption`(12px × 1.5 = 18px), `mt-1.5`  |
 * | 필터 컨트롤 | 전부 `h-9` — 날짜 `w-36` 2개 · 발주처 `w-28` · 마감 임박 · 검색 `w-56` |
 * | 오른쪽 버튼 | `btn-sm`(28px) 2개 — `수집 조건` · `공고 등록` |
 *
 * ⚠️ 바깥을 `SkeletonGroup` 으로 또 감싸지 않는다 — 안쪽 표가 이미
 *    `role="status"` 를 내고 있어, 겹치면 스크린리더가 같은 안내를 두 번 읽는다.
 *    머리글 · 필터 바 막대는 `Skeleton` 자체가 `aria-hidden` 이라 읽히지 않는다.
 */
export function NoticeListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {/*
        제목 · 설명은 **회색 막대가 아니라 진짜 글자**다. 화면마다 정해진 문구라
        기다릴 이유가 없고, 막대로 흉내 내면 실제 글자로 바뀌는 순간 한 번 깜빡인다.
        ⚠️ `NoticeList` 의 머리글과 **같은 마크업**이어야 한다 — 다르면 높이가 튄다.
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
