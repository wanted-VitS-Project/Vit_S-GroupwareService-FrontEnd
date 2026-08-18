/**
 * 날짜 · 일시 입력 공통 규칙. 칸 아무 데나 눌러도 달력이 열리게 하고,
 * 상한이 없으면 연도가 6자리까지 들어가므로 4자리로 묶는다.
 */

export const DATE_MIN = '1900-01-01';
export const DATE_MAX = '2999-12-31';

export const DATETIME_MIN = `${DATE_MIN}T00:00`;
export const DATETIME_MAX = `${DATE_MAX}T23:59`;

/**
 * 칸을 누르면 달력을 연다. 미지원 브라우저나 이미 열린 경우는 기본 동작에 맡긴다.
 */
export function openPickerOnClick(event: React.MouseEvent<HTMLInputElement>) {
  const input = event.currentTarget;

  if (input.disabled || input.readOnly) return;

  try {
    input.showPicker();
  } catch {
    // 지원하지 않거나 이미 열려 있다
  }
}

/**
 * 날짜 · 일시 입력에 붙일 공통 속성. 펼친 뒤에 개별 속성을 적어야 범위를 좁힐 수 있다.
 */
export function dateInputProps(type?: string) {
  if (type === 'date') {
    return { min: DATE_MIN, max: DATE_MAX, onClick: openPickerOnClick };
  }
  if (type === 'datetime-local') {
    return { min: DATETIME_MIN, max: DATETIME_MAX, onClick: openPickerOnClick };
  }
  return {};
}
