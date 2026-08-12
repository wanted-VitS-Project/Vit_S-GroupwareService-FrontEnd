/** 사원 그룹 응답 코드 단일 소스. (.ai/API.md 91~97) */

export const GROUP_CODES = {
  /** 400 — 이름이 비었거나 길이 초과 · 수정할 필드 없음 · `userIds` 비어 있음 */
  invalidRequest: 'GRP_INVALID_REQUEST',
  /** 404 — 그룹 없음 */
  notFound: 'GRP_NOT_FOUND',
  /** 409 — 그룹명 중복 (**전역** 기준. 부서와 달리 범위가 없다) */
  nameDuplicated: 'GRP_NAME_DUPLICATED',
  /** 404 — 그 그룹의 구성원이 아님. 화면이 뒤처졌다는 뜻이라 재조회한다 */
  memberNotFound: 'GRP_MEMBER_NOT_FOUND',
} as const;

/**
 * **고른 사원이 잘못돼** 요청 전체가 거부된 코드.
 *
 * 하나라도 섞이면 나머지도 추가되지 않는다 — 부분 성공이 아니라서 "몇 명은 됐다" 로
 * 안내하면 안 된다. 이때는 **서버가 아무것도 바꾸지 않았으므로** 고른 목록을 그대로 두고
 * 문제 있는 사람만 빼게 한다. 비우면 처음부터 다시 골라야 한다.
 *
 * ⚠️ `GRP_NOT_FOUND` 는 여기 넣지 않는다 — 그룹 자체가 사라진 것이라
 *    고른 목록을 살려둘 이유가 없다 (호출 측이 따로 처리한다).
 */
export const MEMBER_PICK_REJECTED_CODES: string[] = [
  GROUP_CODES.invalidRequest,
  'EMP_NOT_FOUND',
  'ACC_SYSTEM_ACCOUNT_NOT_ALLOWED',
];
