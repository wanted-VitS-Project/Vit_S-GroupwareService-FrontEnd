/**
 * 화면 표기 포맷터.
 * 날짜 · 금액 표기를 화면마다 다르게 쓰지 않도록 여기에 모은다.
 */

/** '2020-07-15' → '2020.07.15' (값이 없으면 빈 문자열) */
export function formatDate(value?: string) {
  return value ? value.slice(0, 10).replaceAll('-', '.') : '';
}

/** '2026-08-01 09:14:23' → '2026.08.01 09:14' */
export function formatDateTime(value?: string) {
  if (!value) return '';

  const [date, time = ''] = value.split(/[ T]/);
  return `${formatDate(date)} ${time.slice(0, 5)}`.trim();
}
