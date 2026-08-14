import { Suspense } from 'react';

import { ApprovalPageSkeleton } from '@/components/approval/ApprovalSkeletons';
import ApprovalList from '@/features/approval/ApprovalList';

export default function Page() {
  // useSearchParams 를 쓰는 화면은 Suspense 경계가 있어야 프리렌더가 통과한다
  /*
   * 폴백은 목록이 아니라 **화면 골격**이다 — 목록만 그리면 실제 화면이 뜨는 순간
   * 머리글 · 탭바 · 필터 바 높이만큼 목록이 아래로 내려앉는다
   */
  return (
    <Suspense fallback={<ApprovalPageSkeleton rows={10} />}>
      <ApprovalList />
    </Suspense>
  );
}
