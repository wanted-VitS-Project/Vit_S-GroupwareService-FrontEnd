'use client';

import { iconOf } from './display';
import { formatFullTime, notificationTimeLabel } from './time';
import { isUnread, type NotificationItem } from './types';

/**
 * 알림 한 줄. 헤더 드롭다운과 알림 페이지가 같은 모양을 쓴다.
 *
 * 읽지 않은 알림은 **배경색과 점** 두 가지로 표시한다 —
 * 색만으로 구분하면 색을 구별하지 못하는 사용자에게는 전부 같아 보인다.
 */
export default function NotificationRow({
  notification,
  disabled,
  onOpen,
  showFullTime = false,
  trailing,
}: {
  notification: NotificationItem;
  disabled: boolean;
  onOpen: () => void;
  /**
   * 상대 시간(`10분 전`) 대신 **절대 시각**(`2026.08.07 18:47`)을 보여준다.
   * 전체 목록은 날짜 머리로 이미 묶여 있어 `어제` 를 또 적으면 같은 말이 두 번이다.
   */
  showFullTime?: boolean;
  /** 오른쪽에 덧붙일 것 — 알림 페이지의 케밥 메뉴가 들어온다 */
  trailing?: React.ReactNode;
}) {
  const unread = isUnread(notification);
  const icon = iconOf(notification.notificationType);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${
        unread ? 'bg-blue-bg-soft' : 'bg-bg-card'
      }`}
    >
      <span
        aria-hidden
        className={`flex size-8 shrink-0 items-center justify-center rounded-pill text-caption ${icon.className}`}
      >
        {icon.symbol}
      </span>

      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className="min-w-0 flex-1 cursor-pointer text-left disabled:cursor-not-allowed"
      >
        <p className="truncate text-caption font-bold text-text-primary">
          {notification.title}
        </p>
        {/* 한 줄로 자른다 — 알림마다 길이가 달라 목록이 들쭉날쭉해진다 */}
        <p className="mt-0.5 truncate text-caption text-text-secondary">
          {notification.message}
        </p>
        {/* 형식이 어긋나면 빈 값이라 `empty:hidden` 으로 줄이 접힌다 */}
        <p className="mt-1 text-caption text-text-secondary empty:hidden">
          {showFullTime
            ? formatFullTime(notification.createdAt)
            : notificationTimeLabel(notification.createdAt)}
        </p>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        {trailing}
        {unread && (
          <span
            role="img"
            aria-label="읽지 않음"
            className="size-1.5 rounded-pill bg-btn-primary"
          />
        )}
      </div>
    </div>
  );
}
