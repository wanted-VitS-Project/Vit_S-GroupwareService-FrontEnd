'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import BlockCacheSync from '@/features/block/BlockCacheSync';

/**
 * 전역 서버 상태 공급자.
 *
 * ⚠️ `QueryClient` 를 모듈 최상단에 만들면 **요청 간에 캐시가 공유된다.**
 *    서버 컴포넌트 트리에서 이 파일이 한 번만 평가되기 때문이다.
 *    `useState` 초기화로 두면 브라우저 세션마다 새 인스턴스를 갖는다.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /**
             * 30초 안에 다시 찾은 화면은 요청 없이 캐시를 그대로 쓴다.
             * 스텝 탭을 오갈 때 스켈레톤이 다시 뜨지 않게 하는 값이다.
             */
            staleTime: 30_000,
            /** 캐시를 5분 보관 — 이 사이에 돌아오면 즉시 그려주고 뒤에서 갱신한다 */
            gcTime: 5 * 60_000,
            /** 창을 다시 클릭할 때마다 재조회하지는 않는다 (블록은 화면 복귀 시점에만 읽는다) */
            refetchOnWindowFocus: false,
            /** 4xx 는 다시 시도해도 같은 답이다 — 네트워크 오류만 한 번 더 */
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* 화면 밖(재무 등)에서 바뀐 블록도 보드로 돌아오는 순간 다시 읽히게 한다 */}
      <BlockCacheSync />
      {children}
    </QueryClientProvider>
  );
}
