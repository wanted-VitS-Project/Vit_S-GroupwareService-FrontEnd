import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  NotificationPage,
  NotificationQuery,
  NotificationTarget,
  ReadNotificationResponse,
} from './types';

/** 값이 있는 필터만 실어 보낸다 — 빈 값을 보내면 그 값으로 거른다 */
function toSearchParams(query: NotificationQuery) {
  const params = new URLSearchParams();

  if (query.category) params.set('category', query.category);
  // false 가 유효한 값이라(안 읽음만) falsy 로 거르지 않는다
  if (query.isRead !== undefined) params.set('isRead', String(query.isRead));
  // page 도 0 이 유효하다
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.size !== undefined) params.set('size', String(query.size));

  return params.toString();
}

/**
 * 알림 목록. **본인 알림만** 최신순으로 온다 (.ai/API.md 79).
 *
 * ℹ️ 배지 숫자는 `content.length` 가 아니라 `totalElements` 를 쓴다 — 목록은 `size` 에 잘린다.
 */
export function getNotifications(
  query: NotificationQuery,
  signal?: AbortSignal,
) {
  const search = toSearchParams(query);
  const path = search
    ? `${ENDPOINTS.notifications.root}?${search}`
    : ENDPOINTS.notifications.root;

  return api.get<NotificationPage>(path, signal);
}

/**
 * 알림 이동 대상 (.ai/API.md 80).
 *
 * ⚠️ **조회가 읽음 처리를 겸한다.** 그래서 클릭 이동 경로에서는 읽음 API 를 따로 부르지 않는다.
 * 이동할 곳이 없으면 `type: 'NONE'` 으로 오는데 그것도 200 이고, 읽음은 그대로 된다.
 */
export function getNotificationTarget(notificationId: number) {
  return api.get<NotificationTarget>(
    ENDPOINTS.notifications.target(notificationId),
  );
}

/** 이동 없이 읽음만 표시한다. 멱등이라 이미 읽은 알림도 200 이다 */
export function readNotification(notificationId: number) {
  return api.patch<ReadNotificationResponse>(
    ENDPOINTS.notifications.read(notificationId),
  );
}

/**
 * 전체 읽음.
 * ❗ 응답 본문이 확인되지 않아 쓰지 않는다 — 성공 여부만 보고 목록을 다시 받는다.
 */
export function readAllNotifications() {
  return api.patch<unknown>(ENDPOINTS.notifications.readAll);
}

/** 개별 삭제. **논리 삭제**라 목록에서만 빠진다 */
export function deleteNotification(notificationId: number) {
  return api.delete<void>(ENDPOINTS.notifications.detail(notificationId));
}
