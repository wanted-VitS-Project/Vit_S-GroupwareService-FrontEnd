/**
 * `2026-08-06T18:06:26` → `2026.08.06 18:06` — 처리 시각은 분까지 본다.
 *
 * 형식이 어긋나면 문자열을 그대로 흘리지 않고 `fallback` 을 준다.
 * 블록은 빈 값으로 줄을 접고, 상세는 `-` 로 자리를 남긴다.
 */
export function formatDateTime(value: string, fallback = '-') {
  const matched = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!matched) return fallback;

  const [, year, month, day, hour, minute] = matched;

  /**
   * 자릿수만 맞고 달력에 없는 값이 있다 — `2026-02-31` · `2026-99-99T99:99`.
   * `Date.UTC` 는 이런 값을 다음 달로 넘겨버리므로, 넣은 값이 그대로 나오는지 되본다.
   * 표시만 하고 시간대 변환은 하지 않아 로컬이 아닌 UTC 로 맞춘다.
   */
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
