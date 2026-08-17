import { Suspense } from 'react';

import SettlementStatusList from '@/features/finance/SettlementStatusList';

export default function Page() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  return (
    <Suspense>
      <SettlementStatusList />
    </Suspense>
  );
}
