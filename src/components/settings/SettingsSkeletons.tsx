import DataTable, {
  type DataTableSkeletonColumn,
} from '@/components/DataTable';
import { Skeleton, SkeletonField, SkeletonGroup } from '@/components/Skeleton';

/**
 * 사원 목록 로딩 껍데기 — **`Suspense` 폴백 전용**이다.
 * (화면 안에서의 로딩은 `EmployeeList` 가 `DataTable` 에 `rows={null}` 로 그린다)
 *
 * ⚠️ `<table>` 을 따로 짜지 않고 **같은 `DataTable`** 에 `rows={null}` 을 넘긴다 —
 *    이전에는 여백(`px-3`·`px-4` vs `px-5`) · 헤더 배경 · 최소폭(880 vs 960)이 어긋나
 *    폴백이 실제 표로 바뀌는 순간 열이 튀었다. 맞춰야 할 값은 폭뿐이다.
 */
const EMPLOYEE_COLUMNS: DataTableSkeletonColumn[] = [
  { key: 'select', header: '', width: '3rem', skeletonWidth: 'w-4' },
  {
    key: 'name',
    header: '이름 · 사번',
    width: '11rem',
    skeletonWidth: 'w-24',
  },
  { key: 'department', header: '부서 · 직급', skeletonWidth: 'w-40' },
  { key: 'role', header: '권한', width: '6rem', skeletonWidth: 'w-14' },
  { key: 'email', header: '이메일', width: '14rem', skeletonWidth: 'w-40' },
  { key: 'status', header: '상태', width: '6rem', skeletonWidth: 'w-12' },
  {
    key: 'menu',
    header: '',
    width: '3.5rem',
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
