import {
  Skeleton,
  SkeletonFilterBar,
  SkeletonGroup,
  SkeletonPageHeader,
} from '@/components/Skeleton';

/** 결재 상세 로딩. 본문 + 결재선 2단 구성을 그대로 흉내 낸다 */
export function ApprovalDetailSkeleton() {
  return (
    <SkeletonGroup label="결재를 불러오는 중입니다" className="flex flex-col">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-4 h-5 w-96" />
      <Skeleton className="mt-2 h-3 w-56" />

      {/* 분기 기준을 실제 화면과 맞춰야 로딩이 끝날 때 배치가 튀지 않는다 */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="rounded-base border border-border-default p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-4/5" />
          </div>
          <div className="rounded-base border border-border-default p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-10 w-full rounded-lg" />
            <Skeleton className="mt-1.5 h-10 w-full rounded-lg" />
          </div>
        </div>

        <div className="w-full shrink-0 rounded-base border border-border-default p-4 lg:w-72">
          <Skeleton className="h-3 w-16" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="mt-4 flex gap-3">
              <Skeleton shape="circle" className="size-7" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}

/**
 * 결재 목록 로딩. 표가 아니라 카드 행이라 SkeletonTable 을 쓰지 않는다.
 * 목록이 뜰 때 높이가 변하지 않도록 행 높이를 실제 행과 맞춘다.
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
          className="flex items-center gap-4 rounded-base border border-border-default px-4 py-3.5"
        >
          <Skeleton className="h-[25px] w-12 rounded-pill" />

          <div className="flex min-w-0 flex-1 flex-col">
            {/* 상자만 실제 줄 높이로 잡고 안의 막대는 얇게 둔다 */}
            <span className="flex h-[21px] items-center">
              <Skeleton className="h-3.5 w-64" />
            </span>
            <span className="mt-0.5 flex h-[19.5px] items-center">
              <Skeleton className="h-2.5 w-40" />
            </span>
          </div>

          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-24" />

          <div className="flex w-20 justify-end -space-x-1.5">
            <Skeleton shape="circle" className="size-6" />
            <Skeleton shape="circle" className="size-6" />
            <Skeleton shape="circle" className="size-6" />
          </div>

          <Skeleton className="h-[27px] w-14 rounded-lg" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/**
 * 결재 관리 화면 전체 껍데기. Suspense 폴백이 쓴다.
 * 머리글 · 탭바 · 필터 바까지 그려야 실제 화면이 뜰 때 목록이 밀리지 않는다.
 */
export function ApprovalPageSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      <SkeletonPageHeader
        titleClassName="h-[26px] w-24"
        descriptionClassName="h-[21px] w-80"
      />

      {/* 탭바 아래 테두리까지 그려야 실제 화면과 높이가 맞는다 */}
      <div className="mb-4 flex gap-1 border-b border-border-default">
        {['w-24', 'w-28', 'w-12'].map((width) => (
          <span key={width} className="flex h-[37px] items-center px-4">
            <Skeleton className={`h-3.5 ${width}`} />
          </span>
        ))}
      </div>

      <SkeletonFilterBar
        controlClassName="h-[39px]"
        widths={['w-28', 'w-28', 'w-64']}
      />

      <ApprovalListSkeleton rows={rows} />
    </>
  );
}
