import { Suspense } from 'react';

import { ApprovalPageSkeleton } from '@/components/approval/ApprovalSkeletons';
import ApprovalList from '@/features/approval/ApprovalList';

export default function Page() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  /* 폴백은 목록이 아니라 화면 골격이다. 목록만 그리면 배치가 튄다 */
  return (
    <Suspense fallback={<ApprovalPageSkeleton rows={10} />}>
      <ApprovalList />
    </Suspense>
  );
}
