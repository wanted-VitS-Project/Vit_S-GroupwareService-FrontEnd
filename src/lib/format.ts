/**
 * 화면 표기 포맷터.
 * 날짜 · 금액 표기를 화면마다 다르게 쓰지 않도록 여기에 모은다.
 */

/** 'yyyy-MM-dd' 또는 'yyyy-MM-dd HH:mm[:ss]' — 뒤에 다른 문자가 붙으면 매칭되지 않는다 */
const DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * 형식과 실제 날짜 · 시각 범위를 함께 검증한다. 어긋나면 null.
 * Date 로 파싱한 값은 검증에만 쓴다 — 표기에 쓰면 타임존 때문에 날짜가 밀린다.
 */
function parseDate(value?: string | null) {
  const matched = DATE_PATTERN.exec(value ?? '');
  if (!matched) return null;

  const [, year, month, day, hour, minute, second = '00'] = matched;
  const hasTime = hour !== undefined;
  const utc = new Date(
    `${year}-${month}-${day}T${hour ?? '00'}:${minute ?? '00'}:${second}Z`,
  );

  // 25:70 은 파싱이 실패하고, 2026-02-31 은 3월로 넘어가므로 일자까지 대조한다
  if (Number.isNaN(utc.getTime()) || utc.getUTCDate() !== Number(day)) {
    return null;
  }

  return {
    date: `${year}.${month}.${day}`,
    time: hasTime ? `${hour}:${minute}` : null,
  };
}

/** '2020-07-15' → '2020.07.15' (빈 값 · 잘못된 값이면 빈 문자열) */
export function formatDate(value?: string | null) {
  return parseDate(value)?.date ?? '';
}

/** '2026-08-01 09:14:23' → '2026.08.01 09:14' (시각이 없으면 빈 문자열) */
export function formatDateTime(value?: string | null) {
  const parsed = parseDate(value);
  return parsed?.time ? `${parsed.date} ${parsed.time}` : '';
}

/** '2026-08-07 14:30:00' → '14:30' (시각이 없으면 빈 문자열) */
export function formatTime(value?: string | null) {
  return parseDate(value)?.time ?? '';
}

/**
 * 시작일 · 종료일 → '2026.03.01 ~ 2026.12.31'
 * 한쪽만 유효하면 그 쪽만, 둘 다 없으면 빈 문자열.
 */
export function formatDateRange(from?: string | null, to?: string | null) {
  const start = formatDate(from);
  const end = formatDate(to);

  if (start && end) return `${start} ~ ${end}`;
  return start || end;
}
