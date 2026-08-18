'use client';

import { iconOf } from './display';
import { formatFullTime, notificationTimeLabel } from './time';
import { isUnread, type NotificationItem } from './types';

/**
 * 알림 한 줄. 헤더 드롭다운과 알림 페이지가 같은 모양을 쓴다.
 * 안 읽은 알림은 색과 점 두 가지로 표시한다.
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
  /** 상대 시간 대신 절대 시각을 보여준다 */
  showFullTime?: boolean;
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
        {/* 길이가 제각각이라 한 줄로 자른다 */}
        <p className="mt-0.5 truncate text-caption text-text-secondary">
          {notification.message}
        </p>
        {/* 형식이 어긋나면 빈 값이라 줄이 접힌다 */}
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
