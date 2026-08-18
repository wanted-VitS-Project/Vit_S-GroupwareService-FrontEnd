'use client';

import { useEffect } from 'react';

import { notifyNotificationChanged } from './events';
import { subscribeNotificationStream } from './stream';

/**
 * 알림 스트림을 앱에 하나만 열어 두는 자리. 그리는 것 없이 연결만 들고 있다.
 * 받은 신호는 창 이벤트로 흘려 종과 알림 페이지가 함께 갱신되게 한다.
 */
export default function NotificationStreamProvider() {
  useEffect(
    () => subscribeNotificationStream({ onChanged: notifyNotificationChanged }),
    [],
  );

  return null;
}
