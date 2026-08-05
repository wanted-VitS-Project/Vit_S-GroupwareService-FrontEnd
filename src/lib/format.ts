/**
 * 화면 표기 포맷터.
 * 날짜 · 금액 표기를 화면마다 다르게 쓰지 않도록 여기에 모은다.
 */

/**
 * 'YYYY-MM-DD[ HH:mm[:ss]]' 만 받는다. 형식이나 범위가 어긋나면 null.
 * Date 로 파싱한 값은 검증에만 쓴다 — 표기에 쓰면 타임존 때문에 날짜가 밀린다.
 */
function parseDate(value?: string) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(
    value ?? '',
  );
  if (!matched) return null;

  const [, year, month, day, hour = '00', minute = '00'] = matched;
  const utc = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);

  // 25:70 은 파싱이 실패하고, 2026-02-31 은 3월로 넘어가므로 일자까지 대조한다
  if (Number.isNaN(utc.getTime()) || utc.getUTCDate() !== Number(day)) {
    return null;
  }

  return { date: `${year}.${month}.${day}`, time: `${hour}:${minute}` };
}

/** '2020-07-15' → '2020.07.15' (빈 값 · 잘못된 값이면 빈 문자열) */
export function formatDate(value?: string) {
  return parseDate(value)?.date ?? '';
}

/** '2026-08-01 09:14:23' → '2026.08.01 09:14' */
export function formatDateTime(value?: string) {
  const parsed = parseDate(value);
  return parsed ? `${parsed.date} ${parsed.time}` : '';
}
