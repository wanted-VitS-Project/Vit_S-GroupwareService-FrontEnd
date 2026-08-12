/**
 * 수집 조건의 `filters.regionCodes` 선택지.
 *
 * 나라장터 응답 예시가 `"11"`(서울) · `"41"`(경기) 이라 **행정구역 시도 코드 2자리**로 본다.
 * 코드 목록을 주는 API 가 없어 프론트 상수로 둔다.
 *
 * ⚠️ **강원 · 전북 코드는 확인이 필요하다.** 특별자치도 전환으로 통계청 코드가
 *    강원 `42 → 51`, 전북 `45 → 52` 로 바뀌었는데, 나라장터가 어느 쪽을 쓰는지 확인되지 않았다.
 *    새 코드로 두고, 수집 결과가 0건이면 여기 두 줄을 먼저 의심한다.
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

/** 코드로 이름을 찾는다. 모르는 코드는 코드를 그대로 보여준다 (조용히 비우지 않는다) */
export function regionName(code: string) {
  return REGION_OPTIONS.find((option) => option.code === code)?.name ?? code;
}
