/** 부서 응답 코드 단일 소스. (.ai/API.md 22~25) */

export const DEPARTMENT_CODES = {
  /** 400 — 부서명이 비었거나 50자 초과 */
  invalidRequest: 'DEPT_INVALID_REQUEST',
  /** 404 — 부서 없음 */
  notFound: 'DEPT_NOT_FOUND',
  /** 404 — 상위 부서 없음 */
  parentNotFound: 'DEPT_PARENT_NOT_FOUND',
  /** 409 — 부서명 중복 (**같은 상위 부서 안에서** 유니크. 최상위끼리는 전체 기준) */
  nameDuplicated: 'DEPT_NAME_DUPLICATED',
  /** 409 — 하위 부서를 상위로 지정 (2단 초과) */
  maxDepthExceeded: 'DEPT_MAX_DEPTH_EXCEEDED',
  /** 409 — 직속 사원이 있어 삭제 불가 (인원 수는 message 에 포함) */
  hasEmployees: 'DEPT_HAS_EMPLOYEES',
  /** 409 — 하위 부서가 있어 삭제 불가 (부서 수는 message 에 포함) */
  hasChildren: 'DEPT_HAS_CHILDREN',
} as const;
