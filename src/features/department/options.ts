import type { Department } from './types';

export interface DepartmentOption {
  id: number;
  /**
   * 셀렉트에 그릴 글자. 닫히면 고른 옵션 글자만 남아 하위 부서는 `개발팀 (기술본부)` 꼴이다.
   */
  label: string;
  /**
   * 하위 부서를 가진 상위 부서인지. 막을지는 부르는 쪽이 정한다 (검색 필터는 열어 둔다).
   */
  hasChildren: boolean;
}

/** 2단 트리를 셀렉트용 한 줄 목록으로 편다. 필터 · 사원 폼이 함께 쓴다 */
export function toDepartmentOptions(
  departments: Department[],
): DepartmentOption[] {
  return departments.flatMap((department) => [
    {
      id: department.departmentId,
      label: department.name,
      hasChildren: department.children.length > 0,
    },
    ...department.children.map((child) => ({
      id: child.departmentId,
      label: `${child.name} (${department.name})`,
      // 2단이 끝이라 하위의 하위는 없다
      hasChildren: false,
    })),
  ]);
}
