import {
  ProjectSkeleton,
  ProjectSkeletonGroup,
} from '@/components/project/ProjectSkeleton';

export function BlockBoardSkeleton() {
  return (
    <ProjectSkeletonGroup
      label="블록을 불러오는 중입니다"
      className="grid grid-cols-3 gap-4"
    >
      {[0, 1, 2].map((column) => (
        <div
          key={column}
          className="h-56 rounded-lg border border-border-default bg-white p-3"
        >
          <div className="flex items-center gap-2 border-b border-border-default pb-3">
            <ProjectSkeleton shape="circle" className="size-5" />
            <ProjectSkeleton className="h-3 w-24" />
          </div>
          <ProjectSkeleton className="mt-4 h-3 w-full" />
          <ProjectSkeleton className="mt-2 h-3 w-4/5" />
          <ProjectSkeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </ProjectSkeletonGroup>
  );
}

export function FileListSkeleton() {
  return (
    <ProjectSkeletonGroup
      label="문서를 불러오는 중입니다"
      className="flex flex-col gap-1.5"
    >
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex h-11 items-center gap-2 rounded-lg bg-bg-surface px-2.5"
        >
          <ProjectSkeleton className="size-5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <ProjectSkeleton className="h-2.5 w-2/3" />
            <ProjectSkeleton className="h-2 w-1/3" />
          </div>
        </div>
      ))}
    </ProjectSkeletonGroup>
  );
}
