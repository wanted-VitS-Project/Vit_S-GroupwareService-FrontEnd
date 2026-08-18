import Breadcrumb from '@/components/Breadcrumb';
import DataTable, {
  type DataTableSkeletonColumn,
} from '@/components/DataTable';
import {
  Skeleton,
  SkeletonField,
  SkeletonFilterBar,
  SkeletonGroup,
} from '@/components/Skeleton';

/**
 * 사원 목록 로딩 껍데기. Suspense 폴백 전용이다.
 * 열이 튀지 않게 표를 따로 짜지 않고 같은 DataTable 에 rows={null} 을 넘긴다.
 */
const EMPLOYEE_COLUMNS: DataTableSkeletonColumn[] = [
  { key: 'select', header: '', width: '5%', skeletonWidth: 'w-4' },
  {
    key: 'name',
    header: '이름 · 사번',
    width: '22%',
    skeletonWidth: 'w-24',
  },
  {
    key: 'department',
    header: '부서 · 직급',
    width: '20%',
    skeletonWidth: 'w-40',
  },
  {
    key: 'role',
    header: '권한',
    width: '11%',
    skeletonWidth: 'w-14',
  },
  { key: 'email', header: '이메일', width: '25%', skeletonWidth: 'w-40' },
  {
    key: 'status',
    header: '상태',
    width: '11%',
    skeletonWidth: 'w-12',
  },
  {
    key: 'menu',
    header: '',
    width: '6%',
    align: 'right',
    skeletonWidth: 'w-6',
  },
];

export function EmployeeTableSkeleton({ rows = 20 }: { rows?: number }) {
  return (
    <DataTable
      caption="사원 목록"
      columns={EMPLOYEE_COLUMNS}
      rows={null}
      dense
      skeletonRows={rows}
    />
  );
}

/**
 * 사원 관리 화면 전체 껍데기. Suspense 폴백이 쓴다.
 * 표만 그리면 실제 화면이 뜰 때 머리글 · 필터 바 높이만큼 내려앉아 함께 흉내 낸다.
 */
export function EmployeeListSkeleton({ rows = 20 }: { rows?: number }) {
  return (
    <>
      {/*
        이동 경로 · 제목 · 설명은 회색 막대가 아니라 진짜 글자다. 화면마다 정해진 문구다.
        오른쪽 버튼만 막대로 남긴다. 눌러도 안 되는 버튼은 고장으로 읽힌다.
      */}
      <Breadcrumb
        items={[
          { label: '전사 관리', href: '/settings' },
          { label: '사원 관리' },
        ]}
      />

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-heading-m font-bold">사원 관리</h2>
          <p className="mt-1.5 text-label break-keep text-text-secondary">
            사원 정보와 계정 상태를 관리합니다. 등록하면 로그인 계정이 함께
            발급됩니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-8.5 w-24 rounded-button-md" />
          <Skeleton className="h-8.5 w-28 rounded-button-md" />
        </div>
      </div>

      <SkeletonFilterBar
        controlClassName="h-[39px]"
        widths={['w-64', 'w-28', 'w-28', 'w-28', 'w-24']}
      />

      <EmployeeTableSkeleton rows={rows} />
    </>
  );
}

export function EmployeeDetailSkeleton() {
  return (
    <SkeletonGroup label="사원 정보를 불러오는 중입니다" className="mt-6">
      <div className="mb-4 flex items-center justify-between rounded-base border border-border-default bg-bg-card p-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-12 rounded-pill" />
          </div>
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="rounded-base border border-border-default bg-bg-card p-5"
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
      <div className="mt-4 flex gap-2 rounded-base border border-border-default bg-bg-card p-5">
        <Skeleton className="h-6 w-20 rounded-pill" />
        <Skeleton className="h-6 w-28 rounded-pill" />
      </div>
    </SkeletonGroup>
  );
}

export function EmployeeFormSkeleton() {
  return (
    <SkeletonGroup label="사원 정보를 불러오는 중입니다" className="mt-6">
      <Skeleton className="mb-2 h-5 w-24" />
      <Skeleton className="mb-6 h-3 w-72" />
      <div className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-base border border-border-default bg-bg-card p-5">
        {Array.from({ length: 8 }, (_, field) => (
          <SkeletonField key={field} />
        ))}
      </div>
    </SkeletonGroup>
  );
}
