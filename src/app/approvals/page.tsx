import { Suspense } from 'react';

import { ApprovalListSkeleton } from '@/components/approval/ApprovalSkeletons';
import ApprovalList from '@/features/approval/ApprovalList';

export default function Page() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  return (
    <Suspense fallback={<ApprovalListSkeleton rows={10} />}>
      <ApprovalList />
    </Suspense>
  );
}
