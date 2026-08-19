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

/** 지역번호 두 자리는 서울(02)뿐이고, 나머지는 세 자리다 */
const SEOUL_CODE = '02';
/** 지역번호가 없는 전국 대표번호 — 8자리를 4-4 로 끊는다 */
const NATIONWIDE_PREFIXES = ['15', '16', '18'];

/**
 * 국제 표기(`+82 10-1234-5678`)를 국내 표기(`01012345678`)로 되돌린다.
 *
 * `+82` 뒤에는 시내 `0` 을 뗀 번호가 오므로 **`0` 을 다시 붙여야** 한다.
 * 안 그러면 `82101234567` 이 그대로 남아 `821-0123-4567` 이 된다.
 */
function toDomestic(value: string) {
  const trimmed = value.trim();

  if (!trimmed.startsWith('+82')) return value;

  const rest = trimmed.slice(3).replace(/\D/g, '');

  // `+82 0 10 ...` 처럼 0 을 남겨 적는 사람도 있다 — 두 번 붙이지 않는다
  return rest.startsWith('0') ? rest : `0${rest}`;
}

/**
 * 연락처 자동 하이픈. **입력 중에 쓰는 것이라 자르지 않는다** —
 * 아직 다 안 친 번호도 친 만큼만 끊어 준다 (`0101234` → `010-1234`).
 *
 * 숫자가 아닌 글자는 버린다. 11자리를 넘기면 더 붙지 않는다.
 *
 * | 입력                | 결과            |
 * | ------------------- | --------------- |
 * | `01012345678`       | `010-1234-5678` |
 * | `0111234567`        | `011-123-4567`  |
 * | `021234567`         | `02-123-4567`   |
 * | `15881234`          | `1588-1234`     |
 * | `+82 10-1234-5678`  | `010-1234-5678` |
 * | `+82 2 123 4567`    | `02-123-4567`   |
 */
export function formatPhone(value: string) {
  const digits = toDomestic(value).replace(/\D/g, '').slice(0, 11);

  if (digits.length < 4) return digits;

  // 1588 · 1600 · 1800 류 — 지역번호가 없어 4-4 로만 끊는다
  if (NATIONWIDE_PREFIXES.includes(digits.slice(0, 2)) && digits[1] !== '0') {
    return join(digits, 4);
  }

  if (digits.startsWith(SEOUL_CODE)) return join(digits, 2);
  return join(digits, 3);
}

/**
 * 앞자리를 떼고 남은 숫자를 반으로 나눈다.
 * 남은 것이 7자리면 3-4, 8자리면 4-4 가 되도록 **뒤 4자리를 먼저 떼는** 방식이다 —
 * 010 은 번호가 늘어나는 중이라 자릿수로 분기하면 입력 중에 자꾸 모양이 바뀐다.
 */
function join(digits: string, headLength: number) {
  const head = digits.slice(0, headLength);
  const rest = digits.slice(headLength);

  if (rest.length <= 4) return rest ? `${head}-${rest}` : head;

  return `${head}-${rest.slice(0, -4)}-${rest.slice(-4)}`;
}

/** 금액 입력의 최대 자릿수. 15자리면 계약금액에 충분하다 */
export const AMOUNT_MAX_DIGITS = 15;

/**
 * 입력 중인 금액에 천 단위 구분을 넣는다. 숫자가 아닌 글자는 버린다.
 * toLocaleString() 은 숫자가 아닌 값에 NaN 을 띄우고 큰 수의 정밀도를 깎는다.
 */
export function groupDigits(value: string) {
  return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
