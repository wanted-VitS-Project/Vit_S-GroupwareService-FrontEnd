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
 * 사원 목록 로딩 껍데기 — **`Suspense` 폴백 전용**이다.
 * (화면 안에서의 로딩은 `EmployeeList` 가 `DataTable` 에 `rows={null}` 로 그린다)
 *
 * ⚠️ `<table>` 을 따로 짜지 않고 **같은 `DataTable`** 에 `rows={null}` 을 넘긴다 —
 *    이전에는 여백(`px-3`·`px-4` vs `px-5`) · 헤더 배경 · 최소폭(880 vs 960)이 어긋나
 *    폴백이 실제 표로 바뀌는 순간 열이 튀었다. 맞춰야 할 값은 폭뿐이다.
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
 * 사원 관리 **화면 전체** 껍데기 — `Suspense` 폴백이 쓴다.
 *
 * ⚠️ 표만 그리면 안 된다 — 실제 화면(`EmployeeList`)은
 *    `머리글(mt-2 mb-6) → 필터 바(mb-4) → 표` 순이라, 표만 그린 폴백은 표가 맨 위에
 *    붙었다가 실제 화면이 뜨는 순간 **머리글 + 필터 바 높이만큼 아래로 내려앉는다.**
 *
 * | 자리        | 실제 값                                              |
 * | ----------- | ---------------------------------------------------- |
 * | 경로 표시   | `Breadcrumb` — `text-caption`(12px × 1.5 = 18px)      |
 * | 제목        | `text-heading-m`(18px × 1.45 ≈ 26px)                  |
 * | 설명        | `text-label`(14px × 1.5 = 21px), `mt-1.5` — **두 줄**  |
 * | 오른쪽 버튼 | `btn-md`(34px) 2개 — `일괄 등록` · `+ 사원 등록`       |
 * | 필터        | 검색 · 셀렉트 3개 · `퇴사자 포함` 체크                 |
 *
 * ⚠️ 필터 컨트롤은 `h-9`(36px) 가 **아니다** — `py-2` + `text-label`(21px) + 테두리 2px
 *    = 39px 다. 36px 로 잡으면 줄마다 3px 씩 어긋난다.
 *
 * ⚠️ 바깥을 `SkeletonGroup` 으로 또 감싸지 않는다 — 안쪽 표가 이미 `role="status"` 다.
 */
export function EmployeeListSkeleton({ rows = 20 }: { rows?: number }) {
  return (
    <>
      {/*
        이동 경로 · 제목 · 설명은 **회색 막대가 아니라 진짜 글자**다. 화면마다 정해진
        문구라 기다릴 이유가 없고, 막대로 흉내 내면 실제 글자로 바뀔 때 한 번 깜빡인다.
        ⚠️ `EmployeeList` 의 머리글과 **같은 마크업**이어야 한다 — 다르면 높이가 튄다.
        ℹ️ 오른쪽 버튼만 막대로 남긴다 — 눌러도 동작하지 않는 버튼을 그려 두면
           기다리는 동안 눌러 보고 고장으로 읽는다.
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
          <Skeleton className="h-[34px] w-24 rounded-button-md" />
          <Skeleton className="h-[34px] w-28 rounded-button-md" />
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
