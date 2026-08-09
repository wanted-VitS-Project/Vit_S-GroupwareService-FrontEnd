import { parseActivityTime } from '@/features/activityLog/time';

/**
 * 알림 시간 표기. `10분 전` · `2시간 전` · `어제` · `3일 전` · `2026.08.02`.
 *
 * 파싱은 활동 기록의 것을 그대로 쓴다 — 서버가 타임존 없는 문자열
 * (`2026-08-07T18:47:37`)을 주는 것도, 달력에 없는 값을 걸러야 하는 것도 같은 사정이다.
 * 다른 점은 **하루를 넘긴 뒤**로, 활동 기록은 시각을 보여주지만 알림은 며칠 전인지를 센다.
 */
export function notificationTimeLabel(
  createdAt: string,
  now: Date = new Date(),
) {
  const time = parseActivityTime(createdAt, now);
  // 형식이 어긋나면 시간 자리를 비운다 — 엉뚱한 값을 그대로 흘리지 않는다
  if (!time) return '';

  const [year, month, day] = time.dateKey.split('-').map(Number);
  // 밀리초가 아니라 달력 날짜로 센다 — 자정 직후가 '어제' 로 밀리지 않게
  const days = Math.round(
    (startOfDay(now).getTime() - new Date(year, month - 1, day).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  // 오늘이면 `방금` · `32분 전` · `2시간 전`
  if (days <= 0) return time.relative;
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;

  // 일주일이 넘으면 며칠 전인지가 와닿지 않는다 — 날짜를 그대로 보여준다
  return time.dateLabel;
}

/** 절대 시각 `2026.08.07 18:47`. 날짜 머리로 묶인 전체 목록에서 쓴다 */
export function formatFullTime(createdAt: string) {
  return parseActivityTime(createdAt)?.full ?? '';
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
