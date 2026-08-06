import type { Department } from './types';

export interface DepartmentOption {
  id: number;
  /** 하위 부서는 `—` 를 붙여 계층을 표시한다 — `optgroup` 은 상위를 고를 수 없다 */
  label: string;
}

/** 2단 트리를 셀렉트용 한 줄 목록으로 편다. 필터 · 사원 폼이 함께 쓴다 */
export function toDepartmentOptions(
  departments: Department[],
): DepartmentOption[] {
  return departments.flatMap((department) => [
    { id: department.departmentId, label: department.name },
    ...department.children.map((child) => ({
      id: child.departmentId,
      label: `— ${child.name}`,
    })),
  ]);
}
