/**
 * 사원 화면 경로 단일 소스. 경로 문자열을 컴포넌트에 직접 쓰지 않는다.
 * API 경로는 constants/endpoints.ts 에 있다.
 */

const EMPLOYEES = '/settings/employees';

export const EMPLOYEE_ROUTES = {
  list: EMPLOYEES,
  create: `${EMPLOYEES}/new`,
  /** 세그먼트는 [id] 지만 실제 값은 사번이다 */
  detail: (userId: string) => `${EMPLOYEES}/${userId}`,
  edit: (userId: string) => `${EMPLOYEES}/${userId}/edit`,
} as const;
