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
 * 구성원 추가에서 **요청 전체가 거부되는** 코드.
 *
 * 없는 사번이 하나라도 섞이면 나머지도 추가되지 않는다 — 부분 성공이 아니라서
 * "몇 명은 됐다" 로 안내하면 안 된다. 고른 목록을 그대로 두고 다시 고르게 한다.
 */
export const ADD_MEMBER_REJECTED_CODES: string[] = [
  GROUP_CODES.notFound,
  'EMP_NOT_FOUND',
  'ACC_SYSTEM_ACCOUNT_NOT_ALLOWED',
];
