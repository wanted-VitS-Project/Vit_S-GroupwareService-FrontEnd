/**
 * 수집 조건의 filters.regionCodes 선택지. 행정구역 시도 코드 2자리를 쓴다.
 * 강원 51 · 전북 52 는 확인 전이라 수집이 0건이면 이 두 줄을 먼저 의심한다.
 */
export const REGION_OPTIONS = [
  { code: '11', name: '서울' },
  { code: '26', name: '부산' },
  { code: '27', name: '대구' },
  { code: '28', name: '인천' },
  { code: '29', name: '광주' },
  { code: '30', name: '대전' },
  { code: '31', name: '울산' },
  { code: '36', name: '세종' },
  { code: '41', name: '경기' },
  { code: '43', name: '충북' },
  { code: '44', name: '충남' },
  { code: '46', name: '전남' },
  { code: '47', name: '경북' },
  { code: '48', name: '경남' },
  { code: '50', name: '제주' },
  { code: '51', name: '강원' },
  { code: '52', name: '전북' },
] as const;

/** 코드로 이름을 찾는다. 모르는 코드는 코드를 그대로 보여준다 */
export function regionName(code: string) {
  return REGION_OPTIONS.find((option) => option.code === code)?.name ?? code;
}
