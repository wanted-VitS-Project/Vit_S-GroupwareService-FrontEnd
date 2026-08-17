'use client';

import { useSyncExternalStore } from 'react';

import { MOBILE_SIDEBAR_MAX_WIDTH } from './mobileSidebarClasses';

/**
 * 지금 화면이 **사이드바가 떠 있는 판이 되는 폭**인지.
 *
 * 여닫이 자체는 CSS 가 하지만(`max-[1023px]:*`), **초점 가두기 · Esc 닫기는 JS 몫**이라
 * 화면 폭을 값으로도 알아야 한다. 폭을 모르면 넓은 화면에서까지 초점이 갇혀,
 * 사이드바 옆 본문을 키보드로 못 쓰게 된다.
 *
 * ⚠️ 서버 스냅샷은 **`false`** 다 — 서버에는 화면 폭이 없다. 첫 렌더를 넓은 화면으로
 *    잡아 두고 하이드레이션 뒤에 실제 폭으로 한 번 더 그린다 (`DashboardSchedule` 과 같은 방식).
 *    반대로 두면 데스크톱 첫 페인트에서 사이드바가 잠깐 사라진다.
 */
const QUERY = `(max-width: ${MOBILE_SIDEBAR_MAX_WIDTH}px)`;

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

export function useNarrowScreen() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
