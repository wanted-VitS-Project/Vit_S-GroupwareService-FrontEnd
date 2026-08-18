/**
 * 알림이 바뀌었음을 화면끼리 알리는 신호.
 * 헤더 종과 알림 페이지가 부모-자식이 아니라 창 이벤트로 주고받는다.
 */
const NOTIFICATION_CHANGED = 'notification:changed';

export function notifyNotificationChanged() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(NOTIFICATION_CHANGED));
}

/** 신호를 구독한다. 반환값을 이펙트 정리 함수로 그대로 쓰면 된다 */
export function onNotificationChanged(listener: () => void) {
  window.addEventListener(NOTIFICATION_CHANGED, listener);
  return () => window.removeEventListener(NOTIFICATION_CHANGED, listener);
}

/* ─────────────────── 탭 간 공유 ─────────────────── */

/**
 * 안 읽은 개수를 탭끼리 나눠 써 중복 조회를 줄인다.
 * BroadcastChannel 을 지원하지 않으면 탭마다 각자 조회한다.
 */
const COUNT_CHANNEL = 'notification:unread-count';

export interface UnreadCountMessage {
  unreadCount: number;
  /** 보낸 시각(ms). 받은 쪽이 최신 여부를 판단하는 데 쓴다 */
  sentAt: number;
}

function isUnreadCountMessage(data: unknown): data is UnreadCountMessage {
  if (typeof data !== 'object' || data === null) return false;

  const { unreadCount, sentAt } = data as Partial<UnreadCountMessage>;

  return (
    typeof unreadCount === 'number' &&
    Number.isFinite(unreadCount) &&
    unreadCount >= 0 &&
    typeof sentAt === 'number' &&
    Number.isFinite(sentAt)
  );
}

function openChannel() {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  return new BroadcastChannel(COUNT_CHANNEL);
}

export function shareUnreadCount(
  channel: BroadcastChannel | null,
  unreadCount: number,
) {
  channel?.postMessage({
    unreadCount,
    sentAt: Date.now(),
  } satisfies UnreadCountMessage);
}

/** 다른 탭이 받아온 숫자를 구독한다. 정리 함수가 채널까지 닫는다 */
export function subscribeUnreadCount(
  listener: (message: UnreadCountMessage) => void,
) {
  const channel = openChannel();

  if (channel) {
    /* 타입만으로는 런타임을 보장할 수 없어 모양을 확인한 메시지만 넘긴다 */
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (isUnreadCountMessage(event.data)) listener(event.data);
    };
  }

  return {
    channel,
    close: () => channel?.close(),
  };
}
