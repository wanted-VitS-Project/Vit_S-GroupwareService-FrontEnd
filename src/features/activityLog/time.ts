/**
 * 활동 기록 시간 표기. `createdAt` 하나로 날짜 그룹 · 시각 · 상대 시간을 만든다.
 *
 * ⚠️ 서버 값에 타임존 표기가 없다(`2026-08-02T14:32:00`). 문자열을 그대로
 *    `new Date()` 에 넣으면 브라우저마다 UTC 로 읽을 수 있어 **직접 쪼개서** 로컬로 만든다.
 */

/**
 * 'YYYY-MM-DDTHH:mm:ss' — 초 · 소수점 이하는 없어도 받는다.
 *
 * ⚠️ **끝까지 검사한다.** 뒤가 열려 있으면 타임존이 붙은 값(`...Z` · `+09:00`)까지
 *    받아들여 몇 시간 어긋난 시각을 그대로 보여주게 된다.
 */
const DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

export interface ActivityTime {
  /** 날짜 그룹 키 — 같은 날이면 같은 값 */
  dateKey: string;
  /** 그룹 머리 문구 — '오늘' · '어제' · '2026.08.02' */
  dateLabel: string;
  /** '14:32' */
  clock: string;
  /** '방금' · '32분 전' · '2시간 전', 하루가 지났으면 시각 그대로 */
  relative: string;
  /** 툴팁용 전체 표기 */
  full: string;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** 파싱에 실패하면 null — 화면에서 시간 자리를 비운다 */
export function parseActivityTime(
  createdAt: string,
  now: Date = new Date(),
): ActivityTime | null {
  const matched = DATE_TIME_PATTERN.exec(createdAt);
  if (!matched) return null;

  const [, year, month, day, hour, minute, second = '00'] = matched;
  const at = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  if (Number.isNaN(at.getTime())) return null;

  /*
   * `Date` 는 범위를 벗어난 값을 조용히 넘긴다 — 2월 30일은 3월 2일이 되고
   * 25시는 다음 날이 된다. 그대로 두면 날짜 머리(2월 30일)와 상대 시간(3월 기준)이
   * 서로 다른 날을 가리킨다. 넣은 값과 나온 값이 **모두** 같을 때만 인정한다.
   */
  const isSameMoment =
    at.getFullYear() === Number(year) &&
    at.getMonth() === Number(month) - 1 &&
    at.getDate() === Number(day) &&
    at.getHours() === Number(hour) &&
    at.getMinutes() === Number(minute) &&
    at.getSeconds() === Number(second);
  if (!isSameMoment) return null;

  const dateKey = `${year}-${month}-${day}`;
  const clock = `${hour}:${minute}`;
  const full = `${year}.${month}.${day} ${clock}`;

  // 달력 날짜끼리 비교한다 — 밀리초 차이로 세면 자정 직후가 '어제' 로 밀린다
  const dayDiff = Math.round(
    (startOfDay(now).getTime() - startOfDay(at).getTime()) / (24 * HOUR),
  );

  let dateLabel = `${year}.${month}.${day}`;
  if (dayDiff === 0) dateLabel = '오늘';
  else if (dayDiff === 1) dateLabel = '어제';

  return { dateKey, dateLabel, clock, relative: relativeOf(at, now), full };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 하루를 넘겼거나 미래 시각이면 상대 표기를 쓰지 않고 시각을 그대로 보여준다 */
function relativeOf(at: Date, now: Date) {
  const elapsed = now.getTime() - at.getTime();
  if (elapsed < 0 || elapsed >= 24 * HOUR) {
    return `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  }
  if (elapsed < MINUTE) return '방금';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  return `${Math.floor(elapsed / HOUR)}시간 전`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export interface ActivityLogGroup<T extends { createdAt: string }> {
  dateKey: string;
  dateLabel: string;
  logs: T[];
}

/**
 * 날짜별로 묶는다. 응답이 이미 최신순이라 **순서를 다시 세우지 않고** 훑으며 자른다.
 * 시각을 못 읽은 기록은 버리지 않고 '날짜 미상' 으로 모아 둔다.
 */
export function groupByDate<T extends { createdAt: string }>(logs: T[]) {
  const groups: ActivityLogGroup<T>[] = [];

  for (const log of logs) {
    const time = parseActivityTime(log.createdAt);
    const dateKey = time?.dateKey ?? 'unknown';
    const dateLabel = time?.dateLabel ?? '날짜 미상';

    const last = groups[groups.length - 1];
    if (last?.dateKey === dateKey) last.logs.push(log);
    else groups.push({ dateKey, dateLabel, logs: [log] });
  }

  return groups;
}
