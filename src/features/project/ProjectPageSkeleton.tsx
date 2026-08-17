import ProjectListSkeleton from '@/components/project/ProjectListSkeleton';
import { Skeleton } from '@/components/Skeleton';
import { PROJECT_STATUS_LABELS } from '@/constants/status';

import { PROJECT_STATUS_OPTIONS } from './projectStatus';

// 내 프로젝트 화면 전체 껍데기 — /projects 의 Suspense 폴백이 쓴다.
// 실제 화면과 같은 순서·높이로 쌓아야 한다. 목록만 그리면 실제 화면이 뜨는 순간
// 머리글·요약 카드·필터 높이만큼 목록이 통째로 아래로 내려앉는다.
export default function ProjectPageSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1 h-[19.5px] w-72" />
      </div>

      {/* 카드 수·grid 분기를 ProjectSummaryCards 와 똑같이 둔다 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 xl:gap-7">
        {[0, 1, 2, 3, 4].map((card) => (
          <div
            key={card}
            className="flex h-24 items-center gap-4 rounded-base border border-border-default bg-bg-card px-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-[19.5px] w-20" />
              <Skeleton className="mt-0.5 h-8 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-[41px] min-w-64 flex-1 rounded-lg" />

        {/*
          탭 상자 폭은 라벨이 정한다 — w-80 처럼 어림수로 두면 상태가 늘거나
          이름이 바뀔 때 옆의 검색창 폭까지(flex-1) 함께 어긋난다.
          실물과 같은 상자 · 같은 여백에 라벨을 숨겨 넣어 폭을 스스로 맞춘다.
        */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border-default bg-bg-card p-1">
          {[
            '전체',
            ...PROJECT_STATUS_OPTIONS.map(
              (option) => PROJECT_STATUS_LABELS[option],
            ),
          ].map((label) => (
            <Skeleton key={label} className="px-3 py-1.5 text-label">
              <span className="invisible">{label}</span>
            </Skeleton>
          ))}
        </div>
      </div>

      {/* 기간·사업분류 필터 — 상자 여백은 실물 그대로 두고 안쪽 높이만 맞춘다 */}
      <div className="flex flex-wrap items-center gap-3 rounded-base border border-border-default bg-bg-card px-5 py-3">
        <Skeleton className="h-[22.5px] w-9" />
        <Skeleton className="h-[30.5px] w-[168px] rounded-[9px]" />
        <span aria-hidden className="h-3 w-px bg-bg-hover-secondary" />
        <Skeleton className="h-[30.5px] w-[168px] rounded-[9px]" />
        <span aria-hidden className="mx-2 h-6 w-px bg-bg-hover-secondary" />
        <Skeleton className="h-[22.5px] w-16" />
        <Skeleton className="h-[30.5px] w-44 rounded-[9px]" />
      </div>

      {/* 실물은 머리글·카드·페이지 이동을 한 상자에 gap-3 으로 담는다 */}
      <div className="flex flex-col gap-3">
        <ProjectListSkeleton rows={rows} />
        {/* 페이지 이동 자리 — 없으면 목록이 도착할 때 화면 끝이 늘어난다 */}
        <Skeleton className="h-[58px] w-full rounded-base" />
      </div>
    </div>
  );
}
