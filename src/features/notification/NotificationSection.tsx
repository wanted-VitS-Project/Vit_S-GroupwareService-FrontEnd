'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Pagination from '@/components/Pagination';
import { groupByDate } from '@/features/activityLog/time';
import { messageOf } from '@/lib/api';

import {
  deleteNotification,
  getNotifications,
  getNotificationTarget,
  readNotification,
} from './api';
import { routeOf } from './display';
import { notifyNotificationChanged } from './events';
import NotificationMenu from './NotificationMenu';
import NotificationRow from './NotificationRow';
import {
  isUnread,
  type NotificationItem,
  type NotificationPage,
} from './types';

/**
 * 한 구역에 보여줄 개수.
 *
 * 두 구역이 위아래로 쌓이므로 **10개씩이면 화면을 넘긴다.** 스크롤로 메우는 대신
 * 수를 줄이고 페이지로 넘긴다 — 상자 스크롤과 페이지 스크롤이 겹치는 것보다 낫다.
 */
const PAGE_SIZE = 5;

/**
 * 알림 목록 한 구역 — `미확인` 또는 `확인`.
 *
 * 두 구역이 **한 화면에 함께** 있으므로 페이지는 각자 따로 넘긴다.
 * 읽음 · 삭제는 반대편 구역과 헤더 배지까지 바꾸므로, 처리 후 창 이벤트로 알린다.
 */
export default function NotificationSection({
  title,
  isRead,
  category,
  emptyText,
  refreshKey,
}: {
  title: string;
  /** 이 구역이 받을 목록 — 두 구역은 이 값 하나만 다르다 */
  isRead: boolean;
  /** 유형 필터. `전체` 면 `undefined` 라 파라미터 자체가 빠진다 */
  category?: string;
  emptyText: string;
  /** 어디선가 알림이 바뀌면 올라온다 — 이 구역도 다시 받는다 */
  refreshKey: number;
}) {
  const router = useRouter();

  const [page, setPage] = useState(0);
  const [data, setData] = useState<NotificationPage | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getNotifications({ isRead, category, page, size: PAGE_SIZE }, signal)
      .then((received) => {
        setData(received);
        setHasFailed(false);
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, [isRead, category, page, refreshKey]);

  /**
   * 알림을 연다. 이동 대상 조회가 **읽음 처리를 겸한다** —
   * 갈 곳이 없거나 아직 화면이 없는 종류면 읽음만 되고 목록에 남는다.
   */
  async function open(notification: NotificationItem) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      const target = await getNotificationTarget(notification.notificationId);
      const route = routeOf(target);

      /**
       * 이동하든 말든 **읽음은 이미 됐다.** 알리지 않고 떠나면 헤더 배지가
       * 다음 주기 조회(60초)까지 낡은 숫자를 물고 있는다.
       */
      notifyNotificationChanged();
      if (route) router.push(route);
    } catch (caught) {
      setError(messageOf(caught, '알림을 열지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  async function read(notificationId: number) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      await readNotification(notificationId);
      notifyNotificationChanged();
    } catch (caught) {
      setError(messageOf(caught, '읽음 처리하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  async function remove(notificationId: number) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      await deleteNotification(notificationId);

      /**
       * 마지막 한 건을 지우면 지금 페이지가 비어버린다.
       * 그때는 한 장 앞으로 물러선다 — 빈 화면이 뜨면 다 지운 줄 안다.
       */
      if (data?.content.length === 1 && page > 0) {
        setPage((current) => current - 1);
      }
      notifyNotificationChanged();
    } catch (caught) {
      setError(messageOf(caught, '삭제하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section>
      <h2 className="text-sm font-bold text-text-primary">
        {title}
        {/* 건수는 목록 길이가 아니라 전체 건수다 — 목록은 페이지 크기에 잘린다 */}
        <span className="ml-1.5 text-xs font-normal text-text-secondary">
          {data?.totalElements ?? 0}
        </span>
      </h2>

      {error !== '' && (
        <p role="alert" className="mt-2 text-xs break-keep text-text-danger">
          {error}
        </p>
      )}

      {/**
       * 높이를 고정하지 않는다 — 상자 안 스크롤과 페이지 스크롤이 겹치면
       * 어느 쪽을 굴려야 할지 알 수 없다. 한 쪽에 담는 수를 줄여(`PAGE_SIZE`)
       * **스크롤 없이** 두 구역이 화면에 들어오게 한다.
       */}
      <div className="mt-2 overflow-hidden rounded-xl border border-border-default">
        {hasFailed && (
          <p className="flex-1 px-4 py-10 text-center text-xs text-text-secondary">
            알림을 불러오지 못했습니다.
          </p>
        )}

        {!hasFailed && data === null && (
          <p className="flex-1 px-4 py-10 text-center text-xs text-text-secondary">
            불러오는 중…
          </p>
        )}

        {data?.content.length === 0 && (
          <p className="flex-1 px-4 py-10 text-center text-xs text-text-secondary">
            {emptyText}
          </p>
        )}

        {data && data.content.length > 0 && (
          <>
            {/**
             * 날짜별로 묶어 머리를 붙인다 — `오늘` · `어제` · 그 이전은 날짜.
             * 응답이 이미 최신순이라 다시 정렬하지 않고 훑으며 자른다.
             */}
            {groupByDate(data.content).map((group) => (
              <div key={group.dateKey}>
                <p className="border-b border-border-default bg-bg-surface px-4 py-1.5 text-[11px] font-semibold text-text-secondary">
                  {group.dateLabel}
                </p>

                <ul className="divide-y divide-border-default">
                  {group.logs.map((item) => (
                    <li key={item.notificationId}>
                      <NotificationRow
                        notification={item}
                        disabled={isBusy}
                        onOpen={() => open(item)}
                        // 날짜는 머리에 있다 — 줄에는 시각까지 적어 언제인지 정확히 알린다
                        showFullTime
                        trailing={
                          <NotificationMenu
                            // 이미 읽은 알림에는 `읽음` 을 그리지 않는다
                            canRead={isUnread(item)}
                            disabled={isBusy}
                            onRead={() => read(item.notificationId)}
                            onDelete={() => remove(item.notificationId)}
                          />
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <Pagination
              page={page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              unit="건"
              // 건수는 구역 제목 옆에 이미 있다 — 아래에 또 적으면 같은 수가 두 번 나온다
              showTotal={false}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </section>
  );
}
