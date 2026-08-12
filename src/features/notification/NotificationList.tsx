'use client';

import { useEffect, useState } from 'react';

import { NOTIFICATION_CATEGORIES } from './display';
import { onNotificationChanged } from './events';
import NotificationSection from './NotificationSection';

/**
 * 알림 페이지. (알림 도메인 · .ai/API.md 79~81 · 83)
 *
 * `미확인` · `확인` 을 **한 화면에 위아래로** 보여준다. 탭으로 나누면 방금 읽은 알림이
 * 어디로 갔는지 보이지 않는데, 나란히 두면 위에서 아래로 옮겨가는 게 그대로 드러난다.
 *
 * 두 구역은 서버 필터(`isRead`) 하나만 다르고, 페이지는 각자 따로 넘긴다.
 *
 * ℹ️ `모두 읽음` 은 **헤더 드롭다운에만** 둔다 — 이 화면은 한 건씩 처리하는 곳이다.
 */
export default function NotificationList() {
  /** 유형 필터. `undefined` 면 전체 — 쿼리에서 `category` 가 빠진다 */
  const [category, setCategory] = useState<string | undefined>(undefined);

  /**
   * 한쪽에서 읽거나 지우면 반대편 건수까지 바뀐다.
   * 이 값을 올려 **두 구역을 함께** 다시 받는다 — 계산으로 맞추면 실제와 어긋난다.
   */
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * 알림이 바뀌었다는 신호를 받는다. 구역이 스스로 처리한 것뿐 아니라
   * **헤더 드롭다운의 `모두 읽음`** 처럼 이 화면 밖에서 벌어진 일도 여기로 들어온다.
   */
  useEffect(
    () => onNotificationChanged(() => setRefreshKey((key) => key + 1)),
    [],
  );

  return (
    /** 위아래로 쌓는다. 좌우로 나누면 한 칸이 좁아져 제목 · 본문이 잘린다 */
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1.5">
        {NOTIFICATION_CATEGORIES.map((chip) => (
          <button
            key={chip.label}
            type="button"
            aria-current={chip.value === category}
            onClick={() => setCategory(chip.value)}
            className={`cursor-pointer rounded-pill border px-3 py-1 text-label font-semibold ${
              chip.value === category
                ? 'border-[#4F39F6] bg-[#4F39F6]/5 text-[#4F39F6]'
                : 'border-border-default text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/**
       * `key` 에 유형을 넣어 필터가 바뀌면 구역을 새로 만든다.
       * 안 그러면 3페이지를 보다 필터를 바꿨을 때 **없는 페이지**에 떨어져 빈 목록이 뜬다.
       */}
      <NotificationSection
        key={`unread-${category ?? 'all'}`}
        title="미확인"
        isRead={false}
        category={category}
        emptyText="읽지 않은 알림이 없습니다."
        refreshKey={refreshKey}
      />

      <NotificationSection
        key={`read-${category ?? 'all'}`}
        title="확인"
        isRead
        category={category}
        emptyText="읽은 알림이 없습니다."
        refreshKey={refreshKey}
      />
    </div>
  );
}
