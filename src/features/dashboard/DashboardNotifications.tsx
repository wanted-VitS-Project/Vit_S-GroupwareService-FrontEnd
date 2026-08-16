'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  getNotifications,
  getNotificationTarget,
} from '@/features/notification/api';
import { routeOf } from '@/features/notification/display';
import {
  notifyNotificationChanged,
  onNotificationChanged,
} from '@/features/notification/events';
import { NOTIFICATION_ROUTES } from '@/features/notification/routes';
import type { NotificationItem } from '@/features/notification/types';
import { messageOf } from '@/lib/api';

/**
 * 대시보드에 세우는 알림 수. 카드 높이가 옆 일정 카드와 맞아야 해서 상한을 둔다 —
 * 더 보려면 `전체보기` 로 알림 화면에 간다.
 */
const LIMIT = 7;

/**
 * 대시보드 `알림`.
 *
 * ⭐ **미확인이 항상 위다.** 서버는 읽음 여부와 무관하게 최신순으로만 주므로
 *    `안 읽음` · `읽음` 을 따로 받아 이어 붙인다 — 오래된 미확인이 새 알림에 밀려
 *    아래로 내려가면 처리해야 할 것을 놓친다.
 * ⭐ 다 읽은 사용자에게 빈 상자를 보이지 않으려고 읽은 알림으로 남은 자리를 채운다.
 * ℹ️ 읽음 · 삭제 같은 처리는 두지 않는다 — 여기는 훑는 자리고, 처리는 알림 화면 몫이다.
 *    (이동 대상 조회가 읽음 처리를 겸하므로 **누르면 읽음이 된다**)
 */
