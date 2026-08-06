import {
  Skeleton,
  SkeletonField,
  SkeletonGroup,
  SkeletonTable,
  type SkeletonTableColumn,
} from '@/components/Skeleton';

const shortLine = () => <Skeleton className="h-3 w-16" />;
const menuDot = () => <Skeleton shape="circle" className="ml-auto size-5" />;

export function EmployeeTableSkeleton({ rows = 10 }: { rows?: number }) {
  const columns: SkeletonTableColumn[] = [
    {
      label: '선택',
      headerClassName: 'w-10 px-3 py-3 text-transparent',
      cellClassName: 'px-3 py-3.5',
      render: () => <Skeleton className="size-3.5" />,
    },
    {
      label: '이름 · 사번',
      headerClassName: 'w-44 px-4 py-3 font-medium',
      cellClassName: 'px-4 py-3.5',
      render: () => (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      ),
    },
    {
      label: '부서 · 직급',
      headerClassName: 'px-4 py-3 font-medium',
      cellClassName: 'px-4 py-3.5',
      render: () => (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ),
    },
    {
      label: '권한',
      headerClassName: 'w-24 px-4 py-3 font-medium',
      cellClassName: 'px-4 py-3.5',
      render: () => <Skeleton className="h-5 w-12 rounded-full" />,
    },
    {
      label: '이메일',
      headerClassName: 'w-56 px-4 py-3 font-medium',
      cellClassName: 'px-4 py-3.5',
      render: () => <Skeleton className="h-3 w-36" />,
    },
    {
      label: '상태',
      headerClassName: 'w-24 px-4 py-3 font-medium',
      cellClassName: 'px-4 py-3.5',
      render: () => <Skeleton className="h-5 w-12 rounded-full" />,
    },
    {
      label: '관리',
      headerClassName: 'w-12 px-3 py-3 text-transparent',
      cellClassName: 'px-3 py-3.5',
      render: menuDot,
    },
  ];

  return (
    <SkeletonTable
      label="사원 목록을 불러오는 중입니다"
      columns={columns}
      rows={rows}
      wrapperClassName="overflow-x-auto"
      tableClassName="w-full min-w-[880px] border-collapse text-left"
    />
  );
}

export function DepartmentTableSkeleton() {
  return (
    <SkeletonTable
      label="부서 목록을 불러오는 중입니다"
      columns={[
        {
          label: '부서명',
          render: (row) => (
            <Skeleton className={`h-3 w-28 ${row % 3 === 0 ? '' : 'ml-6'}`} />
          ),
        },
        {
          label: '인원',
          headerClassName: 'w-28 px-5 py-3 font-medium',
          render: shortLine,
        },
        {
          label: '소속 사원',
          headerClassName: 'w-32 px-5 py-3 font-medium',
          render: shortLine,
        },
        {
          label: '관리',
          headerClassName: 'w-14 px-5 py-3 text-transparent',
          render: menuDot,
        },
      ]}
    />
  );
}

export function JobPositionTableSkeleton() {
  return (
    <SkeletonTable
      label="직급 목록을 불러오는 중입니다"
      columns={[
        {
          label: '순서',
          headerClassName: 'w-16 px-5 py-3 font-medium',
          render: () => <Skeleton className="h-3 w-5" />,
        },
        { label: '직급명', render: () => <Skeleton className="h-3 w-24" /> },
        {
          label: '사용 인원',
          headerClassName: 'w-28 px-5 py-3 font-medium',
          render: shortLine,
        },
        {
          label: '순서 변경',
          headerClassName: 'w-24 px-5 py-3 font-medium',
          render: () => <Skeleton className="h-5 w-12" />,
        },
        {
          label: '관리',
          headerClassName: 'w-14 px-5 py-3 text-transparent',
          render: menuDot,
        },
      ]}
    />
  );
}

export function CategoryTableSkeleton() {
  return (
    <SkeletonTable
      label="카테고리 목록을 불러오는 중입니다"
      columns={[
        {
          label: '카테고리 이름',
          headerClassName: 'w-52 px-5 py-3 font-medium',
          render: () => <Skeleton className="h-3 w-28" />,
        },
        {
          label: '업무코드',
          headerClassName: 'w-56 px-5 py-3 font-medium',
          render: () => <Skeleton className="h-5 w-24" />,
        },
        { label: '설명', render: () => <Skeleton className="h-3 w-4/5" /> },
        {
          label: '관리',
          headerClassName: 'w-14 px-5 py-3 text-transparent',
          render: menuDot,
        },
      ]}
    />
  );
}

export function EmployeeDetailSkeleton() {
  return (
    <SkeletonGroup label="사원 정보를 불러오는 중입니다" className="mt-6">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-[#1C1F2A]/10 bg-white p-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="rounded-xl border border-[#1C1F2A]/10 bg-white p-5"
          >
            <Skeleton className="mb-4 h-4 w-24" />
            <div className="flex flex-col gap-4">
              {['w-24', 'w-36', 'w-28', 'w-44'].map((width, row) => (
                <div key={row} className="flex items-center gap-4">
                  <Skeleton className="h-3 w-20 shrink-0" />
                  <Skeleton className={`h-3 ${width}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2 rounded-xl border border-[#1C1F2A]/10 bg-white p-5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
    </SkeletonGroup>
  );
}

export function EmployeeFormSkeleton() {
  return (
    <SkeletonGroup label="사원 정보를 불러오는 중입니다" className="mt-6">
      <Skeleton className="mb-2 h-5 w-24" />
      <Skeleton className="mb-6 h-3 w-72" />
      <div className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl border border-[#1C1F2A]/10 bg-white p-5">
        {Array.from({ length: 8 }, (_, field) => (
          <SkeletonField key={field} />
        ))}
      </div>
    </SkeletonGroup>
  );
}
