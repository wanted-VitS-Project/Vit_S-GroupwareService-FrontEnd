export const CATEGORY_NAME_MAX_LENGTH = 100;
export const CATEGORY_CODE_MAX_LENGTH = 30;

/** 사업 카테고리 — 프로젝트에 지정하는 사업 분류 (.ai/API.md 13~16) */
export interface BusinessCategory {
  categoryId: number;
  name: string;
  /** 업무코드 — 선택 입력이라 없을 수 있다 */
  code: string | null;
  description: string | null;
  /** 연결된 프로젝트가 없으면 true */
  deletable: boolean;
  /** 논리 삭제 시각 (ISO). 삭제되지 않았으면 null */
  deletedAt: string | null;
}

export interface CategoryListQuery {
  /** 이름 · 업무코드 부분 일치 */
  keyword?: string;
  /** ADMIN 만 true 를 쓸 수 있다 */
  includeDeleted?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  code?: string;
  description?: string;
}

/** 보낸 필드만 바뀐다. 셋 다 없으면 400 이라 화면에서 미리 막는다 */
export interface UpdateCategoryRequest {
  name?: string;
  /** null 을 보내면 업무코드를 지운다 */
  code?: string | null;
  description?: string;
}
