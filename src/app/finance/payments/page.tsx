import { Suspense } from 'react';

import { CashFlowListSkeleton } from '@/components/finance/CashFlowSkeletons';
import CashFlowList from '@/features/finance/CashFlowList';

export default function Page() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  return (
    <Suspense fallback={<CashFlowListSkeleton />}>
      <CashFlowList />
    </Suspense>
  );
}
