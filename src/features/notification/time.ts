import { parseActivityTime } from '@/features/activityLog/time';

/**
 * 알림 시간 표기 (10분 전 · 어제 · 3일 전 · 2026.08.02).
 * 파싱은 활동 기록과 같고 하루를 넘긴 뒤 표기만 다르다.
 */
export function notificationTimeLabel(
  createdAt: string,
  now: Date = new Date(),
) {
  const time = parseActivityTime(createdAt, now);
  // 형식이 어긋나면 시간 자리를 비운다
  if (!time) return '';

  const [year, month, day] = time.dateKey.split('-').map(Number);
  // 자정 직후가 '어제' 로 밀리지 않도록 달력 날짜로 센다
  const days = Math.round(
    (startOfDay(now).getTime() - new Date(year, month - 1, day).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  // 오늘이면 '방금' · '32분 전' 처럼 상대 시간을 쓴다
  if (days <= 0) return time.relative;
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;

  // 일주일이 넘으면 날짜를 그대로 보여준다
  return time.dateLabel;
}

/** 절대 시각 표기. 날짜별로 묶인 전체 목록에서 쓴다 */
export function formatFullTime(createdAt: string) {
  return parseActivityTime(createdAt)?.full ?? '';
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
