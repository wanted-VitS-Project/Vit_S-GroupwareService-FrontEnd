import { Skeleton, SkeletonGroup } from '@/components/Skeleton';
import { PROJECT_STATUS_LABELS } from '@/constants/status';
import {
  PROJECT_ROW_GRID,
  ProjectListHeader,
} from '@/features/project/ProjectCard';
import { PROJECT_STATUS_OPTIONS } from '@/features/project/projectStatus';

/**
 * 내 프로젝트 목록 로딩. 표가 아니라 **카드 행**이라 `SkeletonTable` 을 쓰지 않는다.
 *
 * ⚠️ 목록 머리글(`ProjectListHeader`)을 **함께 그린다** — 대시보드 · `/projects` 둘 다
 *    실물은 `머리글 → 카드` 순인데 예전에는 카드만 그려서, 목록이 도착하는 순간
 *    머리글 높이(약 37px)만큼 카드가 통째로 내려앉았다.
 *    머리글은 데이터가 없어도 그릴 수 있는 정적 markup 이므로 **실물을 그대로 쓴다** —
 *    베껴 적으면 칸 이름 · 여백이 바뀔 때 조용히 어긋난다.
 *
 * ⚠️ 높이를 통짜 숫자(`h-[74px]`)로 두지 않는다 — 실제 카드(`ProjectCard`)의
 *    **여백과 칸 너비를 그대로 옮겨** 적는다. 예전에는 74px 로 고정해 두었는데
 *    실제 접힌 카드는 `py-4`(32px) + 배지 한 줄(`text-label` 21px + `py-0.5` 4px)
 *    ≈ 57px 이라, 10줄이면 목록이 뜨는 순간 화면이 **170px 가까이 솟구쳤다.**
 *    카드 쪽 여백이 바뀌면 여기도 같이 바뀌어야 하므로 값을 나란히 적어 둔다.
 *
 * ⚠️ 칸 너비는 **`PROJECT_ROW_GRID` 하나가 정한다** — 여기서 따로 적지 않는다.
 *    예전에는 `w-16` · `w-32` 를 손으로 베껴 적었는데, 카드 쪽 폭이 바뀌면 조용히 어긋났다.
 */
export default function ProjectListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonGroup
      label="프로젝트 목록을 불러오는 중입니다"
      className="flex flex-col gap-3"
    >
      <ProjectListHeader />

      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="rounded-base border border-border-default bg-bg-card"
        >
          {/* 실제 카드와 같은 머리글 구조 — 링크(`px-5 py-4`) + 펼침 버튼 */}
          <div className="flex items-center gap-2 pr-3">
            <div className={`${PROJECT_ROW_GRID} min-w-0 flex-1 px-5 py-4`}>
              <Skeleton className="h-[25px] rounded-pill" />
              {/*
                분류 태그가 이 줄에서 가장 높다 — 카드 높이를 정하는 값이다.
                `text-label` 21px + `py-0.5` 4px + `border-[1.5px]` 3px = 28px.
              */}
              <Skeleton className="h-[28px] rounded-[9px]" />
              <Skeleton className="h-[15px] min-w-0" />
              <Skeleton className="h-[15px]" />
              <Skeleton className="h-[15px]" />

              <span className="flex items-center -space-x-1.5">
                {[0, 1, 2].map((avatar) => (
                  <Skeleton
                    key={avatar}
                    shape="circle"
                    className="size-6 border border-white"
                  />
                ))}
              </span>

              <span className="flex items-center gap-3">
                <Skeleton className="h-2 flex-1 rounded-pill" />
                <Skeleton className="h-[15px] w-9 shrink-0" />
              </span>
            </div>

            <Skeleton className="size-9 shrink-0 rounded-lg" />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

/**
 * 내 프로젝트 **화면 전체** 껍데기 — `Suspense` 폴백이 쓴다.
 *
 * ⚠️ 목록만 그리면 안 된다 — 실제 화면(`MyProjectList`)은 `gap-5` 로
 *    `머리글 → 통계 카드 5장 → 검색·상태 탭 → 기간·사업분류 필터 → 목록 → 페이지 이동` 을 쌓는다.
 *    목록만 그린 폴백은 첫 카드가 화면 맨 위에 붙었다가 실제 화면이 뜨는 순간
 *    **300px 넘게 아래로 내려앉는다.** 이 화면이 앱에서 가장 크게 튀던 자리다.
 *
 * | 자리        | 실제 값                                                |
 * | ----------- | ------------------------------------------------------ |
 * | 제목        | `text-logo` + `leading-8`(32px)                        |
 * | 설명        | `text-[13px]`(≈19.5px), `mt-1`                         |
 * | 통계 카드   | `h-24` 5장 — 같은 grid 분기를 그대로 쓴다               |
 * | 검색        | `h-[41px]`, `min-w-64 flex-1`                          |
 * | 상태 탭     | `p-1` 상자 + `py-1.5 text-label` 버튼 = 43px           |
 * | 기간 필터   | `px-5 py-3` 상자 + 날짜 태그 30.5px = 56.5px           |
 * | 페이지 이동 | `px-5 py-3` + 버튼 31px + 위아래 테두리 = 58px         |
 */
export function ProjectPageSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1 h-[19.5px] w-72" />
      </div>

      {/* 카드 수 · grid 분기를 `ProjectSummaryCards` 와 똑같이 둔다 */}
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
          탭 상자 폭은 **라벨이 정한다** — `w-80` 처럼 어림수로 두면 상태가 늘거나
          이름이 바뀔 때 옆의 검색창 폭까지(`flex-1`) 함께 어긋난다.
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

      {/* 기간 · 사업분류 필터 — 상자 여백은 실물 그대로 두고 안쪽 높이만 맞춘다 */}
      <div className="flex flex-wrap items-center gap-3 rounded-base border border-border-default bg-bg-card px-5 py-3">
        <Skeleton className="h-[22.5px] w-9" />
        <Skeleton className="h-[30.5px] w-[168px] rounded-[9px]" />
        <span aria-hidden className="h-3 w-px bg-bg-hover-secondary" />
        <Skeleton className="h-[30.5px] w-[168px] rounded-[9px]" />
        <span aria-hidden className="mx-2 h-6 w-px bg-bg-hover-secondary" />
        <Skeleton className="h-[22.5px] w-16" />
        <Skeleton className="h-[30.5px] w-44 rounded-[9px]" />
      </div>

      {/* 실물은 `머리글 · 카드 · 페이지 이동` 을 한 상자에 `gap-3` 으로 담는다 */}
      <div className="flex flex-col gap-3">
        <ProjectListSkeleton rows={rows} />
        {/* 페이지 이동 자리 — 없으면 목록이 도착할 때 화면 끝이 늘어난다 */}
        <Skeleton className="h-[58px] w-full rounded-base" />
      </div>
    </div>
  );
}
