import { ProjectSkeleton, ProjectSkeletonGroup } from './ProjectSkeleton';

export function ProjectOverviewSkeleton() {
  return (
    <ProjectSkeletonGroup
      label="프로젝트 정보를 불러오는 중입니다"
      className="flex flex-col gap-2"
    >
      <ProjectSkeleton className="h-5 w-40" />
      <ProjectSkeleton className="h-4 w-24" />
      <ProjectSkeleton className="h-3 w-full" />
      <ProjectSkeleton className="h-[5px] w-full rounded-pill" />
      <ProjectSkeleton className="h-4 w-36" />
    </ProjectSkeletonGroup>
  );
}

export function ProjectStagesSkeleton() {
  return (
    <ProjectSkeletonGroup
      label="진행 단계를 불러오는 중입니다"
      className="flex flex-col gap-2 px-4 py-3"
    >
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-2 py-1">
          <ProjectSkeleton shape="circle" className="size-3 shrink-0" />
          <ProjectSkeleton className="h-4 flex-1" />
          <ProjectSkeleton className="h-4 w-8" />
        </div>
      ))}
    </ProjectSkeletonGroup>
  );
}

export function ProjectMembersSkeleton() {
  return (
    <ProjectSkeletonGroup
      label="참여자를 불러오는 중입니다"
      className="flex items-center pt-2"
    >
      {[0, 1, 2].map((item) => (
        <ProjectSkeleton
          key={item}
          shape="circle"
          style={{ marginLeft: item === 0 ? 0 : -8 }}
          className="size-6 border border-white"
        />
      ))}
    </ProjectSkeletonGroup>
  );
}
