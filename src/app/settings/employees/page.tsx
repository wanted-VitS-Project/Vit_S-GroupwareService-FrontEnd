import { Suspense } from 'react';

import EmployeeList from '@/features/employee/EmployeeList';

export default function Page() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  return (
    <Suspense fallback={<p className="text-xs text-[#6C7389]">불러오는 중…</p>}>
      <EmployeeList />
    </Suspense>
  );
}