export default function DashboardNotifications() {
  const router = useRouter();

  const [items, setItems] = useState<NotificationItem[] | null>(null);
  /** 제목 옆 배지 — 목록 길이가 아니라 **안 읽은 전체 건수**다 */
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([
      getNotifications({ isRead: false, page: 0, size: LIMIT }, signal),
      getNotifications({ isRead: true, page: 0, size: LIMIT }, signal),
    ])
      .then(([unread, read]) => {
        // 미확인을 먼저 깔고 남은 자리만 읽은 알림으로 채운다
        setItems([...unread.content, ...read.content].slice(0, LIMIT));
        // 배지는 목록 길이가 아니라 **안 읽은 전체 건수**다 — 목록은 `size` 에 잘린다
        setUnreadCount(unread.totalElements);
        setHasFailed(false);
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;

        setHasFailed(true);
        /*
          배지도 함께 지운다 — 한 번 받아 둔 뒤 새로고침이 실패하면
          본문은 실패를 알리는데 배지만 낡은 건수를 물고 있다.
        */
        setUnreadCount(null);
      });

    return () => controller.abort();
  }, [refreshKey]);

  /** 헤더 드롭다운에서 `모두 읽음` 을 눌러도 이 카드가 낡은 채로 남지 않게 한다 */
  useEffect(
    () => onNotificationChanged(() => setRefreshKey((key) => key + 1)),
    [],
  );

  const open = useCallback(
    async (notification: NotificationItem) => {
      if (isBusy) return;

      setIsBusy(true);
      setError('');

      try {
        const target = await getNotificationTarget(notification.notificationId);
        const route = routeOf(target);

        // 이동하든 말든 **읽음은 이미 됐다** — 알리지 않으면 헤더 배지가 낡은 수를 문다
        notifyNotificationChanged();
        if (route) router.push(route);
      } catch (caught) {
        setError(messageOf(caught, '알림을 열지 못했습니다.'));
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, router],
  );

  return (
    <section
      aria-labelledby="dashboardNotifications"
      /* 옆 두 상자(캘린더 · 이슈)와 높이를 맞춘다 — 넘치는 목록은 상자 안에서만 굴린다 */
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-base border border-border-default bg-bg-card"
    >
      <div className="flex items-end justify-between border-b border-border-default px-6 py-4">
        <h2
          id="dashboardNotifications"
          className="flex items-center gap-2 text-logo leading-8 font-semibold text-gray-text-soft"
        >
          알림
          {/* 안 읽은 게 없으면 배지를 세우지 않는다 — `0` 은 알릴 것이 없다는 뜻이다 */}
          {unreadCount !== null && unreadCount > 0 && (
            <span className="rounded-pill bg-blue-bg-soft px-2.5 py-0.5 text-label font-medium text-text-primary-blue">
              {unreadCount}
            </span>
          )}
        </h2>

        <Link
          href={NOTIFICATION_ROUTES.list}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[15px] font-semibold text-text-secondary hover:bg-bg-hover"
        >
          전체보기
          <ChevronIcon />
        </Link>
      </div>

      {error !== '' && (
        <p
          role="alert"
          className="border-b border-border-default px-6 py-2 text-caption break-keep text-text-danger"
        >
          {error}
        </p>
      )}

      {hasFailed ? (
        /* 조회가 끝난 뒤 바뀌는 상태라, 알리지 않으면 스크린리더가 실패를 못 읽는다 */
        <p
          role="alert"
          className="flex flex-1 items-center justify-center px-6 py-16 text-detail text-text-secondary"
        >
          알림을 불러오지 못했습니다.
        </p>
      ) : items === null ? (
        <p
          aria-live="polite"
          className="flex flex-1 items-center justify-center px-6 py-16 text-detail text-text-muted"
        >
          불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-6 py-16 text-detail text-text-secondary">
          받은 알림이 없습니다.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border-default overflow-y-auto">
          {items.map((item) => (
            <li key={item.notificationId}>
              <NotificationRow
                notification={item}
                disabled={isBusy}
                onOpen={() => open(item)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * 유형 배지. `notificationType` 의 **접두어**로 가른다 (`APPROVAL_REQUESTED` → `결재`) —
 * 종류 전체 목록을 받지 못해, 모르는 값은 아래 기본 배지로 떨어진다.
 */
const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  ISSUE: { label: '이슈', className: 'bg-red-bg text-red-text' },
  APPROVAL: { label: '결재', className: 'bg-yellow-bg-soft text-yellow-text' },
  REPORT: { label: '보고', className: 'bg-purple-bg text-purple-text' },
  COMMENT: {
    label: '댓글',
    className: 'bg-blue-bg-soft text-text-primary-blue',
  },
  SYSTEM: { label: '시스템', className: 'bg-bg-hover text-text-secondary' },
};

const DEFAULT_BADGE = {
  label: '알림',
  className: 'bg-bg-hover text-text-secondary',
};

function badgeOf(notificationType: string) {
  return TYPE_BADGES[notificationType.split('_')[0]] ?? DEFAULT_BADGE;
}

/**
 * 알림 한 줄. 알림 화면(`NotificationRow`)과 달리 **한 줄에 눕힌다** —
 * 대시보드는 훑는 자리라 세 줄짜리 카드가 여덟 개면 상자를 넘긴다.
 *
 * 안 읽음은 **왼쪽 점**으로 알린다. 배경색까지 칠하면 옆 캘린더 · 이슈 상자보다 시끄럽다.
 */
function NotificationRow({
  notification,
  disabled,
  onOpen,
}: {
  notification: NotificationItem;
  disabled: boolean;
  onOpen: () => void;
}) {
  const badge = badgeOf(notification.notificationType);
  const unread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className="flex w-full cursor-pointer items-center gap-2.5 px-5 py-3.5 text-left hover:bg-bg-hover disabled:cursor-not-allowed 2xl:gap-3 2xl:px-6"
    >
      {/* 읽은 줄도 자리는 비워 둔다 — 없으면 그 줄만 배지가 왼쪽으로 밀린다 */}
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-pill ${
          unread ? 'bg-btn-primary' : ''
        }`}
      />
      {unread && <span className="sr-only">읽지 않음</span>}

      {/* 배지 폭을 고정해 뒤 글자들이 줄마다 같은 자리에서 시작하게 한다 */}
      <span
        className={`flex w-13 shrink-0 justify-center rounded-pill px-2 py-0.5 text-label font-medium ${badge.className}`}
      >
        {badge.label}
      </span>

      {/*
        제목(`title`)은 세우지 않는다 — `결재 요청` 처럼 **유형을 되풀이하는 말**이라
        옆 배지와 같은 것을 두 번 읽히고, 좁은 칸에서 정작 내용을 밀어낸다.
        폭도 고정하지 않는다 — 남는 자리를 전부 내용이 쓰고 넘치면 말줄임한다.
      */}
      {/* 날짜도 세우지 않는다 — 여기는 훑는 자리다. 언제 왔는지는 알림 화면에서 본다 */}
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-text-soft">
        {notification.message}
      </span>
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
