'use client';

import { useEffect } from 'react';

import { notifyNotificationChanged } from './events';
import { subscribeNotificationStream } from './stream';

/**
 * 알림 스트림을 **앱에 하나만** 열어 두는 자리.
 *
 * 화면(라우트)마다 리마운트되는 컴포넌트 안에 두면 이동할 때마다 연결이 끊겼다 붙는다.
 * 그래서 셸(`AppShell`)에 두고, 세션이 확인된 뒤에만 열리도록 `CurrentUserProvider`
 * **안쪽**에 놓는다 — 로그인 화면에서는 아예 구독하지 않는다.
 *
 * 받은 신호는 창 이벤트로 흘린다 — 종(`NotificationBell`)과 알림 페이지가 이미
 * 이 신호를 듣고 있어서(`onNotificationChanged`) 양쪽이 함께 갱신된다.
 *
 * ℹ️ 그리는 것이 없다. 연결만 들고 있는 컴포넌트다.
 * ℹ️ 정리 함수에서 반드시 닫는다 — StrictMode 는 개발 모드에서 마운트를 두 번 하고,
 *    닫지 않으면 연결이 둘로 늘어 같은 알림에 두 번 반응한다.
 *    로그아웃하면 이 컴포넌트가 사라지며 함께 닫혀 다음 계정과 섞이지 않는다.
 */
export default function NotificationStreamProvider() {
  useEffect(
    () => subscribeNotificationStream({ onChanged: notifyNotificationChanged }),
    [],
  );

  return null;
}
