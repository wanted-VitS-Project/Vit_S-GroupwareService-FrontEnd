export const DEPARTMENT_NAME_MAX_LENGTH = 50;

/** 부서. 최대 2단 트리다 */
export interface Department {
  departmentId: number;
  name: string;
  /** 직속 인원 — 삭제 가능 판정에 쓴다 */
  directEmployeeCount: number;
  /** 하위 포함 인원 — 화면 표시값 */
  totalEmployeeCount: number;
  /** 하위 부서. 2단이 끝이라 이 안에는 children 이 없다 */
  children: Department[];
}

export interface CreateDepartmentRequest {
  name: string;
  /** 생략하면 최상위. 하위 부서 추가는 상위 부서 ID 를 그대로 보낸다 */
  parentId?: number;
}

/** 부서명만 바꿀 수 있다. 상위 부서 이동은 지원하지 않는다 */
export interface UpdateDepartmentRequest {
  name: string;
}
