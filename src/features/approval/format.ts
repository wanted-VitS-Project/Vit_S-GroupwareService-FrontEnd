/**
 * 처리 시각을 '2026.08.06 18:06' 형태로 바꾼다.
 * 형식이 어긋나면 원본 대신 fallback 을 준다.
 */
export function formatDateTime(value: string, fallback = '-') {
  const matched = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!matched) return fallback;

  const [, year, month, day, hour, minute] = matched;

  /* 달력에 없는 값을 걸러내려고 넣은 값이 그대로 나오는지 되본다 */
  const parsed = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute));
  const isRealDate =
    parsed.getUTCFullYear() === +year &&
    parsed.getUTCMonth() === +month - 1 &&
    parsed.getUTCDate() === +day &&
    parsed.getUTCHours() === +hour &&
    parsed.getUTCMinutes() === +minute;

  if (!isRealDate) return fallback;

  return `${year}.${month}.${day} ${hour}:${minute}`;
}
