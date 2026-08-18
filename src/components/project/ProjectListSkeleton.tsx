import ProjectListHeader, {
  PROJECT_ROW_GRID,
  PROJECT_ROW_NAME_SPAN,
} from '@/components/project/ProjectListHeader';
import { Skeleton, SkeletonGroup } from '@/components/Skeleton';

// 내 프로젝트 목록 로딩. 표가 아니라 카드 행이라 SkeletonTable 을 쓰지 않는다.
// 대시보드·/projects 가 함께 쓴다 — 어느 화면의 데이터 구조도 알지 않고,
// 칸 너비·머리글만 ProjectListHeader 에서 받아 온다.
// 목록 머리글을 함께 그린다 — 두 화면 모두 실물은 머리글 → 카드 순인데
// 예전에는 카드만 그려서, 목록이 도착하는 순간 머리글 높이(약 37px)만큼
// 카드가 통째로 내려앉았다. 머리글은 데이터 없이 그릴 수 있는 정적 markup 이므로
// 실물을 그대로 쓴다 — 베껴 적으면 칸 이름·여백이 바뀔 때 조용히 어긋난다.
// 높이를 통짜 숫자(h-[74px])로 두지 않는다 — 실제 카드(ProjectCard)의
// 여백과 칸 너비를 그대로 옮겨 적는다. 예전에는 74px 로 고정해 두었는데
// 실제 접힌 카드는 py-4(32px) + 배지 한 줄(text-label 21px + py-0.5 4px)
// ≈ 57px 이라, 10줄이면 목록이 뜨는 순간 화면이 170px 가까이 솟구쳤다.
// 카드 쪽 여백이 바뀌면 여기도 같이 바뀌어야 하므로 값을 나란히 적어 둔다.
// 칸 너비는 PROJECT_ROW_GRID 하나가 정한다 — 여기서 따로 적지 않는다.
// 예전에는 w-16·w-32 를 손으로 베껴 적었는데, 카드 쪽 폭이 바뀌면 조용히 어긋났다.
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
          {/* 실제 카드와 같은 머리글 구조 — 링크(px-5 py-4) + 펼침 버튼 */}
          <div className="flex items-center gap-2 pr-3">
            {/*
              ⚠️ 여백도 **실제 카드와 같은 분기**여야 한다 (`ProjectCard` 의 링크).
                 여기만 `px-5 py-4` 로 두면 접힌 폭에서 로딩 행이 더 높아, 목록이
                 도착하는 순간 줄마다 조금씩 내려앉는다.
            */}
            <div
              className={`${PROJECT_ROW_GRID} min-w-0 flex-1 px-4 py-3.5 xl:px-5 xl:py-4`}
            >
              <Skeleton className="h-[25px] rounded-pill" />
              {/*
                분류 태그가 이 줄에서 가장 높다 — 카드 높이를 정하는 값이다.
                `text-label` 21px + `py-0.5` 4px + `border-[1.5px]` 3px = 28px.
              */}
              <Skeleton className="h-[28px] rounded-[9px]" />
              {/* 과업명 — 실제 카드와 같이 접힌 폭에서 두 칸을 쓴다 (줄 수가 맞아야 높이가 맞다) */}
              <Skeleton
                className={`h-[15px] min-w-0 ${PROJECT_ROW_NAME_SPAN}`}
              />
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
