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
  return `${year}.${month}.${day} ${hour}:${minute}`;
}
