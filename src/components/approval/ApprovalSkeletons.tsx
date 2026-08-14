import {
  Skeleton,
  SkeletonFilterBar,
  SkeletonGroup,
  SkeletonPageHeader,
} from '@/components/Skeleton';

/** 결재 상세 로딩. 좌측 본문 + 우측 결재선 2단 구성을 그대로 흉내 낸다 */
export function ApprovalDetailSkeleton() {
  return (
    <SkeletonGroup label="결재를 불러오는 중입니다" className="flex flex-col">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-4 h-5 w-96" />
      <Skeleton className="mt-2 h-3 w-56" />

      {/* 분기를 실제 화면(`ApprovalDetailView`)과 맞춘다 — 다르면 로딩이 끝나는 순간 배치가 튄다 */}
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
 * 결재 관리 목록 로딩. 표가 아니라 **카드 행**이라 `SkeletonTable` 을 쓰지 않는다.
 *
 * ⚠️ 행 높이를 `ApprovalRow` 와 **글자 단위로** 맞춘다. 예전에는 막대를
 *    `h-3.5` + `gap-1.5` + `h-2.5`(=30px) 로 두었는데, 실제 행의 글 두 줄은
 *    `text-label`(21px) + `mt-0.5`(2px) + `text-detail`(19.5px) = 42.5px 다.
 *    행마다 12px 이 모자라 10줄이면 **목록이 뜨는 순간 120px 넘게 늘어났다.**
 *    막대 자체는 얇게 두되, 담는 상자를 글자 줄 높이로 잡아 자리만 채운다.
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
 * 결재 관리 **화면 전체** 껍데기 — `Suspense` 폴백이 쓴다.
 *
 * ⚠️ 목록만 그리면 안 된다 — 실제 화면(`ApprovalList`)은
 *    `머리글(mb-6) → 탭바(mb-4) → 필터 바(mb-4) → 목록` 순이라,
 *    목록만 그린 폴백은 첫 줄이 화면 맨 위에 붙었다가 실제 화면이 뜨는 순간
 *    **200px 가까이 아래로 내려앉는다.**
 *
 * | 자리   | 실제 값                                                   |
 * | ------ | --------------------------------------------------------- |
 * | 제목   | `text-heading-m`(18px × 1.45 ≈ 26px)                       |
 * | 설명   | `text-label`(14px × 1.5 = 21px), `mt-1.5`                  |
 * | 탭바   | `px-4 py-2` + `text-label` = 37px + 아래 테두리 1px        |
 * | 필터   | 셀렉트 2개 · 검색 `w-64` — `py-2` + `text-label` = 39px    |
 */
export function ApprovalPageSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      <SkeletonPageHeader
        titleClassName="h-[26px] w-24"
        descriptionClassName="h-[21px] w-80"
      />

      {/* 탭바는 아래 테두리가 화면 폭을 가로지른다 — 막대만 두면 그 선이 빠진다 */}
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
