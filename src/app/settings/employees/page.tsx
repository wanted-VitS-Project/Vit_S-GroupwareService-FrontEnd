import { Suspense } from 'react';

import { EmployeeListSkeleton } from '@/components/settings/SettingsSkeletons';
import EmployeeList from '@/features/employee/EmployeeList';

export default function Page() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  /*
   * 폴백은 표가 아니라 **화면 골격**이다 — 표만 그리면 실제 화면이 뜨는 순간
   * 경로 표시 · 머리글 · 필터 바 높이만큼 표가 아래로 내려앉는다
   */
  return (
    <Suspense fallback={<EmployeeListSkeleton rows={20} />}>
      <EmployeeList />
    </Suspense>
  );
}
